from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from typing import Dict, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/institutions", tags=["Institutions"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/me/profile", response_model=Dict)
async def get_my_profile(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get institution profile (creates empty if doesn't exist)"""
    # Try both institution_id and user_id for backwards compatibility
    profile = await db.institution_profiles.find_one(
        {"$or": [
            {"institution_id": current_user["user_id"]},
            {"user_id": current_user["user_id"]}
        ]},
        {"_id": 0}
    )
    
    if not profile:
        # Get user info to populate defaults
        user = await db.users.find_one({"user_id": current_user["user_id"]})
        
        # Return default empty profile with email from user
        profile = {
            "user_id": current_user["user_id"],
            "contact_name": "",
            "title": "",
            "institution_name": "",
            "institution_logo_url": "",
            "phone": "",
            "address": "",
            "city": "",
            "province": "",
            "postal_code": "",
            "institution_type": "",
            "phone_verified": False,
            "email_verified": False
        }
    
    return {
        "success": True,
        "data": profile
    }

@router.put("/me/profile", response_model=Dict)
async def update_my_profile(
    profile_data: dict,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Update institution profile (creates if doesn't exist)"""
    # Prepare update data
    update_data = {
        "user_id": current_user["user_id"],
        "institution_id": current_user["user_id"],  # Store both for compatibility
        "contact_name": profile_data.get("contact_name"),
        "title": profile_data.get("title"),
        "institution_name": profile_data.get("institution_name"),
        "institution_logo_url": profile_data.get("institution_logo_url"),
        "phone": profile_data.get("phone"),
        "address": profile_data.get("address"),
        "city": profile_data.get("city"),
        "province": profile_data.get("province"),
        "postal_code": profile_data.get("postal_code"),
        "institution_type": profile_data.get("institution_type"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values except user_id and institution_id
    update_data = {k: v for k, v in update_data.items() if v is not None or k in ["user_id", "institution_id"]}
    
    # Check if profile exists (try both fields)
    existing_profile = await db.institution_profiles.find_one({
        "$or": [
            {"institution_id": current_user["user_id"]},
            {"user_id": current_user["user_id"]}
        ]
    })
    
    if existing_profile:
        # Update existing profile using the field that exists
        query = {"institution_id": current_user["user_id"]} if "institution_id" in existing_profile else {"user_id": current_user["user_id"]}
        result = await db.institution_profiles.update_one(
            query,
            {"$set": update_data}
        )
        message = "Profile updated successfully"
    else:
        # Create new profile
        update_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.institution_profiles.insert_one(update_data)
        message = "Profile created successfully"
    
    return {
        "success": True,
        "message": message
    }

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
                "institution_verified_date": datetime.now(timezone.utc).isoformat(),
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
                "verification_date": datetime.now(timezone.utc).isoformat()
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
