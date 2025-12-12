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
    
    # Parse the date
    try:
        target_date = dt.strptime(date, '%Y-%m-%d')
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Find all shifts for this date
    shifts = await db.calendar_shifts.find({
        "worker_id": current_user["user_id"],
        "date": {
            "$gte": start_of_day.isoformat(),
            "$lte": end_of_day.isoformat()
        }
    }, {"_id": 0, "shift_id": 1}).to_list(1000)
    
    shift_ids = [s["shift_id"] for s in shifts]
    
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
