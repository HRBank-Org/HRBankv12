from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from typing import Dict, List
from datetime import datetime, timezone

router = APIRouter(prefix="/users", tags=["Users"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/me", response_model=Dict)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get current user's full profile
    """
    user_type = current_user.get("user_type")
    user_id = current_user.get("user_id")
    
    # Get type-specific profile
    profile = None
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one({"workforce_id": user_id}, {"_id": 0})
        
        # Add occupation titles and behavior rating for workforce
        if profile:
            # Get occupation profiles
            occupations = await db.occupation_profiles.find(
                {"workforce_id": user_id},
                {"occupation_title": 1, "_id": 0}
            ).to_list(3)
            
            profile["occupation_titles"] = [occ.get("occupation_title") for occ in occupations if occ.get("occupation_title")]
            profile["behavior_rating"] = profile.get("general_rating_avg", 0.0)
            profile["behavior_rating_count"] = profile.get("general_rating_count", 0)
            
    elif user_type == "employer":
        profile = await db.employer_profiles.find_one({"employer_id": user_id}, {"_id": 0})
    elif user_type == "institution":
        profile = await db.institution_profiles.find_one({"institution_id": user_id}, {"_id": 0})
    elif user_type in ["admin", "super_admin"]:
        profile = await db.admin_profiles.find_one({"admin_id": user_id}, {"_id": 0})
    elif user_type == "workpassport":
        profile = await db.workpassport_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "email": current_user.get("email"),
            "user_type": user_type,
            "email_verified": current_user.get("email_verified"),
            "profile_status": current_user.get("profile_status"),
            "created_date": current_user.get("created_date"),
            "last_login_date": current_user.get("last_login_date"),
            "profile": profile or {}
        }
    }

@router.get("/{user_id}", response_model=Dict)
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get public profile of any user
    Returns limited data (no sensitive info like email, phone, address)
    """
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_type = user.get("user_type")
    
    # Get profile based on type
    profile = None
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one({"workforce_id": user_id}, {"_id": 0})
        # Return only public fields
        if profile:
            profile = {
                "full_name": profile.get("full_name"),
                "photo_url": profile.get("photo_url"),
                "rating_avg": profile.get("rating_avg", 0),
                "rating_count": profile.get("rating_count", 0),
                "skills": profile.get("skills", []),
                "completed_jobs_count": profile.get("completed_jobs_count", 0),
                "verified_credentials": []  # TODO: Fetch verified credentials
            }
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "user_type": user_type,
            "profile": profile or {}
        }
    }



@router.put("/preferred-language", response_model=Dict)
async def update_preferred_language(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update the user's preferred language (synced from browser locale).
    Stores in the type-specific profile collection so notification translation can use it.
    """
    lang = body.get("preferred_language", "en")
    user_type = current_user.get("user_type")
    user_id = current_user.get("user_id")

    update = {"preferred_language": lang, "language_updated_at": datetime.now(timezone.utc).isoformat()}

    if user_type == "workforce":
        await db.workforce_profiles.update_one({"workforce_id": user_id}, {"$set": update}, upsert=False)
    elif user_type == "employer":
        await db.employer_profiles.update_one({"employer_id": user_id}, {"$set": update}, upsert=False)
    elif user_type == "institution":
        await db.institution_profiles.update_one({"institution_id": user_id}, {"$set": update}, upsert=False)
    elif user_type == "workpassport":
        await db.workpassport_profiles.update_one({"user_id": user_id}, {"$set": update}, upsert=False)

    return {"success": True, "message": f"Preferred language set to {lang}"}
