"""
Clean Calendar-Based Scheduling API
Simple, intuitive scheduling endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from auth.dependencies import get_current_user, require_role
from database import get_database
import uuid

router = APIRouter(prefix="/api/calendar", tags=["Calendar Scheduling"])

# ============== DEBUG ENDPOINT ==============

@router.get("/test-shifts")
async def test_get_shifts():
    """Test endpoint to verify shifts exist - NO AUTH"""
    db = await get_database()
    
    count = await db.calendar_shifts.count_documents({})
    sample = await db.calendar_shifts.find_one({})
    
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
    
    shifts = await db.calendar_shifts.find(query).sort("start_time", 1).to_list(1000)
    
    # Calculate filled positions for each shift
    for shift in shifts:
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
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "created_by": current_user["user_id"],
        "color": shift_data.get("color")
    }
    
    await db.calendar_shifts.insert_one(shift)
    
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
        await db.calendar_shifts.insert_many(recurring_shifts)

# ============== UPDATE SHIFT ==============

@router.patch("/shifts/{shift_id}")
async def update_calendar_shift(
    shift_id: str,
    updates: dict,
    current_user: dict = Depends(require_role('employer'))
):
    """Update a shift"""
    db = await get_database()
    
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Update allowed fields
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    
    allowed = ["start_time", "end_time", "position_title", "positions_needed", 
               "notes", "hourly_rate", "required_skills", "required_certifications"]
    
    for field in allowed:
        if field in updates:
            update_data[field] = updates[field]
    
    # Recalculate duration if times changed
    if "start_time" in updates or "end_time" in updates:
        start = datetime.fromisoformat(updates.get("start_time", shift["start_time"]).replace('Z', '+00:00'))
        end = datetime.fromisoformat(updates.get("end_time", shift["end_time"]).replace('Z', '+00:00'))
        update_data["duration_hours"] = (end - start).total_seconds() / 3600
    
    await db.calendar_shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
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
    
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if delete_series and shift.get("parent_shift_id"):
        # Delete all in series
        await db.calendar_shifts.delete_many({
            "$or": [
                {"shift_id": shift["parent_shift_id"]},
                {"parent_shift_id": shift["parent_shift_id"]}
            ],
            "employer_id": current_user["user_id"]
        })
    else:
        # Delete just this shift
        await db.calendar_shifts.delete_one({"shift_id": shift_id})
    
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
    
    shift = await db.calendar_shifts.find_one({
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
    current_user: dict = Depends(require_role('employer'))
):
    """Assign a worker to a shift"""
    db = await get_database()
    
    shift = await db.calendar_shifts.find_one({
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
    
    # Create assignment
    assignment = {
        "worker_id": assignment_data["worker_id"],
        "worker_name": assignment_data["worker_name"],
        "worker_photo": assignment_data.get("worker_photo"),
        "position": shift["position_title"],
        "status": "confirmed",
        "assigned_at": datetime.utcnow().isoformat()
    }
    
    # Update shift
    await db.calendar_shifts.update_one(
        {"shift_id": shift_id},
        {
            "$push": {"assigned_workers": assignment},
            "$set": {"updated_at": datetime.utcnow().isoformat()}
        }
    )
    
    return {
        "success": True,
        "data": assignment,
        "message": "Worker assigned successfully"
    }

@router.delete("/shifts/{shift_id}/unassign/{worker_id}")
async def unassign_worker(
    shift_id: str,
    worker_id: str,
    current_user: dict = Depends(require_role('employer'))
):
    """Remove a worker from a shift"""
    db = await get_database()
    
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Remove worker
    await db.calendar_shifts.update_one(
        {"shift_id": shift_id},
        {
            "$pull": {"assigned_workers": {"worker_id": worker_id}},
            "$set": {"updated_at": datetime.utcnow().isoformat()}
        }
    )
    
    return {
        "success": True,
        "message": "Worker unassigned successfully"
    }
