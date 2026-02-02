"""
Clean Calendar-Based Scheduling API
Simple, intuitive scheduling endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from auth.dependencies import get_current_user, require_role
from database import get_database
import uuid
from services.shift_notification_service import (
    notify_shift_assigned,
    notify_shift_time_changed,
    notify_employer_shift_update
)

router = APIRouter(prefix="/api/calendar", tags=["Calendar Scheduling"])

# ============== DEBUG ENDPOINT ==============

@router.get("/test-shifts")
async def test_get_shifts():
    """Test endpoint to verify shifts exist - NO AUTH"""
    db = await get_database()
    
    count = await db.shifts.count_documents({})
    sample = await db.shifts.find_one({})
    
    return {
        "success": True,
        "total_shifts": count,
        "sample_shift": {
            "position": sample.get("position_title") if sample else None,
            "workplace": sample.get("workplace_name") if sample else None,
            "start_time": sample.get("start_time") if sample else None
        } if sample else None
    }

# ============== GET SHIFTS ==============

@router.get("/shifts")
async def get_calendar_shifts(
    start_date: str,
    end_date: str,
    workplace_id: Optional[str] = None,
    current_user: dict = Depends(require_role('employer'))
):
    """Get all shifts for calendar display"""
    db = await get_database()
    
    query = {
        "employer_id": current_user["user_id"],
        "start_time": {
            "$gte": start_date,
            "$lte": end_date
        }
    }
    
    if workplace_id and workplace_id != "all":
        query["workplace_id"] = workplace_id
    
    shifts = await db.shifts.find(query).sort("start_time", 1).to_list(1000)
    
    # Calculate filled positions for each shift and remove MongoDB _id
    for shift in shifts:
        shift.pop("_id", None)  # Remove MongoDB ObjectId
        shift["positions_filled"] = len([
            w for w in shift.get("assigned_workers", [])
            if w.get("status") == "confirmed"
        ])
        shift["positions_open"] = shift.get("positions_needed", 0) - shift["positions_filled"]
    
    return {
        "success": True,
        "data": shifts
    }

# ============== CREATE SHIFT ==============

@router.post("/shifts")
async def create_calendar_shift(
    shift_data: dict,
    current_user: dict = Depends(require_role('employer'))
):
    """Create a new shift on the calendar"""
    db = await get_database()
    
    # Verify workplace exists
    workplace = await db.workplaces.find_one({
        "workplace_id": shift_data["workplace_id"],
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Calculate duration
    start = datetime.fromisoformat(shift_data["start_time"].replace('Z', '+00:00'))
    end = datetime.fromisoformat(shift_data["end_time"].replace('Z', '+00:00'))
    duration = (end - start).total_seconds() / 3600
    
    # Inherit properties from role if role_id is provided
    inherited_tasks = []
    role_hourly_rate = None
    role_id = shift_data.get("role_id")
    if role_id:
        role = await db.workplace_roles.find_one({
            "role_id": role_id,
            "employer_id": current_user["user_id"]
        }, {"_id": 0, "generic_tasks": 1, "hourly_rate": 1, "pay_rate": 1})
        
        if role:
            # Get role rate
            role_hourly_rate = role.get("hourly_rate") or role.get("pay_rate")
            
            # Validate shift rate is not less than role rate
            shift_rate = shift_data.get("hourly_rate")
            if shift_rate and role_hourly_rate:
                if float(shift_rate) < float(role_hourly_rate):
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Shift rate (${shift_rate}) cannot be less than role rate (${role_hourly_rate}). Shift rates can only be used for incentive premiums."
                    )
            
            # If no shift rate provided, inherit from role
            if not shift_rate and role_hourly_rate:
                shift_data["hourly_rate"] = role_hourly_rate
            
            # Get inherited tasks
            if role.get("generic_tasks"):
                # Convert generic_tasks to simple task names for standard_tasks
                inherited_tasks = [
                    task["task_name"] if isinstance(task, dict) else task 
                    for task in role.get("generic_tasks", [])
                ]
    
    # Merge inherited tasks with provided standard_tasks
    all_standard_tasks = list(set(inherited_tasks + shift_data.get("standard_tasks", [])))
    
    # Get work_type from role if exists
    work_type = shift_data.get("shift_type", "on_site")
    if role:
        work_type = role.get("work_type", work_type)
    
    # Create shift
    shift = {
        "shift_id": str(uuid.uuid4()),
        "employer_id": current_user["user_id"],
        "workplace_id": shift_data["workplace_id"],
        "workplace_name": workplace.get("workplace_name", ""),
        "start_time": shift_data["start_time"],
        "end_time": shift_data["end_time"],
        "duration_hours": duration,
        "position_title": shift_data["position_title"],
        "positions_needed": shift_data.get("positions_needed", 1),
        "assigned_workers": [],
        "required_skills": shift_data.get("required_skills", []),
        "required_certifications": shift_data.get("required_certifications", []),
        "notes": shift_data.get("notes"),
        "hourly_rate": shift_data.get("hourly_rate"),
        "is_recurring": shift_data.get("is_recurring", False),
        "recurrence_rule": shift_data.get("recurrence_rule"),
        "recurrence_end_date": shift_data.get("recurrence_end_date"),
        "parent_shift_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"],
        "color": shift_data.get("color"),
        "standard_tasks": all_standard_tasks,  # Includes inherited + custom
        "custom_tasks": shift_data.get("custom_tasks", []),  # Additional shift-specific tasks
        "role_id": role_id,
        "date": shift_data["start_time"][:10] if shift_data.get("start_time") else datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        "source": "calendar",  # Mark as calendar-sourced shift
        "work_type": work_type,
        "shift_type": work_type,
        # Deliverables for remote work
        "deliverables": shift_data.get("deliverables", []) if work_type == "remote" else [],
        "total_deliverables": len(shift_data.get("deliverables", [])) if work_type == "remote" else 0,
        "completed_deliverables": 0,
        "approved_deliverables": 0,
        # Remote attendance tracking (manual time, no GPS)
        "attendance_type": "manual" if work_type == "remote" else "gps"
    }
    
    await db.shifts.insert_one(shift)
    
    # If recurring, create future shifts
    if shift["is_recurring"] and shift["recurrence_rule"]:
        await create_recurring_shifts(db, shift, current_user["user_id"])
    
    return {
        "success": True,
        "data": shift,
        "message": "Shift created successfully"
    }

async def create_recurring_shifts(db, base_shift, employer_id):
    """Create recurring shift instances"""
    recurrence_rule = base_shift["recurrence_rule"]
    start = datetime.fromisoformat(base_shift["start_time"].replace('Z', '+00:00'))
    end_date_str = base_shift.get("recurrence_end_date")
    
    if not end_date_str:
        # Default to 3 months
        end_date = start + timedelta(days=90)
    else:
        end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
    
    duration = datetime.fromisoformat(base_shift["end_time"].replace('Z', '+00:00')) - start
    
    recurring_shifts = []
    current = start
    
    # Determine increment
    if recurrence_rule == "daily":
        increment = timedelta(days=1)
    elif recurrence_rule == "weekly":
        increment = timedelta(weeks=1)
    elif recurrence_rule == "monthly":
        increment = timedelta(days=30)
    else:
        return
    
    # Skip first (already created)
    current += increment
    
    while current <= end_date and len(recurring_shifts) < 100:  # Safety limit
        new_shift = base_shift.copy()
        new_shift["shift_id"] = str(uuid.uuid4())
        new_shift["start_time"] = current.isoformat()
        new_shift["end_time"] = (current + duration).isoformat()
        new_shift["parent_shift_id"] = base_shift["shift_id"]
        new_shift.pop("_id", None)
        
        recurring_shifts.append(new_shift)
        current += increment
    
    if recurring_shifts:
        await db.shifts.insert_many(recurring_shifts)

# ============== UPDATE SHIFT ==============

@router.patch("/shifts/{shift_id}")
async def update_calendar_shift(
    shift_id: str,
    updates: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role('employer'))
):
    """Update a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if time is changing and shift has assigned workers
    time_changed = ("start_time" in updates or "end_time" in updates)
    assigned_workers = shift.get("assigned_workers", [])
    
    # Update allowed fields
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    allowed = ["start_time", "end_time", "position_title", "positions_needed", 
               "notes", "hourly_rate", "required_skills", "required_certifications"]
    
    for field in allowed:
        if field in updates:
            update_data[field] = updates[field]
    
    # Recalculate duration if times changed
    if time_changed:
        start = datetime.fromisoformat(updates.get("start_time", shift["start_time"]).replace('Z', '+00:00'))
        end = datetime.fromisoformat(updates.get("end_time", shift["end_time"]).replace('Z', '+00:00'))
        update_data["duration_hours"] = (end - start).total_seconds() / 3600
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
    )
    
    # Notify affected workers if time changed
    if time_changed and assigned_workers:
        # Get worker details from database
        worker_ids = [w["worker_id"] for w in assigned_workers]
        workers_data = await db.workforce_users.find(
            {"user_id": {"$in": worker_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
        ).to_list(100)
        
        # Merge worker details with assignments
        workers_to_notify = []
        for worker_data in workers_data:
            # Find corresponding assignment
            assignment = next((w for w in assigned_workers if w["worker_id"] == worker_data["user_id"]), None)
            if assignment:
                workers_to_notify.append({
                    "worker_name": f"{worker_data.get('first_name', '')} {worker_data.get('last_name', '')}".strip() or assignment.get("worker_name", "Worker"),
                    "worker_email": worker_data.get("email"),
                    "worker_phone": worker_data.get("phone_number")
                })
        
        # Create old and new shift data for notification
        old_shift_data = shift.copy()
        new_shift_data = shift.copy()
        new_shift_data.update(update_data)
        
        # Send notifications in background
        background_tasks.add_task(
            notify_shift_time_changed,
            affected_workers=workers_to_notify,
            old_shift=old_shift_data,
            new_shift=new_shift_data
        )
    
    return {
        "success": True,
        "message": "Shift updated successfully"
    }

# ============== DELETE SHIFT ==============

@router.delete("/shifts/{shift_id}")
async def delete_calendar_shift(
    shift_id: str,
    delete_series: bool = False,
    current_user: dict = Depends(require_role('employer'))
):
    """Delete a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if delete_series and shift.get("parent_shift_id"):
        # Delete all in series
        await db.shifts.delete_many({
            "$or": [
                {"shift_id": shift["parent_shift_id"]},
                {"parent_shift_id": shift["parent_shift_id"]}
            ],
            "employer_id": current_user["user_id"]
        })
    else:
        # Delete just this shift
        await db.shifts.delete_one({"shift_id": shift_id})
    
    return {
        "success": True,
        "message": "Shift deleted successfully"
    }

# ============== WORKER ASSIGNMENT ==============

@router.get("/shifts/{shift_id}/available-workers")
async def get_available_workers(
    shift_id: str,
    current_user: dict = Depends(require_role('employer'))
):
    """Get available workers for a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get active workforce
    workforce = await db.workforce_profiles.find({
        "profile_status": "active"
    }).to_list(500)
    
    available_workers = []
    
    for profile in workforce:
        user = await db.users.find_one({"user_id": profile["user_id"]})
        if not user:
            continue
        
        # Check if already assigned
        already_assigned = any(
            w.get("worker_id") == profile["user_id"]
            for w in shift.get("assigned_workers", [])
        )
        
        if already_assigned:
            continue
        
        # Get occupations and skills
        occupations = await db.occupation_profiles.find({
            "user_id": profile["user_id"],
            "active": True
        }).to_list(10)
        
        positions = [occ.get("occupation_title", "") for occ in occupations]
        all_skills = set()
        all_certs = []
        
        for occ in occupations:
            all_skills.update(occ.get("skills", []))
            creds = occ.get("credential_details", [])
            all_certs.extend([
                c.get("credential_name") for c in creds
                if c.get("status") == "verified"
            ])
        
        # Simple match score
        required_skills = set(shift.get("required_skills", []))
        required_certs = set(shift.get("required_certifications", []))
        
        skill_match = len(required_skills.intersection(all_skills))
        cert_match = len(required_certs.intersection(all_certs))
        
        skill_score = (skill_match / len(required_skills) * 50) if required_skills else 50
        cert_score = (cert_match / len(required_certs) * 50) if required_certs else 50
        match_score = skill_score + cert_score
        
        available_workers.append({
            "worker_id": profile["user_id"],
            "worker_name": user.get("full_name", "Unknown"),
            "worker_photo": profile.get("profile_photo_url"),
            "positions": positions,
            "skills": list(all_skills),
            "certifications": all_certs,
            "is_available": True,
            "match_score": round(match_score, 1)
        })
    
    # Sort by match score
    available_workers.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "success": True,
        "data": available_workers
    }

@router.post("/shifts/{shift_id}/assign")
async def assign_worker(
    shift_id: str,
    assignment_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role('employer'))
):
    """Assign a worker to a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if already at capacity
    assigned = shift.get("assigned_workers", [])
    confirmed = [w for w in assigned if w.get("status") == "confirmed"]
    
    if len(confirmed) >= shift.get("positions_needed", 0):
        raise HTTPException(status_code=400, detail="Shift is already fully staffed")
    
    # Check if worker already assigned
    if any(w.get("worker_id") == assignment_data["worker_id"] for w in assigned):
        raise HTTPException(status_code=400, detail="Worker already assigned")
    
    # Get worker details for notification
    worker = await db.workforce_users.find_one(
        {"user_id": assignment_data["worker_id"]},
        {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
    )
    
    # Get employer details
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "company_name": 1, "email": 1, "phone_number": 1}
    )
    
    # Create assignment
    assignment = {
        "worker_id": assignment_data["worker_id"],
        "worker_name": assignment_data["worker_name"],
        "worker_email": worker.get("email") if worker else None,
        "worker_photo": assignment_data.get("worker_photo"),
        "position": shift["position_title"],
        "status": "confirmed",
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update shift
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$push": {"assigned_workers": assignment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Send notifications to worker in background
    if worker:
        shift_details = {
            'position': shift.get('position_title', 'N/A'),
            'date': datetime.fromisoformat(shift['start_time'].replace('Z', '+00:00')).strftime('%B %d, %Y'),
            'time': f"{datetime.fromisoformat(shift['start_time'].replace('Z', '+00:00')).strftime('%I:%M %p')} - {datetime.fromisoformat(shift['end_time'].replace('Z', '+00:00')).strftime('%I:%M %p')}",
            'location': shift.get('workplace_name', 'N/A'),
            'rate': shift.get('hourly_rate', 0)
        }
        
        worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or assignment_data["worker_name"]
        
        background_tasks.add_task(
            notify_shift_assigned,
            worker_email=worker.get('email'),
            worker_phone=worker.get('phone_number'),
            worker_name=worker_name,
            shift_details=shift_details,
            employer_name=employer.get('company_name', 'Employer') if employer else 'Employer',
            worker_id=assignment_data["worker_id"]
        )
        
        # Notify employer if shift is now full
        if len(confirmed) + 1 >= shift.get("positions_needed", 0):
            background_tasks.add_task(
                notify_employer_shift_update,
                employer_email=employer.get('email') if employer else None,
                employer_phone=employer.get('phone_number') if employer else None,
                employer_name=employer.get('company_name', 'Employer') if employer else 'Employer',
                update_type="shift_full",
                shift_details=shift_details
            )
    
    return {
        "success": True,
        "data": assignment,
        "message": "Worker assigned successfully"
    }


# ============== CONTINENTAL SHIFT PATTERNS ==============

CONTINENTAL_PATTERNS = {
    "dupont": {
        "name": "DuPont",
        "cycle_days": 28,
        "pattern": [
            # Week 1: Day, Day, Night, Night, Off, Off, Off
            {"day": 0, "shift": "day"}, {"day": 1, "shift": "day"},
            {"day": 2, "shift": "night"}, {"day": 3, "shift": "night"},
            {"day": 4, "shift": "off"}, {"day": 5, "shift": "off"}, {"day": 6, "shift": "off"},
            # Week 2: Off, Off, Day, Day, Night, Night, Night
            {"day": 7, "shift": "off"}, {"day": 8, "shift": "off"},
            {"day": 9, "shift": "day"}, {"day": 10, "shift": "day"},
            {"day": 11, "shift": "night"}, {"day": 12, "shift": "night"}, {"day": 13, "shift": "night"},
            # Week 3: Off, Off, Off, Day, Day, Night, Night
            {"day": 14, "shift": "off"}, {"day": 15, "shift": "off"}, {"day": 16, "shift": "off"},
            {"day": 17, "shift": "day"}, {"day": 18, "shift": "day"},
            {"day": 19, "shift": "night"}, {"day": 20, "shift": "night"},
            # Week 4: Off, Off, Off, Off, Day, Day, Day
            {"day": 21, "shift": "off"}, {"day": 22, "shift": "off"},
            {"day": 23, "shift": "off"}, {"day": 24, "shift": "off"},
            {"day": 25, "shift": "day"}, {"day": 26, "shift": "day"}, {"day": 27, "shift": "day"},
        ]
    },
    "panama": {
        "name": "Panama (2-2-3)",
        "cycle_days": 14,
        "pattern": [
            # Week 1
            {"day": 0, "shift": "day"}, {"day": 1, "shift": "day"},
            {"day": 2, "shift": "off"}, {"day": 3, "shift": "off"},
            {"day": 4, "shift": "day"}, {"day": 5, "shift": "day"}, {"day": 6, "shift": "day"},
            # Week 2
            {"day": 7, "shift": "off"}, {"day": 8, "shift": "off"},
            {"day": 9, "shift": "night"}, {"day": 10, "shift": "night"},
            {"day": 11, "shift": "off"}, {"day": 12, "shift": "off"}, {"day": 13, "shift": "off"},
        ]
    },
    "pitman": {
        "name": "Pitman (2-3-2)",
        "cycle_days": 14,
        "pattern": [
            # Week 1: 2 on, 2 off, 3 on
            {"day": 0, "shift": "day"}, {"day": 1, "shift": "day"},
            {"day": 2, "shift": "off"}, {"day": 3, "shift": "off"},
            {"day": 4, "shift": "day"}, {"day": 5, "shift": "day"}, {"day": 6, "shift": "day"},
            # Week 2: 2 off, 2 on, 3 off
            {"day": 7, "shift": "off"}, {"day": 8, "shift": "off"},
            {"day": 9, "shift": "night"}, {"day": 10, "shift": "night"},
            {"day": 11, "shift": "off"}, {"day": 12, "shift": "off"}, {"day": 13, "shift": "off"},
        ]
    }
}


@router.post("/continental-pattern")
async def create_continental_pattern(
    pattern_data: dict,
    current_user: dict = Depends(require_role('employer'))
):
    """
    Generate continental shift pattern for multiple weeks.
    Creates 12-hour rotating shifts with proper coverage.
    """
    db = await get_database()
    
    # Validate workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": pattern_data["workplace_id"],
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Get pattern configuration
    pattern_id = pattern_data.get("pattern", "dupont")
    pattern_config = CONTINENTAL_PATTERNS.get(pattern_id)
    
    if not pattern_config:
        raise HTTPException(status_code=400, detail=f"Unknown pattern: {pattern_id}")
    
    # Parse shift times
    day_shift = pattern_data.get("day_shift", {"start": "06:00", "end": "18:00"})
    night_shift = pattern_data.get("night_shift", {"start": "18:00", "end": "06:00"})
    
    # Parse start date
    start_date = datetime.strptime(pattern_data["start_date"], "%Y-%m-%d")
    generate_weeks = int(pattern_data.get("generate_weeks", 4))
    rotation_groups = int(pattern_data.get("rotation_groups", 4))
    positions_per_shift = int(pattern_data.get("positions_per_shift", 1))
    
    # Generate shifts
    shifts_created = []
    cycle_days = pattern_config["cycle_days"]
    pattern = pattern_config["pattern"]
    
    total_days = generate_weeks * 7
    
    for group_num in range(rotation_groups):
        # Each group starts at a different offset in the pattern
        group_offset = (group_num * cycle_days) // rotation_groups
        group_label = chr(65 + group_num)  # A, B, C, D
        
        for day_offset in range(total_days):
            # Find which pattern day this corresponds to
            pattern_day_index = (day_offset + group_offset) % cycle_days
            
            # Find the pattern entry for this day
            pattern_entry = None
            for p in pattern:
                if p["day"] == pattern_day_index:
                    pattern_entry = p
                    break
            
            if not pattern_entry or pattern_entry["shift"] == "off":
                continue
            
            # Calculate actual date
            shift_date = start_date + timedelta(days=day_offset)
            
            # Determine shift times
            if pattern_entry["shift"] == "day":
                shift_start = f"{shift_date.strftime('%Y-%m-%d')}T{day_shift['start']}:00"
                shift_end = f"{shift_date.strftime('%Y-%m-%d')}T{day_shift['end']}:00"
                shift_type = "day"
            else:  # night
                shift_start = f"{shift_date.strftime('%Y-%m-%d')}T{night_shift['start']}:00"
                # Night shift ends next day
                next_day = shift_date + timedelta(days=1)
                shift_end = f"{next_day.strftime('%Y-%m-%d')}T{night_shift['end']}:00"
                shift_type = "night"
            
            # Create shift
            shift = {
                "shift_id": str(uuid.uuid4()),
                "employer_id": current_user["user_id"],
                "workplace_id": pattern_data["workplace_id"],
                "workplace_name": workplace.get("workplace_name", ""),
                "position_title": pattern_data.get("position_title", "Continental Shift"),
                "start_time": shift_start,
                "end_time": shift_end,
                "duration_hours": 12,
                "positions_needed": positions_per_shift,
                "assigned_workers": [],
                "hourly_rate": pattern_data.get("hourly_rate"),
                "notes": pattern_data.get("notes", ""),
                "shift_type": "continental",
                "continental_pattern": pattern_id,
                "rotation_group": group_label,
                "day_night": shift_type,
                "is_recurring": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user["user_id"],
                "date": shift_date.strftime('%Y-%m-%d')
            }
            
            shifts_created.append(shift)
    
    # Bulk insert all shifts
    if shifts_created:
        await db.shifts.insert_many(shifts_created)
    
    # Group summary for response
    summary = {
        "total_shifts": len(shifts_created),
        "pattern": pattern_config["name"],
        "start_date": start_date.strftime('%Y-%m-%d'),
        "end_date": (start_date + timedelta(days=total_days - 1)).strftime('%Y-%m-%d'),
        "weeks": generate_weeks,
        "rotation_groups": rotation_groups,
        "day_shifts": len([s for s in shifts_created if s["day_night"] == "day"]),
        "night_shifts": len([s for s in shifts_created if s["day_night"] == "night"]),
    }
    
    return {
        "success": True,
        "data": summary,
        "message": f"Generated {len(shifts_created)} continental shifts using {pattern_config['name']} pattern"
    }


@router.delete("/shifts/{shift_id}/unassign/{worker_id}")
async def unassign_worker(
    shift_id: str,
    worker_id: str,
    current_user: dict = Depends(require_role('employer'))
):
    """Remove a worker from a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Remove worker
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$pull": {"assigned_workers": {"worker_id": worker_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "success": True,
        "message": "Worker unassigned successfully"
    }



# ============== DELIVERABLES MANAGEMENT (REMOTE SHIFTS) ==============

@router.post("/shifts/{shift_id}/deliverables")
async def add_deliverable_to_shift(
    shift_id: str,
    deliverable_data: dict,
    current_user: dict = Depends(require_role('employer'))
):
    """Add a deliverable to a remote shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if shift.get("work_type") != "remote":
        raise HTTPException(status_code=400, detail="Deliverables only supported for remote shifts")
    
    import uuid as uuid_lib
    deliverable = {
        "deliverable_id": f"del_{uuid_lib.uuid4().hex[:12]}",
        "title": deliverable_data.get("title"),
        "description": deliverable_data.get("description"),
        "due_date": deliverable_data.get("due_date"),
        "estimated_hours": deliverable_data.get("estimated_hours", 0),
        "priority": deliverable_data.get("priority", "medium"),
        "status": "pending",
        "actual_hours": None,
        "submission_notes": None,
        "submitted_at": None,
        "reviewed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$push": {"deliverables": deliverable},
            "$inc": {"total_deliverables": 1},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "success": True,
        "data": deliverable,
        "message": "Deliverable added"
    }


@router.put("/shifts/{shift_id}/deliverables/{deliverable_id}")
async def update_deliverable(
    shift_id: str,
    deliverable_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a deliverable (worker submits, employer reviews)"""
    db = await get_database()
    
    shift = await db.shifts.find_one({"shift_id": shift_id}, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type")
    
    # Authorization
    if user_type == "employer" and shift.get("employer_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_type == "workforce":
        assigned = any(
            (w.get("worker_id") == user_id if isinstance(w, dict) else w == user_id)
            for w in shift.get("assigned_workers", [])
        )
        if not assigned:
            raise HTTPException(status_code=403, detail="Not assigned to this shift")
    
    # Find and update deliverable
    deliverables = shift.get("deliverables", [])
    found = False
    for i, d in enumerate(deliverables):
        if d.get("deliverable_id") == deliverable_id:
            # Worker can submit, employer can approve/reject
            if user_type == "workforce":
                if update_data.get("status") == "submitted":
                    deliverables[i]["status"] = "submitted"
                    deliverables[i]["submitted_at"] = datetime.now(timezone.utc).isoformat()
                if update_data.get("actual_hours"):
                    deliverables[i]["actual_hours"] = update_data["actual_hours"]
                if update_data.get("submission_notes"):
                    deliverables[i]["submission_notes"] = update_data["submission_notes"]
            else:
                # Employer can update any field
                for key in ["status", "title", "description", "due_date", "priority", "reviewer_notes"]:
                    if key in update_data:
                        deliverables[i][key] = update_data[key]
                if update_data.get("status") in ["approved", "rejected"]:
                    deliverables[i]["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    # Recalculate counts
    completed = len([d for d in deliverables if d.get("status") in ["submitted", "approved"]])
    approved = len([d for d in deliverables if d.get("status") == "approved"])
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$set": {
                "deliverables": deliverables,
                "completed_deliverables": completed,
                "approved_deliverables": approved,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "data": deliverables[i] if found else None,
        "message": "Deliverable updated"
    }


@router.get("/shifts/{shift_id}/deliverables")
async def get_shift_deliverables(
    shift_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all deliverables for a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({"shift_id": shift_id}, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type")
    
    # Authorization check
    if user_type == "employer" and shift.get("employer_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "success": True,
        "data": {
            "deliverables": shift.get("deliverables", []),
            "total": shift.get("total_deliverables", 0),
            "completed": shift.get("completed_deliverables", 0),
            "approved": shift.get("approved_deliverables", 0)
        }
    }
