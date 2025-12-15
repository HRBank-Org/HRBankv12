"""
Enhanced Shift Management API
Connecteam-style shift scheduling with worker assignments
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from auth.dependencies import get_current_user, require_role
from database import get_database
from models.shift_management import (
    EnhancedShift, AssignedWorker, ShiftTemplate, 
    AvailableWorkforce, ShiftCloneRequest, BulkShiftCreate
)
import uuid

router = APIRouter(prefix="/api/employer/shift-management", tags=["Shift Management"])

# ============== SHIFT CRUD ==============

@router.get("/shifts")
async def get_shifts(
    workplace_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_role(['employer']))
):
    """Get shifts with filters - Connecteam style"""
    db = await get_database()
    
    query = {"employer_id": current_user["user_id"]}
    
    if workplace_id and workplace_id != "all":
        query["workplace_id"] = workplace_id
    
    if start_date and end_date:
        query["start_time"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    if status:
        query["status"] = status
    
    shifts = await db.shifts.find(query).sort("start_time", 1).to_list(1000)
    
    # Calculate open_positions for each shift
    for shift in shifts:
        assigned = shift.get("assigned_workers", [])
        confirmed_count = len([w for w in assigned if w.get("status") == "confirmed"])
        shift["positions_filled"] = confirmed_count
        shift["open_positions"] = shift.get("positions_needed", 0) - confirmed_count
        
        # Update status based on staffing
        if confirmed_count == 0:
            shift["status"] = "open"
        elif confirmed_count < shift.get("positions_needed", 0):
            shift["status"] = "partially_filled"
        else:
            shift["status"] = "fully_staffed"
    
    return {
        "success": True,
        "data": {"shifts": shifts}
    }

@router.post("/shifts")
async def create_shift(
    shift_data: dict,
    current_user: dict = Depends(require_role(['employer']))
):
    """Create a new shift"""
    db = await get_database()
    
    # Get workplace details
    workplace = await db.workplaces.find_one({
        "workplace_id": shift_data.get("workplace_id"),
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
        "shift_name": shift_data.get("shift_name", "Shift"),
        "position_title": shift_data.get("position_title", "Worker"),
        "start_time": shift_data["start_time"],
        "end_time": shift_data["end_time"],
        "shift_duration_hours": duration,
        "positions_needed": shift_data.get("positions_needed", 1),
        "positions_filled": 0,
        "assigned_workers": [],
        "open_positions": shift_data.get("positions_needed", 1),
        "required_skills": shift_data.get("required_skills", []),
        "required_certifications": shift_data.get("required_certifications", []),
        "match_status": shift_data.get("match_status", "auto"),
        "auto_match_enabled": shift_data.get("auto_match_enabled", True),
        "description": shift_data.get("description"),
        "notes": shift_data.get("notes"),
        "hourly_rate": shift_data.get("hourly_rate"),
        "status": "open",
        "recurring": shift_data.get("recurring", False),
        "recurring_pattern": shift_data.get("recurring_pattern"),
        "is_template": False,
        "created_date": datetime.utcnow().isoformat(),
        "updated_date": datetime.utcnow().isoformat(),
        "created_by": current_user["user_id"]
    }
    
    await db.shifts.insert_one(shift)
    
    return {
        "success": True,
        "data": {"shift": shift},
        "message": "Shift created successfully"
    }

@router.patch("/shifts/{shift_id}")
async def update_shift(
    shift_id: str,
    shift_data: dict,
    current_user: dict = Depends(require_role(['employer']))
):
    """Update shift details"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Update fields
    update_data = {
        "updated_date": datetime.utcnow().isoformat()
    }
    
    allowed_fields = [
        "shift_name", "position_title", "start_time", "end_time",
        "positions_needed", "description", "notes", "hourly_rate",
        "required_skills", "required_certifications", "status"
    ]
    
    for field in allowed_fields:
        if field in shift_data:
            update_data[field] = shift_data[field]
    
    # Recalculate open_positions if positions_needed changed
    if "positions_needed" in shift_data:
        assigned = shift.get("assigned_workers", [])
        confirmed_count = len([w for w in assigned if w.get("status") == "confirmed"])
        update_data["open_positions"] = shift_data["positions_needed"] - confirmed_count
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Shift updated successfully"
    }

@router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: str,
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
    
    # Check if shift has assigned workers
    assigned = shift.get("assigned_workers", [])
    if len(assigned) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete shift with assigned workers. Please unassign workers first."
        )
    
    await db.shifts.delete_one({"shift_id": shift_id})
    
    return {
        "success": True,
        "message": "Shift deleted successfully"
    }

# ============== WORKER ASSIGNMENT ==============

@router.get("/shifts/{shift_id}/available-workforce")
async def get_available_workforce(
    shift_id: str,
    current_user: dict = Depends(require_role(['employer']))
):
    """Get list of available workforce for shift assignment"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get all active workforce profiles
    workforce_profiles = await db.workforce_profiles.find({
        "profile_status": "active"
    }).to_list(500)
    
    available_workers = []
    
    for profile in workforce_profiles:
        # Get user data
        user = await db.users.find_one({"user_id": profile["user_id"]})
        if not user:
            continue
        
        # Get occupations
        occupations = await db.occupation_profiles.find({
            "user_id": profile["user_id"],
            "active": True
        }).to_list(10)
        
        occupation_titles = [occ.get("occupation_title", "") for occ in occupations]
        
        # Get all skills from occupations
        all_skills = set()
        for occ in occupations:
            all_skills.update(occ.get("skills", []))
        
        # Get verified certifications
        all_certs = []
        for occ in occupations:
            creds = occ.get("credential_details", [])
            all_certs.extend([
                c.get("credential_name") for c in creds 
                if c.get("status") == "verified"
            ])
        
        # Check if already assigned
        already_assigned = any(
            w.get("workforce_id") == profile["user_id"]
            for w in shift.get("assigned_workers", [])
        )
        
        if already_assigned:
            continue
        
        # Calculate match
        required_skills = set(shift.get("required_skills", []))
        required_certs = set(shift.get("required_certifications", []))
        
        matched_skills = list(required_skills.intersection(all_skills))
        missing_skills = list(required_skills - all_skills)
        matched_certs = list(required_certs.intersection(all_certs))
        missing_certs = list(required_certs - all_certs)
        
        # Simple match score
        skill_score = len(matched_skills) / len(required_skills) * 50 if required_skills else 50
        cert_score = len(matched_certs) / len(required_certs) * 50 if required_certs else 50
        match_score = skill_score + cert_score
        
        worker = {
            "workforce_id": profile["user_id"],
            "full_name": user.get("full_name", "Unknown"),
            "profile_photo_url": profile.get("profile_photo_url"),
            "match_score": round(match_score, 1),
            "occupation_titles": occupation_titles,
            "skills": list(all_skills),
            "certifications": all_certs,
            "rating_avg": profile.get("rating_avg", 0),
            "total_shifts_completed": profile.get("completed_jobs_count", 0),
            "total_hours_worked": profile.get("total_hours_worked", 0),
            "is_available": profile.get("employment_status") != "employed",
            "current_employment_status": profile.get("employment_status", "available"),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "matched_certifications": matched_certs,
            "missing_certifications": missing_certs
        }
        
        available_workers.append(worker)
    
    # Sort by match score
    available_workers.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "success": True,
        "data": {"available_workforce": available_workers}
    }

@router.post("/shifts/{shift_id}/assign-worker")
async def assign_worker_to_shift(
    shift_id: str,
    worker_data: dict,
    current_user: dict = Depends(require_role(['employer']))
):
    """Assign a worker to a shift"""
    db = await get_database()
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if shift is already fully staffed
    assigned = shift.get("assigned_workers", [])
    confirmed_count = len([w for w in assigned if w.get("status") == "confirmed"])
    
    if confirmed_count >= shift.get("positions_needed", 0):
        raise HTTPException(status_code=400, detail="Shift is already fully staffed")
    
    # Check if worker already assigned
    if any(w.get("workforce_id") == worker_data["workforce_id"] for w in assigned):
        raise HTTPException(status_code=400, detail="Worker already assigned to this shift")
    
    # Get worker details
    user = await db.users.find_one({"user_id": worker_data["workforce_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Create assignment
    assignment = {
        "workforce_id": worker_data["workforce_id"],
        "full_name": user.get("full_name", "Unknown"),
        "profile_photo_url": worker_data.get("profile_photo_url"),
        "position_title": shift.get("position_title", "Worker"),
        "status": "confirmed",
        "assigned_date": datetime.utcnow().isoformat(),
        "assigned_by": current_user["user_id"],
        "notes": worker_data.get("notes")
    }
    
    # Update shift
    assigned.append(assignment)
    new_confirmed_count = len([w for w in assigned if w.get("status") == "confirmed"])
    
    update_data = {
        "assigned_workers": assigned,
        "positions_filled": new_confirmed_count,
        "open_positions": shift.get("positions_needed", 0) - new_confirmed_count,
        "updated_date": datetime.utcnow().isoformat()
    }
    
    # Update status
    if new_confirmed_count >= shift.get("positions_needed", 0):
        update_data["status"] = "fully_staffed"
    else:
        update_data["status"] = "partially_filled"
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "data": {"assignment": assignment},
        "message": "Worker assigned successfully"
    }

@router.delete("/shifts/{shift_id}/unassign-worker/{workforce_id}")
async def unassign_worker_from_shift(
    shift_id: str,
    workforce_id: str,
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
    assigned = shift.get("assigned_workers", [])
    
    # Handle both list of strings and list of dicts
    if assigned and isinstance(assigned[0], str):
        # List of IDs
        assigned = [w for w in assigned if w != workforce_id]
        confirmed_count = len(assigned)
    else:
        # List of objects
        assigned = [w for w in assigned if w.get("workforce_id") != workforce_id]
        confirmed_count = len([w for w in assigned if w.get("status") == "confirmed"])
    
    # Update shift
    update_data = {
        "assigned_workers": assigned,
        "positions_filled": confirmed_count,
        "assigned_worker_count": confirmed_count,
        "open_positions": shift.get("positions_needed", 0) - confirmed_count,
        "updated_date": datetime.utcnow().isoformat(),
        "status": "open" if confirmed_count == 0 else "scheduled"
    }
    
    # Update status
    if confirmed_count == 0:
        update_data["status"] = "open"
    elif confirmed_count < shift.get("positions_needed", 0):
        update_data["status"] = "partially_filled"
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Worker unassigned successfully"
    }

# ============== SHIFT TEMPLATES ==============

@router.get("/templates")
async def get_shift_templates(
    current_user: dict = Depends(require_role(['employer']))
):
    """Get all shift templates for employer"""
    db = await get_database()
    
    templates = await db.shift_templates.find({
        "employer_id": current_user["user_id"]
    }).sort("template_name", 1).to_list(100)
    
    return {
        "success": True,
        "data": {"templates": templates}
    }

@router.post("/templates")
async def create_shift_template(
    template_data: dict,
    current_user: dict = Depends(require_role(['employer']))
):
    """Save a shift as a template for reuse"""
    db = await get_database()
    
    template = {
        "template_id": f"tpl_{uuid.uuid4().hex[:12]}",
        "employer_id": current_user["user_id"],
        "template_name": template_data["template_name"],
        "workplace_id": template_data["workplace_id"],
        "workplace_name": template_data["workplace_name"],
        "position_title": template_data["position_title"],
        "shift_duration_hours": template_data["shift_duration_hours"],
        "positions_needed": template_data["positions_needed"],
        "description": template_data.get("description"),
        "default_start_time": template_data["default_start_time"],
        "default_end_time": template_data["default_end_time"],
        "required_skills": template_data.get("required_skills", []),
        "required_certifications": template_data.get("required_certifications", []),
        "recurring_pattern": template_data.get("recurring_pattern"),
        "recurring_days": template_data.get("recurring_days", []),
        "created_date": datetime.utcnow().isoformat(),
        "last_used_date": None,
        "use_count": 0
    }
    
    await db.shift_templates.insert_one(template)
    
    return {
        "success": True,
        "data": {"template": template},
        "message": "Template created successfully"
    }

@router.delete("/templates/{template_id}")
async def delete_shift_template(
    template_id: str,
    current_user: dict = Depends(require_role(['employer']))
):
    """Delete a shift template"""
    db = await get_database()
    
    result = await db.shift_templates.delete_one({
        "template_id": template_id,
        "employer_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "success": True,
        "message": "Template deleted successfully"
    }

# ============== SHIFT CLONING ==============

@router.post("/shifts/{shift_id}/clone")
async def clone_shift(
    shift_id: str,
    clone_data: dict,
    current_user: dict = Depends(require_role(['employer']))
):
    """Clone a shift with optional worker assignments"""
    db = await get_database()
    
    original_shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not original_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Create new shift
    new_shift = original_shift.copy()
    new_shift["shift_id"] = str(uuid.uuid4())
    new_shift["start_time"] = clone_data["new_start_time"]
    new_shift["end_time"] = clone_data["new_end_time"]
    new_shift["created_date"] = datetime.utcnow().isoformat()
    new_shift["updated_date"] = datetime.utcnow().isoformat()
    new_shift["parent_shift_id"] = shift_id
    
    # Handle worker assignments
    if clone_data.get("copy_assigned_workers", False):
        new_shift["assigned_workers"] = original_shift.get("assigned_workers", [])
        new_shift["positions_filled"] = original_shift.get("positions_filled", 0)
        new_shift["open_positions"] = original_shift.get("open_positions", 0)
        new_shift["status"] = original_shift.get("status", "open")
    else:
        new_shift["assigned_workers"] = []
        new_shift["positions_filled"] = 0
        new_shift["open_positions"] = new_shift["positions_needed"]
        new_shift["status"] = "open"
    
    # Change workplace if specified
    if clone_data.get("workplace_id"):
        workplace = await db.workplaces.find_one({
            "workplace_id": clone_data["workplace_id"],
            "employer_id": current_user["user_id"]
        })
        if workplace:
            new_shift["workplace_id"] = clone_data["workplace_id"]
            new_shift["workplace_name"] = workplace.get("workplace_name", "")
    
    new_shift.pop("_id", None)
    await db.shifts.insert_one(new_shift)
    
    return {
        "success": True,
        "data": {"shift": new_shift},
        "message": "Shift cloned successfully"
    }

# ============== WEEKLY SUMMARY ==============

@router.get("/weekly-summary")
async def get_weekly_summary(
    week_start: str,
    current_user: dict = Depends(require_role(['employer']))
):
    """Get weekly summary stats for shift scheduler"""
    db = await get_database()
    
    week_end = (datetime.fromisoformat(week_start) + timedelta(days=7)).isoformat()
    
    shifts = await db.shifts.find({
        "employer_id": current_user["user_id"],
        "start_time": {
            "$gte": week_start,
            "$lt": week_end
        }
    }).to_list(1000)
    
    total_shifts = len(shifts)
    total_positions = sum(s.get("positions_needed", 0) for s in shifts)
    total_filled = sum(s.get("positions_filled", 0) for s in shifts)
    open_positions = total_positions - total_filled
    
    # Count by status
    status_counts = {
        "open": len([s for s in shifts if s.get("status") == "open"]),
        "partially_filled": len([s for s in shifts if s.get("status") == "partially_filled"]),
        "fully_staffed": len([s for s in shifts if s.get("status") == "fully_staffed"])
    }
    
    # Total hours scheduled
    total_hours = sum(s.get("shift_duration_hours", 0) * s.get("positions_needed", 0) for s in shifts)
    
    return {
        "success": True,
        "data": {
            "week_start": week_start,
            "total_shifts": total_shifts,
            "total_positions": total_positions,
            "total_filled": total_filled,
            "open_positions": open_positions,
            "status_counts": status_counts,
            "total_hours": total_hours
        }
    }
