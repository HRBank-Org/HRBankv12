"""
Workforce Credential Verification Request Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict
from datetime import datetime, timedelta
from auth.dependencies import get_current_user, require_role
from models.institution_classes import VerificationRequest
import base64
import os
import uuid

router = APIRouter(prefix="/api/workforce/credentials", tags=["Credential Verification"])

def get_db():
    from server import db
    return db


@router.post("/request-verification", response_model=Dict)
async def request_credential_verification(
    verification_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Request verification of a credential from an institution
    Workforce uploads credential image and provides registrar email
    """
    
    # Extract data
    credential_name = verification_data.get("credential_name")
    credential_type = verification_data.get("credential_type")
    institution_name = verification_data.get("institution_name")
    registrar_email = verification_data.get("registrar_email")
    file_data = verification_data.get("file_data")  # base64 encoded
    file_type = verification_data.get("file_type")
    issue_date = verification_data.get("issue_date")
    expiry_date = verification_data.get("expiry_date")
    occupation_id = verification_data.get("occupation_id")
    
    if not all([credential_name, credential_type, institution_name, registrar_email]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields"
        )
    
    # Handle file upload
    file_url = None
    if file_data and file_type:
        try:
            file_bytes = base64.b64decode(file_data)
            file_size = len(file_bytes)
            
            # Check file size (10MB limit)
            if file_size > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size must be less than 10MB"
                )
            
            # Create uploads directory
            upload_dir = "/app/backend/uploads/credentials"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save file
            file_name = f"{current_user['user_id']}_credential_{datetime.utcnow().timestamp()}.{file_type}"
            file_path = os.path.join(upload_dir, file_name)
            
            with open(file_path, 'wb') as f:
                f.write(file_bytes)
            
            file_url = f"/uploads/credentials/{file_name}"
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )
    
    # Check if institution already exists
    institution = await db.users.find_one({
        "email": registrar_email,
        "user_type": "institution"
    })
    
    # Create verification request
    request = VerificationRequest(
        workforce_id=current_user["user_id"],
        occupation_id=occupation_id,
        credential_name=credential_name,
        credential_type=credential_type,
        institution_name=institution_name,
        registrar_email=registrar_email,
        credential_image_url=file_url,
        issue_date=issue_date,
        expiry_date=expiry_date,
        institution_id=institution["user_id"] if institution else None,
        status="pending" if institution else "institution_invited"
    )
    
    await db.verification_requests.insert_one(request.model_dump())
    
    # If institution doesn't exist, send invitation email
    if not institution:
        # Create invitation token
        invite_token = f"inst_inv_{uuid.uuid4().hex[:12]}"
        invitation = {
            "invite_token": invite_token,
            "email": registrar_email,
            "invited_by": current_user["user_id"],
            "institution_name": institution_name,
            "verification_request_id": request.request_id,
            "user_type": "institution",
            "status": "pending",
            "created_date": datetime.utcnow().isoformat(),
            "expires_date": (datetime.utcnow() + timedelta(days=90)).isoformat()
        }
        
        await db.invitations.insert_one(invitation)
        
        # Mark invitation as sent
        await db.verification_requests.update_one(
            {"request_id": request.request_id},
            {"$set": {
                "invitation_sent": True,
                "invitation_sent_date": datetime.utcnow().isoformat()
            }}
        )
        
        # TODO: Send email with signup link
        print(f"Institution invitation sent to {registrar_email} for verification")
    
    return {
        "success": True,
        "data": {
            "request_id": request.request_id,
            "status": request.status,
            "institution_exists": institution is not None
        },
        "message": "Verification request submitted successfully" if institution else "Invitation sent to institution"
    }


@router.get("/verification-requests", response_model=Dict)
async def get_my_verification_requests(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all verification requests made by workforce"""
    requests = await db.verification_requests.find({
        "workforce_id": current_user["user_id"]
    }, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "data": {
            "requests": requests,
            "count": len(requests)
        }
    }


@router.get("/my-credentials", response_model=Dict)
async def get_my_verified_credentials(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get all verified credentials for workforce"""
    credentials = await db.credential_issuances.find({
        "student_id": current_user["user_id"],
        "status": "active"
    }, {"_id": 0}).to_list(100)
    
    # Enrich with institution info
    for cred in credentials:
        institution = await db.institution_profiles.find_one(
            {"user_id": cred["institution_id"]},
            {"_id": 0, "institution_name": 1}
        )
        cred["institution_name"] = institution.get("institution_name") if institution else "Unknown"
    
    return {
        "success": True,
        "data": {
            "credentials": credentials,
            "count": len(credentials)
        }
    }
