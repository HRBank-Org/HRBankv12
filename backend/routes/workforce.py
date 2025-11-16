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
    """Get current workforce user's profile (creates empty if doesn't exist)"""
    profile = await db.workforce_profiles.find_one(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not profile:
        # Return default empty profile
        profile = {
            "workforce_id": current_user["user_id"],
            "user_id": current_user["user_id"],
            "first_name": "",
            "last_name": "",
            "full_name": "",
            "photo_url": "",
            "phone": "",
            "address": "",
            "city": "",
            "province": "",
            "postal_code": "",
            "phone_verified": False,
            "email_verified": False
        }
    
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
    
    # Geocode address to get lat/long (optional - falls back to default if unavailable)
    if address:
        coordinates = google_maps_service.geocode_address(address)
        if coordinates:
            data["lat"] = coordinates[0]
            data["long"] = coordinates[1]
        else:
            # Use default coordinates (Toronto downtown) if geocoding fails
            # This allows profile updates even without Google Maps API
            data["lat"] = 43.6532
            data["long"] = -79.3832
            print(f"Warning: Geocoding failed for address '{address}'. Using default coordinates.")
    
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
    """
    Update availability (Step 3 of profile wizard)
    Checks for conflicts with existing shift commitments
    """
    
    availability_hours = availability_data.get("availability_hours", {})
    blackout_dates = availability_data.get("blackout_dates", [])
    
    # Check for conflicts with accepted/confirmed shifts
    conflicts = []
    accepted_bookings = await db.bookings.find({
        "workforce_id": current_user["user_id"],
        "status": {"$in": ["accepted", "confirmed", "in_progress"]}
    }).to_list(1000)
    
    if accepted_bookings:
        from datetime import datetime as dt
        for booking in accepted_bookings:
            shift_date = booking.get("shift_date")
            shift_start = booking.get("start_time")
            shift_end = booking.get("end_time")
            
            if shift_date and shift_start and shift_end:
                # Parse shift date to get day of week
                try:
                    shift_datetime = dt.fromisoformat(shift_date.replace('Z', '+00:00'))
                    day_name = shift_datetime.strftime('%A').lower()
                    
                    # Check if the shift time conflicts with new availability
                    shift_hours = []
                    start_hour = int(shift_start.split(':')[0])
                    end_hour = int(shift_end.split(':')[0])
                    
                    for hour in range(start_hour, end_hour):
                        time_slot = f"{hour:02d}:00-{(hour+1):02d}:00"
                        shift_hours.append(time_slot)
                    
                    # Check if any of the shift hours are NOT in the new availability
                    day_availability = availability_hours.get(day_name, [])
                    for shift_hour in shift_hours:
                        if shift_hour not in day_availability:
                            conflicts.append({
                                "booking_id": booking.get("booking_id"),
                                "shift_date": shift_date,
                                "shift_time": f"{shift_start} - {shift_end}",
                                "workplace": booking.get("workplace_name", "Unknown")
                            })
                            break
                except Exception as e:
                    print(f"Error checking conflict: {e}")
                    continue
    
    # If there are conflicts, return error with details
    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Cannot update availability - conflicts with accepted shifts",
                "conflicts": conflicts
            }
        )
    
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
