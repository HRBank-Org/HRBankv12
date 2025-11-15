from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from models.blockchain_credentials import BlockchainCredential, CredentialTemplate, CredentialVerification
from utils.blockchain_service import blockchain_service
from typing import Dict
from datetime import datetime, timedelta
import qrcode
import io
import base64

router = APIRouter(prefix="/blockchain-credentials", tags=["Blockchain Credentials"])

def get_db():
    from server import db
    return db

@router.post("/issue", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def issue_blockchain_credential(
    credential_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution issues blockchain-verified credential
    """
    
    # Create credential
    credential = BlockchainCredential(
        worker_id=credential_data.get("worker_id", ""),
        institution_id=current_user["user_id"],
        credential_template_id=credential_data.get("credential_template_id", ""),
        credential_name=credential_data.get("credential_name"),
        program_name=credential_data.get("program_name"),
        issue_date=datetime.fromisoformat(credential_data.get("issue_date")).date(),
        expiry_date=datetime.fromisoformat(credential_data.get("expiry_date")).date() if credential_data.get("expiry_date") else None,
        student_name=credential_data.get("student_name"),
        student_id=credential_data.get("student_id"),
        grade_gpa=credential_data.get("grade_gpa"),
        additional_details=credential_data.get("additional_details", {})
    )
    
    # Generate credential hash
    credential.credential_hash = credential.generate_credential_hash()
    
    # Generate verification URL
    credential.verification_url = blockchain_service.generate_verification_url(credential.credential_id)
    
    # Upload metadata to IPFS
    metadata = {
        "credential_id": credential.credential_id,
        "credential_name": credential.credential_name,
        "program_name": credential.program_name,
        "student_name": credential.student_name,
        "issue_date": credential.issue_date.isoformat(),
        "institution_id": credential.institution_id
    }
    
    ipfs_url = await blockchain_service.upload_to_ipfs(metadata)
    credential.ipfs_url = ipfs_url
    
    # Mint on blockchain
    blockchain_result = await blockchain_service.mint_credential({
        "credential_id": credential.credential_id,
        "credential_hash": credential.credential_hash,
        "ipfs_url": ipfs_url,
        "worker_id": credential.worker_id,
        "institution_id": credential.institution_id
    })
    
    credential.blockchain_transaction_hash = blockchain_result["transaction_hash"]
    credential.blockchain_token_id = blockchain_result["token_id"]
    credential.status = "issued"
    credential.issued_at = datetime.utcnow()
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(credential.verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    credential.qr_code_url = f"data:image/png;base64,{img_str}"
    
    # Save to database
    await db.blockchain_credentials.insert_one(credential.model_dump())
    
    # Update institution stats
    await db.institution_profiles.update_one(
        {"institution_id": current_user["user_id"]},
        {"$inc": {"total_credentials_issued": 1}}
    )
    
    # TODO: Send notification to worker
    
    return {
        "success": True,
        "data": {
            "credential_id": credential.credential_id,
            "transaction_hash": credential.blockchain_transaction_hash,
            "ipfs_url": credential.ipfs_url,
            "verification_url": credential.verification_url,
            "qr_code": credential.qr_code_url
        },
        "message": "Credential issued successfully on blockchain"
    }

@router.get("/verify/{credential_id}", response_model=Dict)
async def verify_credential(
    credential_id: str,
    db = Depends(get_db)
):
    """
    Public endpoint to verify any credential
    """
    
    credential = await db.blockchain_credentials.find_one(
        {"credential_id": credential_id},
        {"_id": 0}
    )
    
    if not credential:
        return {
            "success": False,
            "data": {
                "status": "not_found",
                "message": "Credential does not exist"
            }
        }
    
    # Get institution info
    institution = await db.institution_profiles.find_one(
        {"institution_id": credential["institution_id"]},
        {"_id": 0, "institution_name": 1, "verified_status": 1}
    )
    
    # Verify on blockchain
    blockchain_status = await blockchain_service.verify_credential(credential["credential_hash"])
    
    # Increment verification count
    await db.blockchain_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$inc": {"verification_count": 1},
            "$set": {"last_verified_at": datetime.utcnow().isoformat()}
        }
    )
    
    # Log verification
    verification = CredentialVerification(
        credential_id=credential_id,
        verified_by_type="public",
        verification_method="url_link",
        verification_result=credential["status"]
    )
    
    await db.credential_verifications.insert_one(verification.model_dump())
    
    return {
        "success": True,
        "data": {
            "credential": credential,
            "institution": institution,
            "blockchain_verified": blockchain_status["valid"],
            "verification_count": credential.get("verification_count", 0) + 1
        }
    }

@router.post("/{credential_id}/revoke", response_model=Dict)
async def revoke_credential(
    credential_id: str,
    revocation_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution revokes a credential
    """
    
    credential = await db.blockchain_credentials.find_one({"credential_id": credential_id})
    
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
    
    if credential["institution_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only issuing institution can revoke")
    
    if credential["status"] == "revoked":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already revoked")
    
    reason = revocation_data.get("reason", "")
    
    # Revoke on blockchain
    blockchain_result = await blockchain_service.revoke_credential(credential_id, reason)
    
    # Update database
    await db.blockchain_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "status": "revoked",
                "revoked_at": datetime.utcnow().isoformat(),
                "revocation_reason": reason
            }
        }
    )
    
    # TODO: Notify worker
    
    return {
        "success": True,
        "data": {
            "credential_id": credential_id,
            "revocation_tx": blockchain_result["transaction_hash"]
        },
        "message": "Credential revoked on blockchain"
    }

@router.get("/my-credentials", response_model=Dict)
async def get_my_blockchain_credentials(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all blockchain credentials for current user (worker or institution)
    """
    
    if current_user["user_type"] == "workforce":
        query = {"worker_id": current_user["user_id"]}
    elif current_user["user_type"] == "institution":
        query = {"institution_id": current_user["user_id"]}
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    credentials = await db.blockchain_credentials.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {
            "credentials": credentials,
            "total": len(credentials)
        }
    }
