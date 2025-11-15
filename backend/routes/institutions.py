from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from typing import Dict, Optional
from datetime import datetime

router = APIRouter(prefix="/institutions", tags=["Institutions"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/me/verification-queue", response_model=Dict)
async def get_verification_queue(
    status_filter: str = Query("pending", alias="status"),
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Get pending credential verification requests for institution
    """
    
    # Get all credentials pending institution verification
    query = {
        "institution_verification_status": "pending",
        "final_status": "pending_institution"
    }
    
    if status_filter == "verified":
        query = {
            "institution_verification_status": "verified",
            "admin_approval_status": "pending"
        }
    elif status_filter == "all":
        query = {}
    
    credentials = await db.workforce_credentials.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with worker info
    for cred in credentials:
        worker = await db.workforce_profiles.find_one(
            {"workforce_id": cred["workforce_id"]},
            {"_id": 0, "full_name": 1}
        )
        if worker:
            cred["worker_name"] = worker.get("full_name")
        
        # Get occupation
        if cred.get("occupation_id"):
            occupation = await db.occupation_profiles.find_one(
                {"occupation_id": cred["occupation_id"]},
                {"_id": 0, "occupation_title": 1}
            )
            if occupation:
                cred["occupation_title"] = occupation.get("occupation_title")
        
        # Get institution that verified (if already verified)
        if cred.get("verified_by_institution_id"):
            inst = await db.institution_profiles.find_one(
                {"institution_id": cred["verified_by_institution_id"]},
                {"_id": 0, "institution_name": 1}
            )
            if inst:
                cred["verified_by_institution_name"] = inst.get("institution_name")
    
    return {
        "success": True,
        "data": {
            "verification_requests": credentials
        }
    }

@router.post("/me/verifications/{credential_id}/approve", response_model=Dict)
async def approve_credential(
    credential_id: str,
    approval_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution approves/verifies a credential
    Moves to admin approval queue
    """
    
    # Update credential
    await db.workforce_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "institution_verification_status": "verified",
                "verified_by_institution_id": current_user["user_id"],
                "institution_verified_date": datetime.utcnow().isoformat(),
                "final_status": "pending_admin"
            }
        }
    )
    
    # Update verification request
    await db.credential_verification_requests.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "status": "verified",
                "verified_by_institution_id": current_user["user_id"],
                "verification_date": datetime.utcnow().isoformat()
            }
        }
    )
    
    # TODO: Notify admin about new credential needing approval
    # TODO: Notify worker that institution verified their credential
    
    return {
        "success": True,
        "message": "Credential verified. Sent to HR Bank admin for final approval."
    }

@router.post("/me/verifications/{credential_id}/reject", response_model=Dict)
async def reject_credential(
    credential_id: str,
    rejection_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """
    Institution rejects a credential
    """
    
    rejection_reason = rejection_data.get("rejection_reason", "")
    
    await db.workforce_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "institution_verification_status": "rejected",
                "institution_rejection_reason": rejection_reason,
                "final_status": "rejected"
            }
        }
    )
    
    await db.credential_verification_requests.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": rejection_reason
            }
        }
    )
    
    # TODO: Notify worker that credential was rejected
    
    return {
        "success": True,
        "message": "Credential rejected"
    }
