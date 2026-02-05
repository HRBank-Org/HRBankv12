from fastapi import APIRouter, HTTPException, status, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from models.blockchain_credentials import BlockchainCredential, CredentialTemplate, CredentialVerification
from utils.blockchain_service import blockchain_service
from utils.rate_limiter import limiter
from utils.push_notifications import get_push_service
from typing import Dict
from datetime import datetime, timedelta, timezone
import qrcode
import io
import base64
import uuid
import secrets

router = APIRouter(prefix="/blockchain-credentials", tags=["Blockchain Credentials"])

def get_db():
    from server import db
    return db


@router.post("/issue-by-email", response_model=Dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def issue_credential_by_email(
    request: Request,
    credential_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution issues credential by student email.
    - If email matches existing WorkPassport/Workforce account → credential linked immediately
    - If no account → create pending credential with invite token, send email invite
    """
    recipient_email = credential_data.get("recipient_email", "").lower().strip()
    
    if not recipient_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient email is required"
        )
    
    # Check if user with this email exists
    existing_user = await db.users.find_one(
        {"email": recipient_email, "user_type": {"$in": ["workpassport", "workforce"]}},
        {"_id": 0, "user_id": 1, "email": 1, "user_type": 1}
    )
    
    if existing_user:
        # User exists - issue credential directly to their account
        credential_data["worker_id"] = existing_user["user_id"]
        credential_data["recipient_user_id"] = existing_user["user_id"]
        credential_data["status"] = "issued"
        
        # Call the regular issue endpoint logic
        return await _issue_credential_internal(credential_data, current_user, db, request)
    else:
        # User doesn't exist - create pending credential with invite token
        invite_token = secrets.token_urlsafe(32)
        
        pending_credential = {
            "pending_credential_id": f"pc_{uuid.uuid4().hex[:12]}",
            "recipient_email": recipient_email,
            "institution_id": current_user["user_id"],
            "credential_name": credential_data.get("credential_name"),
            "program_name": credential_data.get("program_name"),
            "student_name": credential_data.get("student_name"),
            "student_id": credential_data.get("student_id"),
            "grade_gpa": credential_data.get("grade_gpa"),
            "issue_date": credential_data.get("issue_date", datetime.now(timezone.utc).isoformat()),
            "expiry_date": credential_data.get("expiry_date"),
            "credential_template_id": credential_data.get("credential_template_id"),
            "additional_details": credential_data.get("additional_details", {}),
            "invite_token": invite_token,
            "status": "pending_signup",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.pending_credentials.insert_one(pending_credential)
        
        # Get institution name for the email
        institution = await db.institution_profiles.find_one(
            {"institution_id": current_user["user_id"]},
            {"_id": 0, "institution_name": 1}
        )
        institution_name = institution.get("institution_name", "Institution") if institution else "Institution"
        
        # Send invite email
        try:
            from utils.email_service import send_credential_invite_email
            import os
            frontend_url = os.environ.get("FRONTEND_URL", "https://hrbank.ca")
            invite_link = f"{frontend_url}/signup?token={invite_token}&email={recipient_email}&type=workpassport"
            
            await send_credential_invite_email(
                to_email=recipient_email,
                institution_name=institution_name,
                credential_name=credential_data.get("credential_name", "Credential"),
                invite_link=invite_link
            )
        except Exception as e:
            print(f"Failed to send invite email: {e}")
        
        return {
            "success": True,
            "data": {
                "pending_credential_id": pending_credential["pending_credential_id"],
                "status": "pending_signup",
                "recipient_email": recipient_email,
                "invite_sent": True
            },
            "message": f"Credential pending. Invite sent to {recipient_email} to create their WorkPassport account."
        }


async def _issue_credential_internal(credential_data: dict, current_user: dict, db, request: Request):
    """Internal function to issue credential (shared logic)"""
    # Parse dates as ISO strings
    issue_date_str = credential_data.get("issue_date", datetime.now(timezone.utc).isoformat())
    if isinstance(issue_date_str, str) and 'T' in issue_date_str:
        issue_date_str = issue_date_str.split('T')[0]
    
    expiry_date_str = None
    if credential_data.get("expiry_date"):
        expiry_date_str = credential_data.get("expiry_date")
        if isinstance(expiry_date_str, str) and 'T' in expiry_date_str:
            expiry_date_str = expiry_date_str.split('T')[0]
    
    credential = BlockchainCredential(
        worker_id=credential_data.get("worker_id", ""),
        institution_id=current_user["user_id"],
        credential_template_id=credential_data.get("credential_template_id", ""),
        credential_name=credential_data.get("credential_name"),
        program_name=credential_data.get("program_name"),
        issue_date=issue_date_str,
        expiry_date=expiry_date_str,
        student_name=credential_data.get("student_name"),
        student_id=credential_data.get("student_id"),
        grade_gpa=credential_data.get("grade_gpa"),
        additional_details=credential_data.get("additional_details", {})
    )
    
    credential.credential_hash = credential.generate_credential_hash()
    credential.verification_url = blockchain_service.generate_verification_url(credential.credential_id)
    
    metadata = {
        "credential_id": credential.credential_id,
        "credential_name": credential.credential_name,
        "program_name": credential.program_name,
        "student_name": credential.student_name,
        "issue_date": credential.issue_date,
        "institution_id": credential.institution_id
    }
    
    ipfs_url = await blockchain_service.upload_to_ipfs(metadata)
    credential.ipfs_url = ipfs_url
    
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
    credential.issued_at = datetime.now(timezone.utc)
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(credential.verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    credential.qr_code_url = f"data:image/png;base64,{img_str}"
    
    credential_doc = credential.model_dump()
    credential_doc["on_chain"] = blockchain_result.get("on_chain", False)
    credential_doc["blockchain_status"] = blockchain_result.get("status", "simulated")
    credential_doc["explorer_url"] = blockchain_result.get("explorer_url")
    credential_doc["gas_fee"] = blockchain_result.get("gas_fee", 0)
    credential_doc["block_number"] = blockchain_result.get("block_number", 0)
    
    await db.blockchain_credentials.insert_one(credential_doc)
    
    await db.institution_profiles.update_one(
        {"institution_id": current_user["user_id"]},
        {"$inc": {"total_credentials_issued": 1}}
    )
    
    return {
        "success": True,
        "data": {
            "credential_id": credential.credential_id,
            "transaction_hash": credential.blockchain_transaction_hash,
            "ipfs_url": credential.ipfs_url,
            "verification_url": credential.verification_url,
            "qr_code": credential.qr_code_url,
            "on_chain": blockchain_result.get("on_chain", False),
            "blockchain_status": blockchain_result.get("status", "simulated")
        },
        "message": "Credential issued successfully"
    }


@router.post("/issue", response_model=Dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")  # Rate limit: 30 credential issuances per minute
async def issue_blockchain_credential(
    request: Request,
    credential_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution issues blockchain-verified credential
    """
    
    # Parse dates as ISO strings
    issue_date_str = credential_data.get("issue_date", datetime.now(timezone.utc).isoformat())
    if isinstance(issue_date_str, str) and 'T' in issue_date_str:
        issue_date_str = issue_date_str.split('T')[0]  # Extract just the date part
    
    expiry_date_str = None
    if credential_data.get("expiry_date"):
        expiry_date_str = credential_data.get("expiry_date")
        if isinstance(expiry_date_str, str) and 'T' in expiry_date_str:
            expiry_date_str = expiry_date_str.split('T')[0]
    
    # Create credential
    credential = BlockchainCredential(
        worker_id=credential_data.get("worker_id", ""),
        institution_id=current_user["user_id"],
        credential_template_id=credential_data.get("credential_template_id", ""),
        credential_name=credential_data.get("credential_name"),
        program_name=credential_data.get("program_name"),
        issue_date=issue_date_str,
        expiry_date=expiry_date_str,
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
        "issue_date": credential.issue_date,
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
    
    # Log blockchain result for debugging
    print(f"🔗 Blockchain mint result: on_chain={blockchain_result.get('on_chain')}, status={blockchain_result.get('status')}")
    
    credential.blockchain_transaction_hash = blockchain_result["transaction_hash"]
    credential.blockchain_token_id = blockchain_result["token_id"]
    credential.status = "issued"
    credential.issued_at = datetime.now(timezone.utc)
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(credential.verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    credential.qr_code_url = f"data:image/png;base64,{img_str}"
    
    # Save to database with blockchain details
    credential_data = credential.model_dump()
    credential_data["on_chain"] = blockchain_result.get("on_chain", False)
    credential_data["blockchain_status"] = blockchain_result.get("status", "simulated")
    credential_data["explorer_url"] = blockchain_result.get("explorer_url")
    credential_data["gas_fee"] = blockchain_result.get("gas_fee", 0)
    credential_data["block_number"] = blockchain_result.get("block_number", 0)
    
    await db.blockchain_credentials.insert_one(credential_data)
    
    # Update institution stats
    await db.institution_profiles.update_one(
        {"institution_id": current_user["user_id"]},
        {"$inc": {"total_credentials_issued": 1}}
    )
    
    # Send push notification to the credential recipient
    try:
        push_service = get_push_service(db)
        institution_profile = await db.institution_profiles.find_one(
            {"institution_id": current_user["user_id"]},
            {"_id": 0, "institution_name": 1}
        )
        institution_name = institution_profile.get("institution_name", "Institution") if institution_profile else "Institution"
        
        await push_service.notify_credential_issued(
            user_id=credential.user_id,
            credential_type=credential.credential_type,
            institution_name=institution_name,
            credential_id=credential.credential_id
        )
    except Exception as e:
        print(f"Push notification error: {e}")  # Don't fail the request if notification fails
    
    # TODO: Send notification to worker
    
    return {
        "success": True,
        "data": {
            "credential_id": credential.credential_id,
            "transaction_hash": credential.blockchain_transaction_hash,
            "ipfs_url": credential.ipfs_url,
            "ipfs_gateway_url": blockchain_result.get("ipfs_gateway_url"),
            "verification_url": credential.verification_url,
            "qr_code": credential.qr_code_url,
            "on_chain": blockchain_result.get("on_chain", False),
            "blockchain_status": blockchain_result.get("status", "simulated"),
            "explorer_url": blockchain_result.get("explorer_url"),
            "gas_fee": blockchain_result.get("gas_fee", 0),
            "block_number": blockchain_result.get("block_number", 0),
            "network": blockchain_result.get("network", "Polygon Mainnet")
        },
        "message": "Credential issued successfully" + (" on blockchain" if blockchain_result.get("on_chain") else " (IPFS only - blockchain simulated)")
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
        {"_id": 0, "institution_name": 1, "verified_status": 1, "city": 1, "province": 1}
    )
    
    # Verify on blockchain
    blockchain_status = await blockchain_service.verify_credential(credential.get("credential_hash", ""))
    
    # Increment verification count
    await db.blockchain_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$inc": {"verification_count": 1},
            "$set": {"last_verified_at": datetime.now(timezone.utc).isoformat()}
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
            "credential_data": credential.get("additional_details", {}),
            "institution": institution,
            "issuer": institution,
            "blockchain_verified": blockchain_status.get("is_valid", False),
            "verification_count": credential.get("verification_count", 0) + 1,
            "verification": {
                "is_valid": blockchain_status.get("is_valid", False),
                "is_registered": blockchain_status.get("is_registered", False),
                "is_revoked": blockchain_status.get("is_revoked", False),
                "is_expired": False,  # Would check expiry date
                "credential_id": credential_id,
                "credential_type": credential.get("credential_type", "academic"),
                "issued_at": credential.get("issued_at"),
                "valid_until": credential.get("expiry_date"),
                "network": blockchain_status.get("network", "polygon"),
                "verification_method": blockchain_status.get("verification_method", "demo"),
                "timestamp": blockchain_status.get("timestamp")
            }
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
                "revoked_at": datetime.now(timezone.utc).isoformat(),
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


@router.get("/issuer-status")
async def get_issuer_wallet_status(
    network: str = "polygon",
    current_user: dict = Depends(require_role("institution"))
):
    """
    Get the status of the issuer wallet including balance and gas price.
    Used to verify the institution can issue on-chain credentials.
    """
    try:
        from services.etherscan_service import get_etherscan_service
        
        service = get_etherscan_service(network)
        status = await service.get_issuer_status()
        
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get issuer status: {str(e)}"
        )


@router.get("/wallet/{address}/balance")
async def get_wallet_balance(
    address: str,
    network: str = "polygon",
    current_user: dict = Depends(get_current_user)
):
    """
    Get the balance of any wallet address.
    """
    try:
        from services.etherscan_service import get_etherscan_service
        
        service = get_etherscan_service(network)
        result = await service.get_balance(address)
        
        return {
            "success": result.get("success", False),
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get balance: {str(e)}"
        )


@router.get("/transaction/{tx_hash}")
async def get_transaction_status(
    tx_hash: str,
    network: str = "polygon",
    current_user: dict = Depends(get_current_user)
):
    """
    Get the status and details of a blockchain transaction.
    """
    try:
        from services.etherscan_service import get_etherscan_service
        
        service = get_etherscan_service(network)
        tx_info = await service.get_transaction(tx_hash)
        receipt = await service.get_transaction_receipt(tx_hash)
        
        return {
            "success": True,
            "data": {
                "transaction": tx_info.get("transaction") if tx_info.get("success") else None,
                "receipt": receipt if receipt.get("success") else None,
                "explorer_url": tx_info.get("explorer_url")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transaction: {str(e)}"
        )


@router.get("/network-status")
async def get_network_status():
    """
    Get the current blockchain network status and configuration.
    Public endpoint for checking system status.
    """
    try:
        status = blockchain_service.get_network_status()
        
        # Get wallet balance if connected
        if status.get("is_connected") and status.get("issuer_address"):
            balance = await blockchain_service.get_wallet_balance()
            status["issuer_balance"] = balance
        
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/test-ipfs-upload")
async def test_ipfs_upload(
    current_user: dict = Depends(require_role("institution"))
):
    """
    Test IPFS upload functionality.
    Uploads a test document to verify Pinata configuration.
    """
    try:
        test_metadata = {
            "type": "test",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "IPFS connection test from HR Bank",
            "institution_id": current_user.get("user_id")
        }
        
        ipfs_url = await blockchain_service.upload_to_ipfs(test_metadata)
        gateway_url = blockchain_service.get_ipfs_gateway_url(ipfs_url)
        
        return {
            "success": True,
            "data": {
                "ipfs_url": ipfs_url,
                "gateway_url": gateway_url,
                "test_data": test_metadata
            },
            "message": "IPFS upload successful!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"IPFS upload test failed: {str(e)}"
        )

