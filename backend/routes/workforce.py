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
    
    # Update or create profile
    data["workforce_id"] = current_user["user_id"]
    data["user_id"] = current_user["user_id"]
    data["updated_date"] = datetime.utcnow().isoformat()
    
    # Check if profile exists
    existing_profile = await db.workforce_profiles.find_one({"workforce_id": current_user["user_id"]})
    
    if existing_profile:
        # Update existing
        result = await db.workforce_profiles.update_one(
            {"workforce_id": current_user["user_id"]},
            {"$set": data}
        )
    else:
        # Create new
        data["created_date"] = datetime.utcnow().isoformat()
        await db.workforce_profiles.insert_one(data)
    
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
    Supports both legacy format (availability_hours) and new simple format (availability_simple)
    """
    
    availability_hours = availability_data.get("availability_hours", {})
    availability_simple = availability_data.get("availability_simple", None)
    blackout_dates = availability_data.get("blackout_dates", [])
    
    # Build update object
    update_data = {
        "availability_hours": availability_hours,
        "blackout_dates": blackout_dates,
        "updated_date": datetime.utcnow().isoformat()
    }
    
    # Add simple format if provided
    if availability_simple:
        update_data["availability_simple"] = availability_simple
    
    # Check for conflicts with accepted/confirmed shifts (simplified check)
    conflicts = []
    accepted_bookings = await db.bookings.find({
        "workforce_id": current_user["user_id"],
        "status": {"$in": ["accepted", "confirmed", "in_progress"]}
    }).to_list(1000)
    
    if accepted_bookings and availability_simple:
        from datetime import datetime as dt
        available_days = availability_simple.get("days", [])
        available_periods = availability_simple.get("periods", [])
        
        # Define period time ranges
        period_ranges = {
            "morning": (6, 12),
            "afternoon": (12, 18),
            "evening": (18, 24),
            "overnight": (0, 6)
        }
        
        for booking in accepted_bookings:
            shift_date = booking.get("shift_date")
            shift_start = booking.get("start_time")
            
            if shift_date and shift_start:
                try:
                    shift_datetime = dt.fromisoformat(shift_date.replace('Z', '+00:00'))
                    day_name = shift_datetime.strftime('%A').lower()
                    start_hour = int(shift_start.split(':')[0])
                    
                    # Check if day is available
                    if day_name not in available_days:
                        conflicts.append({
                            "booking_id": booking.get("booking_id"),
                            "shift_date": shift_date,
                            "shift_time": shift_start,
                            "workplace": booking.get("workplace_name", "Unknown"),
                            "reason": f"{day_name.capitalize()} is no longer available"
                        })
                        continue
                    
                    # Check if time period is available
                    shift_in_period = False
                    for period_id in available_periods:
                        period_start, period_end = period_ranges.get(period_id, (0, 24))
                        if period_start <= start_hour < period_end:
                            shift_in_period = True
                            break
                    
                    if not shift_in_period:
                        conflicts.append({
                            "booking_id": booking.get("booking_id"),
                            "shift_date": shift_date,
                            "shift_time": shift_start,
                            "workplace": booking.get("workplace_name", "Unknown"),
                            "reason": f"Shift at {shift_start} is outside your available time periods"
                        })
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
        {"$set": update_data}
    )
    
    # Recalculate completeness
    profile = await db.workforce_profiles.find_one({"workforce_id": current_user["user_id"]})
    has_availability = bool(availability_hours) or bool(availability_simple)
    completeness = calculate_profile_completeness(
        has_personal_info=bool(profile.get("address")),
        has_skills=len(profile.get("skills", [])) >= 3,
        has_availability=has_availability,
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

@router.get("/my-shifts", response_model=Dict)
async def get_my_shifts(
    date: Optional[str] = None,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get worker's shifts for a specific date with tasks"""
    from datetime import datetime as dt
    
    if not date:
        date = dt.utcnow().strftime('%Y-%m-%d')
    
    # Find shifts for this worker on this date (date field is stored as YYYY-MM-DD string)
    shifts = await db.calendar_shifts.find({
        "worker_id": current_user["user_id"],
        "date": date
    }, {"_id": 0}).to_list(1000)
    
    # Enrich shifts with workplace and role information
    for shift in shifts:
        if shift.get("workplace_id"):
            workplace = await db.workplaces.find_one(
                {"workplace_id": shift["workplace_id"]},
                {"_id": 0, "name": 1}
            )
            if workplace:
                shift["workplace_name"] = workplace.get("name", "Unknown")
        
        if shift.get("role_id"):
            role = await db.workplace_roles.find_one(
                {"role_id": shift["role_id"]},
                {"_id": 0, "position_title": 1}
            )
            if role:
                shift["position_title"] = role.get("position_title", "Unknown")
    
    return {
        "success": True,
        "data": {"shifts": shifts}
    }

@router.get("/task-completions", response_model=Dict)
async def get_task_completions(
    date: Optional[str] = None,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Get task completions for a specific date"""
    from datetime import datetime as dt
    
    if not date:
        date = dt.utcnow().strftime('%Y-%m-%d')
    
    # Find all shifts for this date (date field is stored as YYYY-MM-DD string)
    shifts = await db.calendar_shifts.find({
        "worker_id": current_user["user_id"],
        "date": date
    }, {"_id": 0, "shift_id": 1}).to_list(1000)
    
    shift_ids = [s["shift_id"] for s in shifts]
    
    if not shift_ids:
        return {
            "success": True,
            "data": {"completions": []}
        }
    
    # Get all task completions for these shifts
    completions = await db.task_completions.find({
        "worker_id": current_user["user_id"],
        "shift_id": {"$in": shift_ids}
    }, {"_id": 0}).to_list(1000)
    
    return {
        "success": True,
        "data": {"completions": completions}
    }

@router.post("/task-completions", response_model=Dict)
async def complete_task(
    data: dict,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Mark a task as completed"""
    from datetime import datetime, timezone
    
    shift_id = data.get("shift_id")
    task_text = data.get("task_text")
    task_type = data.get("task_type", "standard")
    
    if not shift_id or not task_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="shift_id and task_text are required"
        )
    
    # Verify the shift belongs to this worker
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "worker_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found or does not belong to you"
        )
    
    # Create task completion record
    completion_id = f"tc_{uuid.uuid4().hex[:12]}"
    completion = {
        "task_completion_id": completion_id,
        "worker_id": current_user["user_id"],
        "shift_id": shift_id,
        "task_text": task_text,
        "task_type": task_type,
        "completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.task_completions.insert_one(completion)
    
    # Return completion without MongoDB _id
    return {
        "success": True,
        "data": {
            "completion": {
                "task_completion_id": completion_id,
                "worker_id": current_user["user_id"],
                "shift_id": shift_id,
                "task_text": task_text,
                "task_type": task_type,
                "completed": True,
                "completed_at": completion["completed_at"]
            }
        },
        "message": "Task marked as complete"
    }

@router.delete("/task-completions/{completion_id}", response_model=Dict)
async def uncomplete_task(
    completion_id: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """Remove task completion (uncheck task)"""
    
    # Verify the completion belongs to this worker
    completion = await db.task_completions.find_one({
        "task_completion_id": completion_id,
        "worker_id": current_user["user_id"]
    })
    
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task completion not found"
        )
    
    # Delete the completion
    await db.task_completions.delete_one({"task_completion_id": completion_id})
    
    return {
        "success": True,
        "message": "Task unmarked"
    }
