from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from utils.google_maps import google_maps_service
from utils.calculations import calculate_profile_completeness
from typing import Dict, List, Optional
from datetime import datetime
import uuid
import os

router = APIRouter(prefix="/workforce", tags=["Workforce"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.get("/me/profile", response_model=Dict)
async def get_my_profile(
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get current workforce user's profile"""
    profile = await db.workforce_profiles.find_one(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return {
        "success": True,
        "data": profile
    }

@router.patch("/me/profile/personal-info", response_model=Dict)
async def update_personal_info(
    data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Update personal information (Step 1 of profile wizard)
    Includes Google Maps geocoding for address
    """
    address = data.get("address")
    
    # Geocode address to get lat/long
    if address:
        coordinates = google_maps_service.geocode_address(address)
        if coordinates:
            data["lat"] = coordinates[0]
            data["long"] = coordinates[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to geocode address. Please check the address."
            )
    
    # Update profile
    data["updated_date"] = datetime.utcnow().isoformat()
    
    result = await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": data}
    )
    
    # Recalculate profile completeness
    profile = await db.workforce_profiles.find_one({"workforce_id": current_user["user_id"]})
    completeness = calculate_profile_completeness(
        has_personal_info=bool(profile.get("address") and profile.get("postal_code")),
        has_skills=len(profile.get("skills", [])) >= 3,
        has_availability=bool(profile.get("availability_hours")),
        has_documents=len(profile.get("document_uploads", [])) > 0,
        has_credentials=False  # Will check credentials collection
    )
    
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": {"profile_completeness": completeness}}
    )
    
    return {
        "success": True,
        "data": {
            "profile_completeness": completeness
        },
        "message": "Personal information updated"
    }

@router.patch("/me/profile/skills", response_model=Dict)
async def update_skills(
    skills: List[str],
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Update skills (Step 2 of profile wizard)"""
    
    if len(skills) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least 3 skills"
        )
    
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": {"skills": skills, "updated_date": datetime.utcnow().isoformat()}}
    )
    
    # Recalculate completeness
    profile = await db.workforce_profiles.find_one({"workforce_id": current_user["user_id"]})
    completeness = calculate_profile_completeness(
        has_personal_info=bool(profile.get("address")),
        has_skills=len(skills) >= 3,
        has_availability=bool(profile.get("availability_hours")),
        has_documents=len(profile.get("document_uploads", [])) > 0,
        has_credentials=False
    )
    
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": {"profile_completeness": completeness}}
    )
    
    return {
        "success": True,
        "data": {"profile_completeness": completeness},
        "message": "Skills updated"
    }

@router.patch("/me/profile/availability", response_model=Dict)
async def update_availability(
    availability_data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Update availability (Step 3 of profile wizard)"""
    
    availability_hours = availability_data.get("availability_hours", {})
    blackout_dates = availability_data.get("blackout_dates", [])
    
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": {
            "availability_hours": availability_hours,
            "blackout_dates": blackout_dates,
            "updated_date": datetime.utcnow().isoformat()
        }}
    )
    
    # Recalculate completeness
    profile = await db.workforce_profiles.find_one({"workforce_id": current_user["user_id"]})
    completeness = calculate_profile_completeness(
        has_personal_info=bool(profile.get("address")),
        has_skills=len(profile.get("skills", [])) >= 3,
        has_availability=bool(availability_hours),
        has_documents=len(profile.get("document_uploads", [])) > 0,
        has_credentials=False
    )
    
    await db.workforce_profiles.update_one(
        {"workforce_id": current_user["user_id"]},
        {"$set": {"profile_completeness": completeness}}
    )
    
    return {
        "success": True,
        "data": {"profile_completeness": completeness},
        "message": "Availability updated"
    }

@router.get("/skills/common", response_model=Dict)
async def get_common_skills(db = Depends(get_db)):
    """Get list of common skills for selection"""
    skills = await db.common_skills.find({}, {"_id": 0}).to_list(100)
    skill_names = [s["skill_name"] for s in skills]
    
    return {
        "success": True,
        "data": {"skills": skill_names}
    }
