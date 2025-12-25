from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from models.workforce import WorkforceCredential, CredentialType
from typing import Dict, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/credentials", tags=["Credentials"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/types", response_model=Dict)
async def get_credential_types(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all available credential types
    Public endpoint for signup/profile setup
    """
    credential_types = await db.credential_types.find({}, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "data": {
            "credential_types": credential_types
        }
    }

@router.post("", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def submit_credential(
    credential_data: WorkforceCredential,
    current_user: dict = Depends(require_role("workforce")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Submit a credential for verification (workers only)
    Creates credential + verification request for institution
    """
    # Auto-assign workforce_id from current user
    credential_data.workforce_id = current_user["user_id"]
    
    # Get credential type details
    cred_type = await db.credential_types.find_one({"credential_type_id": credential_data.credential_type_id})
    if not cred_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential type not found"
        )
    
    credential_data.credential_type_name = cred_type["credential_name"]
    
    # Insert credential
    credential_dict = credential_data.model_dump()
    credential_dict["submitted_date"] = datetime.now(timezone.utc).isoformat()
    credential_dict["issue_date"] = credential_dict["issue_date"].isoformat()
    if credential_dict.get("expiration_date"):
        credential_dict["expiration_date"] = credential_dict["expiration_date"].isoformat()
    
    # Set initial statuses
    credential_dict["institution_verification_status"] = "pending"
    credential_dict["admin_approval_status"] = "pending"
    credential_dict["final_status"] = "pending_institution"
    
    await db.workforce_credentials.insert_one(credential_dict)
    
    # Create verification request for institution
    from models.institution import CredentialVerificationRequest
    
    verification_request = CredentialVerificationRequest(
        workforce_id=current_user["user_id"],
        credential_id=credential_data.credential_id,
        assigned_to_institution_id="",  # Will be assigned based on catchment area
        requested_date=datetime.now(timezone.utc),
        status="pending"
    )
    
    await db.credential_verification_requests.insert_one(verification_request.model_dump())
    
    # TODO: Notify institution about new verification request
    
    return {
        "success": True,
        "data": {
            "credential_id": credential_data.credential_id,
            "verification_status": "pending_institution",
            "submitted_date": credential_dict["submitted_date"]
        },
        "message": "Credential submitted for verification. Institution will review it first, then HR Bank admin."
    }

@router.get("/me", response_model=Dict)
async def get_my_credentials(
    current_user: dict = Depends(require_role("workforce")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all credentials for current worker
    """
    credentials = await db.workforce_credentials.find(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {
            "credentials": credentials
        }
    }

@router.get("/me/expiring", response_model=Dict)
async def get_expiring_credentials(
    days: int = 30,
    current_user: dict = Depends(require_role("workforce")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get credentials expiring within X days
    """
    from datetime import timedelta
    
    expiry_threshold = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    
    credentials = await db.workforce_credentials.find({
        "workforce_id": current_user["user_id"],
        "final_status": "approved",
        "expiration_date": {"$lte": expiry_threshold, "$gte": datetime.now(timezone.utc).isoformat()}
    }, {"_id": 0}).to_list(100)
    
    # Calculate days until expiration
    for cred in credentials:
        if cred.get("expiration_date"):
            exp_date = datetime.fromisoformat(cred["expiration_date"])
            days_until = (exp_date - datetime.now(timezone.utc)).days
            cred["days_until_expiration"] = days_until
    
    return {
        "success": True,
        "data": {
            "expiring_credentials": credentials
        }
    }

@router.post("/documents/upload", response_model=Dict)
async def upload_credential_document(
    file_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Upload credential document
    Returns URL for use in credential submission
    """
    
    # For now, just return a placeholder URL
    # In production, this would upload to S3/Cloudflare R2/Supabase Storage
    
    file_name = file_data.get("file_name", "document.pdf")
    file_id = f"doc_{uuid.uuid4().hex[:12]}"
    
    # Placeholder URL (in production, upload to cloud storage)
    document_url = f"https://cdn.hrbank.ca/credentials/{current_user['user_id']}/{file_id}_{file_name}"
    
    return {
        "success": True,
        "data": {
            "document_url": document_url,
            "file_id": file_id
        },
        "message": "Document uploaded successfully"
    }
