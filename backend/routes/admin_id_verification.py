"""
Admin ID & Address Verification
Approve/reject worker ID documents and lock their address for match engine
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, List, Optional
from datetime import datetime, timezone
from auth.dependencies import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin/id-verification", tags=["Admin ID Verification"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

class IDVerificationDecision(BaseModel):
    """Admin decision on ID verification"""
    approved: bool
    note: Optional[str] = None

@router.get("/pending", response_model=Dict)
async def get_pending_verifications(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Get list of workers pending ID verification
    """
    
    # Find users with pending ID verification
    users = await db.users.find({
        "user_type": "workforce",
        "id_verification_status": "pending"
    }, {"_id": 0, "user_id": 1, "email": 1, "first_name": 1, "last_name": 1}).to_list(1000)
    
    # Enrich with profile data
    workers = []
    for user in users:
        profile = await db.workforce_profiles.find_one(
            {"workforce_id": user['user_id']},
            {"_id": 0, "address": 1, "city": 1, "province": 1, "postal_code": 1, 
             "id_document_url": 1, "phone": 1}
        )
        
        if profile:
            workers.append({
                "user_id": user['user_id'],
                "email": user['email'],
                "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "address": profile.get('address'),
                "city": profile.get('city'),
                "province": profile.get('province'),
                "postal_code": profile.get('postal_code'),
                "phone": profile.get('phone'),
                "id_document_url": profile.get('id_document_url')
            })
    
    return {
        "success": True,
        "data": {
            "pending_verifications": workers,
            "total": len(workers)
        }
    }

@router.post("/{user_id}/verify", response_model=Dict)
async def verify_worker_id(
    user_id: str,
    decision: IDVerificationDecision,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Approve or reject worker's ID verification
    If approved, locks their address for match engine
    """
    
    # Get user
    user = await db.users.find_one({"user_id": user_id, "user_type": "workforce"})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )
    
    if user.get('id_verification_status') != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker ID verification is not pending (current status: {user.get('id_verification_status')})"
        )
    
    # Get profile
    profile = await db.workforce_profiles.find_one({"workforce_id": user_id})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    verification_timestamp = datetime.now(timezone.utc).isoformat()
    
    if decision.approved:
        # APPROVE: Lock address and mark as verified
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "id_verified": True,
                "id_verification_status": "approved",
                "id_verified_at": verification_timestamp,
                "id_verified_by": current_user['user_id']
            }}
        )
        
        await db.workforce_profiles.update_one(
            {"workforce_id": user_id},
            {"$set": {
                "id_verified": True,
                "id_verification_status": "approved",
                "address_verified": True,
                "address_locked": True,  # 🔒 LOCK ADDRESS
                "id_verified_at": verification_timestamp,
                "id_verified_by": current_user['user_id'],
                "address_verification_note": decision.note or "ID verified and address locked",
                "updated_date": verification_timestamp
            }}
        )
        
        message = "Worker ID verified and address locked successfully"
        
    else:
        # REJECT: Mark as rejected
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "id_verified": False,
                "id_verification_status": "rejected",
                "id_verified_at": verification_timestamp,
                "id_verified_by": current_user['user_id']
            }}
        )
        
        await db.workforce_profiles.update_one(
            {"workforce_id": user_id},
            {"$set": {
                "id_verified": False,
                "id_verification_status": "rejected",
                "address_verified": False,
                "address_locked": False,
                "id_verified_at": verification_timestamp,
                "id_verified_by": current_user['user_id'],
                "address_verification_note": decision.note or "ID verification rejected",
                "updated_date": verification_timestamp
            }}
        )
        
        message = "Worker ID verification rejected"
    
    return {
        "success": True,
        "message": message,
        "data": {
            "user_id": user_id,
            "verified": decision.approved,
            "address_locked": decision.approved,
            "verified_at": verification_timestamp
        }
    }

@router.get("/verified", response_model=Dict)
async def get_verified_workers(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Get list of verified workers with locked addresses
    """
    
    profiles = await db.workforce_profiles.find({
        "id_verified": True,
        "address_locked": True
    }, {
        "_id": 0, 
        "workforce_id": 1, 
        "full_name": 1, 
        "email": 1,
        "address": 1, 
        "city": 1, 
        "province": 1,
        "postal_code": 1,
        "id_verified_at": 1
    }).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "verified_workers": profiles,
            "total": len(profiles)
        }
    }

@router.post("/{user_id}/unlock-address", response_model=Dict)
async def unlock_address_for_update(
    user_id: str,
    reason: str,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Temporarily unlock address for worker to update
    Requires re-verification after update
    """
    
    profile = await db.workforce_profiles.find_one({"workforce_id": user_id})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    if not profile.get('address_locked'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address is not locked"
        )
    
    # Unlock address and reset verification status
    await db.workforce_profiles.update_one(
        {"workforce_id": user_id},
        {"$set": {
            "address_locked": False,
            "address_verified": False,
            "id_verification_status": "pending",
            "address_verification_note": f"Address unlocked for update: {reason}",
            "updated_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "id_verification_status": "pending"
        }}
    )
    
    return {
        "success": True,
        "message": "Address unlocked. Worker can now update address and must re-submit ID for verification.",
        "data": {
            "user_id": user_id,
            "address_locked": False,
            "requires_reverification": True
        }
    }

@router.put("/workforce/{user_id}/address", response_model=Dict)
async def update_workforce_address(
    user_id: str,
    address: str,
    city: str,
    province: str,
    postal_code: str,
    lat: float,
    long: float,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Admin updates worker address (for corrections)
    Maintains locked status if already verified
    """
    
    profile = await db.workforce_profiles.find_one({"workforce_id": user_id})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker profile not found"
        )
    
    # Update address while maintaining lock status
    await db.workforce_profiles.update_one(
        {"workforce_id": user_id},
        {"$set": {
            "address": address,
            "city": city,
            "province": province,
            "postal_code": postal_code,
            "lat": lat,
            "long": long,
            "address_verification_note": f"Address corrected by admin {current_user['user_id']}",
            "updated_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Address updated successfully",
        "data": {
            "user_id": user_id,
            "address_locked": profile.get('address_locked', False)
        }
    }
