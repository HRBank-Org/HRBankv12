"""
Workforce Profile Update with Address Lock Protection
Workers cannot change address once it's verified and locked
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Optional
from datetime import datetime
from auth.dependencies import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/workforce/profile", tags=["Workforce Profile"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

class ProfileUpdate(BaseModel):
    """Workforce profile update model"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    lat: Optional[float] = None
    long: Optional[float] = None

@router.put("/update", response_model=Dict)
async def update_profile(
    updates: ProfileUpdate,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Update workforce profile
    PREVENTS address changes if address is locked (ID verified)
    """
    
    # Get current profile
    profile = await db.workforce_profiles.find_one({"workforce_id": current_user['user_id']})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Check if trying to update address fields
    address_fields = ['address', 'city', 'province', 'postal_code', 'lat', 'long']
    updating_address = any(getattr(updates, field) is not None for field in address_fields)
    
    # 🔒 PREVENT ADDRESS CHANGE IF LOCKED
    if updating_address and profile.get('address_locked', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Address is locked after ID verification. Contact support to request address change with re-verification."
        )
    
    # Build update dict
    update_dict = {}
    
    # Safe fields (can always update)
    if updates.first_name is not None:
        update_dict['first_name'] = updates.first_name
    if updates.last_name is not None:
        update_dict['last_name'] = updates.last_name
    if updates.phone is not None:
        update_dict['phone'] = updates.phone
    
    # Address fields (only if not locked)
    if not profile.get('address_locked', False):
        if updates.address is not None:
            update_dict['address'] = updates.address
        if updates.city is not None:
            update_dict['city'] = updates.city
        if updates.province is not None:
            update_dict['province'] = updates.province
        if updates.postal_code is not None:
            update_dict['postal_code'] = updates.postal_code
        if updates.lat is not None:
            update_dict['lat'] = updates.lat
        if updates.long is not None:
            update_dict['long'] = updates.long
    
    if not update_dict:
        return {
            "success": True,
            "message": "No changes to update"
        }
    
    # Add timestamp
    update_dict['updated_date'] = datetime.utcnow().isoformat()
    
    # Update profile
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user['user_id']},
        {"$set": update_dict}
    )
    
    # Also update user name if changed
    if updates.first_name or updates.last_name:
        user_updates = {}
        if updates.first_name:
            user_updates['first_name'] = updates.first_name
        if updates.last_name:
            user_updates['last_name'] = updates.last_name
        
        if user_updates:
            await db.users.update_one(
                {"user_id": current_user['user_id']},
                {"$set": user_updates}
            )
    
    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": {
            "updated_fields": list(update_dict.keys()),
            "address_locked": profile.get('address_locked', False)
        }
    }

@router.get("/me", response_model=Dict)
async def get_my_profile(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get current workforce profile
    Includes address lock status
    """
    
    profile = await db.workforce_profiles.find_one(
        {"workforce_id": current_user['user_id']},
        {"_id": 0}
    )
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return {
        "success": True,
        "data": {
            "profile": profile,
            "address_locked": profile.get('address_locked', False),
            "id_verified": profile.get('id_verified', False),
            "id_verification_status": profile.get('id_verification_status', 'pending')
        }
    }
