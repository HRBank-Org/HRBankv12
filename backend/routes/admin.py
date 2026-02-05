from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from typing import Dict, List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["Admin"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/users", response_model=Dict)
async def get_all_users(
    user_type: Optional[str] = Query(None),
    profile_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Get all users (admin only)
    Filter by user_type and profile_status
    """
    query = {}
    if user_type:
        query["user_type"] = user_type
    if profile_status:
        query["profile_status"] = profile_status
    
    # Get total count
    total = await db.users.count_documents(query)
    
    # Get paginated results
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}  # Exclude password hash
    ).skip((page - 1) * limit).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        }
    }

@router.patch("/users/{user_id}/status", response_model=Dict)
async def update_user_status(
    user_id: str,
    status_data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Update user profile status (approve, suspend, reject)
    Admin only
    """
    new_status = status_data.get("new_status")
    
    valid_statuses = ["active", "pending", "suspended", "rejected"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"profile_status": new_status, "updated_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Log audit event
    from models.admin import AuditLog
    audit_log = AuditLog(
        user_id=current_user["user_id"],
        user_type="admin",
        action_category="admin_action",
        action="updated",
        entity_type="users",
        entity_id=user_id,
        new_value={"profile_status": new_status},
        result="success"
    )
    await db.audit_logs.insert_one(audit_log.model_dump())
    
    return {
        "success": True,
        "message": f"User status updated to {new_status}"
    }

@router.get("/institutions/pending", response_model=Dict)
async def get_pending_institutions(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Get all pending institution registrations for approval
    Admin only
    """
    institutions = await db.institution_profiles.find(
        {"verified_status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # OPTIMIZED: Batch fetch user details
    if institutions:
        institution_ids = [inst["institution_id"] for inst in institutions]
        users = await db.users.find(
            {"user_id": {"$in": institution_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "created_date": 1}
        ).to_list(100)
        user_map = {user["user_id"]: user for user in users}
        
        # Add user details to institutions
        for inst in institutions:
            user = user_map.get(inst["institution_id"])
            if user:
                inst["email"] = user["email"]
                inst["signup_date"] = user["created_date"]
    
    return {
        "success": True,
        "data": {
            "institutions": institutions,
            "count": len(institutions)
        }
    }

@router.patch("/institutions/{institution_id}/verify", response_model=Dict)
async def verify_institution(
    institution_id: str,
    approved: bool,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Approve or reject institution registration
    Admin only
    """
    new_status = "approved" if approved else "rejected"
    
    result = await db.institution_profiles.update_one(
        {"institution_id": institution_id},
        {"$set": {"verified_status": new_status, "updated_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    # Update user status as well
    await db.users.update_one(
        {"user_id": institution_id},
        {"$set": {"profile_status": "active" if approved else "rejected"}}
    )
    
    # Log audit event
    from models.admin import AuditLog
    audit_log = AuditLog(
        user_id=current_user["user_id"],
        user_type="admin",
        action_category="admin_action",
        action="approved" if approved else "rejected",
        entity_type="institutions",
        entity_id=institution_id,
        new_value={"verified_status": new_status, "notes": notes},
        result="success"
    )
    await db.audit_logs.insert_one(audit_log.model_dump())
    
    # TODO: Send notification to institution
    
    return {
        "success": True,
        "message": f"Institution {new_status}"
    }

@router.get("/stats/platform", response_model=Dict)
async def get_platform_stats(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Get platform-wide statistics
    Admin only
    """
    stats = {
        "total_users": await db.users.count_documents({}),
        "total_workers": await db.workforce_profiles.count_documents({}),
        "total_employers": await db.employer_profiles.count_documents({}),
        "total_institutions": await db.institution_profiles.count_documents({}),
        "active_users": await db.users.count_documents({"profile_status": "active"}),
        "pending_institutions": await db.institution_profiles.count_documents({"verified_status": "pending"}),
        "total_shifts": await db.shifts.count_documents({}),
        "total_bookings": await db.bookings.count_documents({}),
        "verified_credentials": await db.workforce_credentials.count_documents({"verification_status": "verified"})
    }
    
    return {
        "success": True,
        "data": stats
    }

@router.post("/credential-types", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_credential_type(
    credential_data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Create new credential type
    Admin only
    """
    from models.workforce import CredentialType
    
    # Check if credential name already exists
    existing = await db.credential_types.find_one({"credential_name": credential_data.get("credential_name")})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Credential type already exists"
        )
    
    cred_type = CredentialType(**credential_data)
    await db.credential_types.insert_one(cred_type.model_dump())
    
    return {
        "success": True,
        "data": {"credential_type_id": cred_type.credential_type_id},
        "message": "Credential type created"
    }

@router.get("/credentials/pending-approval", response_model=Dict)
async def get_pending_credentials(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Get all credentials that institutions verified, waiting for admin approval
    """
    
    credentials = await db.workforce_credentials.find(
        {
            "institution_verification_status": "verified",
            "admin_approval_status": "pending",
            "final_status": "pending_admin"
        },
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with worker and occupation info
    for cred in credentials:
        worker = await db.workforce_profiles.find_one(
            {"workforce_id": cred["workforce_id"]},
            {"_id": 0, "full_name": 1}
        )
        if worker:
            cred["worker_name"] = worker.get("full_name")
        
        if cred.get("occupation_id"):
            occupation = await db.occupation_profiles.find_one(
                {"occupation_id": cred["occupation_id"]},
                {"_id": 0, "occupation_title": 1}
            )
            if occupation:
                cred["occupation_title"] = occupation.get("occupation_title")
        
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
            "credentials": credentials
        }
    }

@router.post("/credentials/{credential_id}/approve", response_model=Dict)
async def approve_credential(
    credential_id: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Admin gives final approval to credential
    Credential becomes valid for job matching
    """
    
    # Get credential
    credential = await db.workforce_credentials.find_one({"credential_id": credential_id})
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    
    # Verify institution has verified it first
    if credential.get("institution_verification_status") != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credential must be verified by institution first"
        )
    
    # Admin approves
    await db.workforce_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "admin_approval_status": "approved",
                "approved_by_admin_id": current_user["user_id"],
                "admin_approved_date": datetime.now(timezone.utc).isoformat(),
                "final_status": "approved"
            }
        }
    )
    
    # Add credential to occupation profile's certifications list
    occupation_id = credential.get("occupation_id")
    if occupation_id:
        await db.occupation_profiles.update_one(
            {"occupation_id": occupation_id},
            {"$addToSet": {"certifications": credential_id}}
        )
    
    # TODO: Notify worker that credential is approved
    
    return {
        "success": True,
        "message": "Credential approved! It's now valid for job matching."
    }

@router.post("/credentials/{credential_id}/reject", response_model=Dict)
async def reject_credential(
    credential_id: str,
    rejection_data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Admin rejects credential
    """
    
    rejection_reason = rejection_data.get("rejection_reason", "")
    
    await db.workforce_credentials.update_one(
        {"credential_id": credential_id},
        {
            "$set": {
                "admin_approval_status": "rejected",
                "admin_rejection_reason": rejection_reason,
                "final_status": "rejected"
            }
        }
    )
    
    # TODO: Notify worker
    
    return {
        "success": True,
        "message": "Credential rejected"
    }
