from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user, require_role
from utils.google_maps import google_maps_service
from models.employer import Workplace, Shift, Role
from typing import Dict, List
from datetime import datetime, time, date
import uuid

router = APIRouter(prefix="/employer", tags=["Employer"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/workplaces", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_workplace(
    workplace_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a new workplace"""
    
    # Geocode address (optional - won't fail if geocoding unavailable)
    address = workplace_data.get("address")
    if address:
        try:
            coordinates = google_maps_service.geocode_address(address)
            if coordinates:
                workplace_data["lat"] = coordinates[0]
                workplace_data["long"] = coordinates[1]
        except Exception as e:
            # Geocoding failed, but continue without coordinates
            print(f"Geocoding failed: {e}")
            # Set default coordinates or leave as None
            workplace_data["lat"] = None
            workplace_data["long"] = None
    
    # Create workplace
    workplace = Workplace(
        employer_id=current_user["user_id"],
        **workplace_data
    )
    
    await db.workplaces.insert_one(workplace.model_dump())
    
    return {
        "success": True,
        "data": {"workplace_id": workplace.workplace_id},
        "message": "Workplace created successfully"
    }

@router.get("/workplaces", response_model=Dict)
async def get_my_workplaces(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all workplaces for current employer"""
    workplaces = await db.workplaces.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Ensure work_mode and schedule_pattern have defaults for existing data
    for wp in workplaces:
        if 'work_mode' not in wp:
            wp['work_mode'] = 'on_site'
        if 'schedule_pattern' not in wp:
            wp['schedule_pattern'] = 'standard'
        if 'status' not in wp:
            wp['status'] = 'active'
    
    return {
        "success": True,
        "data": {"workplaces": workplaces}
    }

@router.post("/shifts", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_shift(
    shift_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a new shift with roles"""
    
    # Verify workplace belongs to employer
    workplace = await db.workplaces.find_one({
        "workplace_id": shift_data.get("workplace_id"),
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace not found"
        )
    
    # Validate shift duration
    from datetime import datetime as dt
    start_time = dt.strptime(shift_data.get("start_time"), "%H:%M")
    end_time = dt.strptime(shift_data.get("end_time"), "%H:%M")
    duration_hours = (end_time - start_time).total_seconds() / 3600
    
    shift_type = shift_data.get("shift_type", "regular")
    
    if shift_type == "regular" and duration_hours > 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Regular shifts cannot exceed 8 hours. Please reduce shift duration or create as overtime shift."
        )
    
    if shift_type == "overtime" and duration_hours > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Overtime shifts cannot exceed 4 hours."
        )
    
    if duration_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )
    
    # Create shift
    shift_id = f"sh_{uuid.uuid4().hex[:12]}"
    shift_doc = {
        "shift_id": shift_id,
        "workplace_id": shift_data.get("workplace_id"),
        "shift_date": shift_data.get("shift_date"),
        "start_time": shift_data.get("start_time"),
        "end_time": shift_data.get("end_time"),
        "shift_type": shift_type,
        "status": "open",
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shifts.insert_one(shift_doc)
    
    # Create roles for this shift
    roles_data = shift_data.get("roles", [])
    for role_data in roles_data:
        role_id = f"role_{uuid.uuid4().hex[:12]}"
        role_doc = {
            "role_id": role_id,
            "shift_id": shift_id,
            "role_title": role_data.get("role_title"),
            "required_skills": role_data.get("required_skills", []),
            "required_certifications": role_data.get("required_certifications", []),
            "hourly_rate": role_data.get("hourly_rate"),
            "status": "open",
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(role_doc)
    
    return {
        "success": True,
        "data": {"shift_id": shift_id},
        "message": "Shift created successfully"
    }

@router.get("/shifts", response_model=Dict)
async def get_my_shifts(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all shifts for employer's workplaces - unified from all sources"""
    
    # Get employer's workplaces
    workplaces = await db.workplaces.find(
        {"employer_id": current_user["user_id"]},
        {"workplace_id": 1, "workplace_name": 1}
    ).to_list(100)
    
    workplace_ids = [w["workplace_id"] for w in workplaces]
    workplace_names = {w["workplace_id"]: w.get("workplace_name", "Workplace") for w in workplaces}
    
    all_shifts = []
    
    # 1. Get regular shifts from 'shifts' collection
    regular_shifts = await db.shifts.find(
        {"workplace_id": {"$in": workplace_ids}},
        {"_id": 0}
    ).to_list(100)
    
    for shift in regular_shifts:
        shift["source"] = "regular"
        shift["work_type"] = "on_site"
        shift["workplace_name"] = workplace_names.get(shift.get("workplace_id"), "Workplace")
        all_shifts.append(shift)
    
    # 2. Get calendar-sourced shifts (scheduling system)
    calendar_shifts = await db.shifts.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    for shift in calendar_shifts:
        shift["source"] = "calendar"
        shift["work_type"] = shift.get("work_type", "on_site")
        all_shifts.append(shift)
    
    # 3. Get service_tasks (route-based/CleanGrid)
    service_tasks = await db.service_tasks.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    for task in service_tasks:
        # Convert service task to shift format for calendar display
        all_shifts.append({
            "shift_id": task.get("task_id"),
            "workplace_id": task.get("workplace_id"),
            "workplace_name": workplace_names.get(task.get("workplace_id"), task.get("address", "Field Service")),
            "shift_date": task.get("scheduled_date"),
            "start_time": task.get("scheduled_start_time"),
            "end_time": task.get("scheduled_end_time"),
            "shift_type": "route_based",
            "work_type": "route_based",
            "source": "service_task",
            "status": task.get("status", "pending"),
            "title": task.get("title", "Service Task"),
            "address": task.get("address"),
            "assigned_worker_id": task.get("worker_id"),
            "external_ref": task.get("external_ref"),
            "external_source": task.get("external_source")
        })
    
    # 4. Get continental shifts (from continental_shifts collection if exists)
    try:
        continental_shifts = await db.continental_shifts.find(
            {"employer_id": current_user["user_id"]},
            {"_id": 0}
        ).to_list(100)
        
        for shift in continental_shifts:
            shift["source"] = "continental"
            shift["work_type"] = "continental"
            all_shifts.append(shift)
    except Exception:
        pass  # Collection may not exist
    
    return {
        "success": True,
        "data": {"shifts": all_shifts}
    }

@router.get("/me/profile", response_model=Dict)
async def get_my_profile(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get employer profile (creates empty if doesn't exist)"""
    profile = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not profile:
        # Return default empty profile
        profile = {
            "employer_id": current_user["user_id"],
            "user_id": current_user["user_id"],
            "first_name": "",
            "last_name": "",
            "contact_name": "",
            "company_name": "",
            "company_logo_url": "",
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

@router.patch("/me/profile", response_model=Dict)
async def update_employer_profile(
    profile_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update employer profile (creates if doesn't exist)"""
    
    profile_data["employer_id"] = current_user["user_id"]
    profile_data["user_id"] = current_user["user_id"]
    profile_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    # Check if profile exists
    existing_profile = await db.employer_profiles.find_one({"employer_id": current_user["user_id"]})
    
    if existing_profile:
        # Update existing profile
        await db.employer_profiles.update_one(
            {"employer_id": current_user["user_id"]},
            {"$set": profile_data}
        )
        message = "Profile updated successfully"
    else:
        # Create new profile
        profile_data["created_date"] = datetime.now(timezone.utc).isoformat()
        await db.employer_profiles.insert_one(profile_data)
        message = "Profile created successfully"
    
    return {
        "success": True,
        "message": message
    }

@router.get("/workplaces/{workplace_id}/dependencies", response_model=Dict)
async def get_workplace_dependencies(
    workplace_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all dependencies for a workplace before deletion/deactivation"""
    from datetime import datetime, timedelta, timezone
    
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not workplace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workplace not found")
    
    # Get active/upcoming shifts
    active_shifts = await db.shifts.find({
        "workplace_id": workplace_id,
        "status": {"$in": ["open", "filled", "in_progress"]},
        "date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    }, {"_id": 0, "shift_id": 1, "position_title": 1, "date": 1, "start_time": 1, "assigned_workers": 1}).to_list(100)
    
    # Get roles at this workplace
    roles = await db.workplace_roles.find({
        "workplace_id": workplace_id,
        "employer_id": current_user["user_id"]
    }, {"_id": 0, "role_id": 1, "role_name": 1, "title": 1}).to_list(50)
    
    # Get workers assigned to shifts at this workplace
    worker_ids = set()
    for shift in active_shifts:
        for worker in shift.get("assigned_workers", []):
            worker_ids.add(worker.get("user_id") or worker.get("workforce_id"))
    
    workers = []
    if worker_ids:
        workers = await db.users.find(
            {"user_id": {"$in": list(worker_ids)}},
            {"_id": 0, "user_id": 1, "email": 1, "first_name": 1, "last_name": 1}
        ).to_list(100)
    
    has_dependencies = len(active_shifts) > 0 or len(workers) > 0
    
    return {
        "success": True,
        "data": {
            "workplace_id": workplace_id,
            "workplace_name": workplace.get("name", workplace.get("workplace_name")),
            "status": workplace.get("status", "active"),
            "has_dependencies": has_dependencies,
            "active_shifts": active_shifts,
            "active_shifts_count": len(active_shifts),
            "roles": roles,
            "roles_count": len(roles),
            "assigned_workers": workers,
            "assigned_workers_count": len(workers),
            "can_delete": not has_dependencies,
            "can_deactivate": True,  # Can always deactivate, but with warning
            "warning": "Deactivating will prevent new shifts from being created. Existing shifts and worker assignments will remain." if has_dependencies else None
        }
    }


@router.patch("/workplaces/{workplace_id}/status", response_model=Dict)
async def update_workplace_status(
    workplace_id: str,
    status_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Activate or deactivate a workplace"""
    from datetime import datetime, timezone
    
    new_status = status_data.get("status")  # "active" or "inactive"
    
    if new_status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'")
    
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workplace not found")
    
    # Update status
    await db.workplaces.update_one(
        {"workplace_id": workplace_id},
        {"$set": {
            "status": new_status,
            "status_updated_at": datetime.now(timezone.utc),
            "status_updated_by": current_user["user_id"]
        }}
    )
    
    # If deactivating, also deactivate roles at this workplace
    if new_status == "inactive":
        await db.workplace_roles.update_many(
            {"workplace_id": workplace_id},
            {"$set": {"status": "inactive"}}
        )
    
    return {
        "success": True,
        "data": {"workplace_id": workplace_id, "status": new_status},
        "message": f"Workplace {'activated' if new_status == 'active' else 'deactivated'} successfully"
    }


@router.delete("/workplaces/{workplace_id}", response_model=Dict)
async def delete_workplace(
    workplace_id: str,
    force: bool = False,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a workplace. Use force=true to unassign all workers first."""
    from datetime import datetime, timedelta, timezone
    
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workplace not found")
    
    # Check for active shifts
    active_shifts = await db.shifts.count_documents({
        "workplace_id": workplace_id,
        "status": {"$in": ["open", "filled", "in_progress"]},
        "date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    })
    
    if active_shifts > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete workplace with {active_shifts} active/upcoming shift(s). Cancel shifts first or use force=true to unassign all workers."
        )
    
    # If force delete, handle dependencies
    unassigned_workers = []
    if force:
        # Get all workers assigned to shifts at this workplace
        shifts_with_workers = await db.shifts.find({
            "workplace_id": workplace_id,
            "assigned_workers": {"$exists": True, "$ne": []}
        }).to_list(500)
        
        for shift in shifts_with_workers:
            for worker in shift.get("assigned_workers", []):
                worker_id = worker.get("user_id") or worker.get("workforce_id")
                if worker_id and worker_id not in unassigned_workers:
                    unassigned_workers.append(worker_id)
                    # Mark worker as unassigned in inventory
                    await db.workforce_inventory.update_one(
                        {"employer_id": current_user["user_id"], "workforce_id": worker_id},
                        {"$set": {
                            "status": "unassigned",
                            "last_shift_date": datetime.now(timezone.utc),
                            "unassigned_date": datetime.now(timezone.utc),
                            "auto_terminate_date": datetime.now(timezone.utc) + timedelta(days=14)
                        }},
                        upsert=True
                    )
        
        # Cancel all shifts at this workplace
        await db.shifts.update_many(
            {"workplace_id": workplace_id},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
        )
    
    # Delete roles at this workplace
    await db.workplace_roles.delete_many({"workplace_id": workplace_id})
    
    # Delete the workplace
    await db.workplaces.delete_one({"workplace_id": workplace_id})
    
    # Delete old completed/cancelled shifts
    await db.shifts.delete_many({
        "workplace_id": workplace_id,
        "status": {"$in": ["completed", "cancelled"]}
    })
    
    return {
        "success": True,
        "data": {
            "workplace_id": workplace_id,
            "unassigned_workers_count": len(unassigned_workers),
            "unassigned_workers": unassigned_workers
        },
        "message": f"Workplace deleted successfully. {len(unassigned_workers)} worker(s) moved to unassigned inventory."
    }

@router.patch("/workplaces/{workplace_id}", response_model=Dict)
async def update_workplace(
    workplace_id: str,
    workplace_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update workplace details"""
    
    # Verify workplace belongs to employer
    workplace = await db.workplaces.find_one({
        "workplace_id": workplace_id,
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workplace not found"
        )
    
    # If address changed, re-geocode
    if "address" in workplace_data:
        coordinates = google_maps_service.geocode_address(workplace_data["address"])
        if coordinates:
            workplace_data["lat"] = coordinates[0]
            workplace_data["long"] = coordinates[1]
    
    workplace_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.workplaces.update_one(
        {"workplace_id": workplace_id},
        {"$set": workplace_data}
    )
    
    return {
        "success": True,
        "message": "Workplace updated successfully"
    }

@router.post("/shift-templates", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_shift_template(
    template_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create reusable shift template"""
    from models.employer import ShiftTemplate
    
    template = ShiftTemplate(
        employer_id=current_user["user_id"],
        **template_data
    )
    
    await db.shift_templates.insert_one(template.model_dump())
    
    return {
        "success": True,
        "data": {"template_id": template.template_id},
        "message": "Shift template created"
    }

@router.get("/shift-templates", response_model=Dict)
async def get_shift_templates(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get all shift templates for employer"""
    templates = await db.shift_templates.find(
        {"employer_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {"templates": templates}
    }

@router.post("/shifts/{shift_id}/duplicate", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def duplicate_shift(
    shift_id: str,
    new_dates: List[str],
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Duplicate shift to multiple new dates"""
    
    # Get original shift
    shift = await db.shifts.find_one({"shift_id": shift_id})
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Get roles for this shift
    roles = await db.roles.find({"shift_id": shift_id}, {"_id": 0}).to_list(100)
    
    created_shifts = []
    
    for new_date in new_dates:
        # Create new shift
        new_shift_id = f"sh_{uuid.uuid4().hex[:12]}"
        new_shift = {
            **shift,
            "shift_id": new_shift_id,
            "shift_date": new_date,
            "status": "open",
            "created_date": datetime.now(timezone.utc).isoformat()
        }
        del new_shift["_id"]
        
        await db.shifts.insert_one(new_shift)
        
        # Duplicate roles
        for role in roles:
            new_role_id = f"role_{uuid.uuid4().hex[:12]}"
            new_role = {
                **role,
                "role_id": new_role_id,
                "shift_id": new_shift_id,
                "status": "open",
                "created_date": datetime.now(timezone.utc).isoformat()
            }
            if "_id" in new_role:
                del new_role["_id"]
            
            await db.roles.insert_one(new_role)
        
        created_shifts.append(new_shift_id)
    
    return {
        "success": True,
        "data": {"shift_ids": created_shifts},
        "message": f"Created {len(created_shifts)} shifts from template"
    }



@router.delete("/shifts/{shift_id}", response_model=Dict)
async def delete_shift(
    shift_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a shift (only if no workers assigned)"""
    
    # Find shift
    shift = await db.shifts.find_one({"shift_id": shift_id})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Verify employer owns the workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": shift.get("workplace_id"),
        "employer_id": current_user["user_id"]
    })
    
    if not workplace:
        raise HTTPException(status_code=403, detail="Not authorized to delete this shift")
    
    # Check if shift has assigned workers
    assigned_workers = shift.get("assigned_workers", [])
    if len(assigned_workers) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete shift with assigned workers. Please unassign workers first."
        )
    
    # Delete shift
    await db.shifts.delete_one({"shift_id": shift_id})
    
    return {
        "success": True,
        "message": "Shift deleted successfully"
    }

@router.delete("/shifts/{shift_id}/unassign/{workforce_id}", response_model=Dict)
async def unassign_worker_from_shift(
    shift_id: str,
    workforce_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Remove a worker from a shift"""
    
    # Find shift in unified shifts collection
    shift = await db.shifts.find_one({"shift_id": shift_id})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Verify employer owns the shift
    if shift.get("employer_id") != current_user["user_id"]:
        # Also check via workplace
        workplace = await db.workplaces.find_one({
            "workplace_id": shift.get("workplace_id"),
            "employer_id": current_user["user_id"]
        })
        if not workplace:
            raise HTTPException(status_code=403, detail="Not authorized to modify this shift")
    
    # Remove worker from assigned list - handle various formats
    assigned_workers = shift.get("assigned_workers", [])
    original_count = len(assigned_workers)
    
    # Handle different worker ID formats in the list
    new_assigned_workers = []
    for w in assigned_workers:
        if isinstance(w, str):
            if w != workforce_id:
                new_assigned_workers.append(w)
        elif isinstance(w, dict):
            # Check all possible ID fields
            worker_id = w.get("worker_id") or w.get("workforce_id") or w.get("user_id")
            if worker_id != workforce_id:
                new_assigned_workers.append(w)
    
    # Check if worker was actually removed
    if len(new_assigned_workers) == original_count:
        raise HTTPException(status_code=404, detail="Worker not found in shift")
    
    # Update the shifts collection
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {"$set": {
            "assigned_workers": new_assigned_workers,
            "assigned_worker_count": len(new_assigned_workers),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Worker unassigned successfully",
        "data": {
            "shift_id": shift_id,
            "removed_worker_id": workforce_id,
            "remaining_workers": len(new_assigned_workers)
        }
    }

# ==================== INVITATION ENDPOINTS ====================

@router.post("/shifts/{shift_id}/invite", response_model=Dict)
async def invite_to_shift(
    shift_id: str,
    invite_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Invite workforce member(s) to a specific shift
    Sends email invitation with link to signup and auto-apply to shift
    """
    from models.invites import InviteToken
    from datetime import timedelta
    import os
    
    # Verify shift belongs to employer
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found"
        )
    
    # Get employer profile for company name
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "company_name": 1}
    )
    company_name = employer.get("company_name", "Company") if employer else "Company"
    
    # Process invitations (can be single email or list)
    emails = invite_data.get("emails", [])
    if isinstance(emails, str):
        emails = [emails]
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one email address is required"
        )
    
    successful_invites = []
    failed_invites = []
    
    for email in emails:
        email = email.strip()
        
        # Validate email
        if not email or "@" not in email:
            failed_invites.append({"email": email, "reason": "Invalid email format"})
            continue
        
        # Check if user already exists
        existing = await db.users.find_one({"email": email})
        if existing:
            failed_invites.append({"email": email, "reason": "User already registered"})
            continue
        
        # Create invite token
        invite = InviteToken(
            invited_by_user_id=current_user["user_id"],
            invited_by_user_type="employer",
            email=email,
            full_name="",
            shift_id=shift_id,
            workplace_id=shift.get("workplace_id"),
            expires_at=datetime.now(timezone.utc) + timedelta(days=14)
        )
        
        await db.invite_tokens.insert_one(invite.model_dump())
        
        # Send invitation email
        try:
            from utils.email_service import email_service
            
            invite_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/signup?invite={invite.invite_token}"
            
            shift_date = shift.get("shift_date", "")
            shift_time = f"{shift.get('start_time', '')} - {shift.get('end_time', '')}"
            workplace_name = shift.get("workplace_name", "")
            
            subject = f"Shift Invitation from {company_name}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #ff5f00; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">HR Bank</h1>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">You're Invited to Work a Shift!</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        <strong>{company_name}</strong> has invited you to work a shift on HR Bank.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #ff5f00; margin-top: 0;">Shift Details</h3>
                        <p style="margin: 10px 0;"><strong>Location:</strong> {workplace_name}</p>
                        <p style="margin: 10px 0;"><strong>Date:</strong> {shift_date}</p>
                        <p style="margin: 10px 0;"><strong>Time:</strong> {shift_time}</p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        To accept this invitation, create your HR Bank account and you'll be automatically connected to this shift.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_link}" 
                           style="background: #ff5f00; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Create Account & View Shift
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        This invitation expires in 14 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    © 2024 HR Bank. All rights reserved.
                </div>
            </div>
            """
            
            await email_service.send_email(
                to_email=email,
                subject=subject,
                html_content=html_content
            )
            
            successful_invites.append(email)
            
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            failed_invites.append({"email": email, "reason": f"Email send failed: {str(e)}"})
    
    return {
        "success": True,
        "data": {
            "successful_invites": len(successful_invites),
            "failed_invites": len(failed_invites),
            "successes": successful_invites,
            "failures": failed_invites
        },
        "message": f"Sent {len(successful_invites)} shift invitation(s)"
    }


@router.post("/jobs/{job_id}/invite", response_model=Dict)
async def invite_to_job(
    job_id: str,
    invite_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Invite workforce member(s) to a specific job posting
    Sends email invitation with link to signup and view job
    """
    from models.invites import InviteToken
    from datetime import timedelta
    import os
    
    # Verify job belongs to employer
    job = await db.jobs.find_one({
        "job_id": job_id,
        "employer_id": current_user["user_id"]
    })
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get employer profile for company name
    employer = await db.employer_profiles.find_one(
        {"employer_id": current_user["user_id"]},
        {"_id": 0, "company_name": 1}
    )
    company_name = employer.get("company_name", "Company") if employer else "Company"
    
    # Process invitations
    emails = invite_data.get("emails", [])
    if isinstance(emails, str):
        emails = [emails]
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one email address is required"
        )
    
    successful_invites = []
    failed_invites = []
    
    for email in emails:
        email = email.strip()
        
        # Validate email
        if not email or "@" not in email:
            failed_invites.append({"email": email, "reason": "Invalid email format"})
            continue
        
        # Check if user already exists
        existing = await db.users.find_one({"email": email})
        if existing:
            failed_invites.append({"email": email, "reason": "User already registered"})
            continue
        
        # Create invite token
        invite = InviteToken(
            invited_by_user_id=current_user["user_id"],
            invited_by_user_type="employer",
            email=email,
            full_name="",
            job_id=job_id,
            workplace_id=job.get("workplace_id"),
            suggested_occupation=job.get("job_title"),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        await db.invite_tokens.insert_one(invite.model_dump())
        
        # Send invitation email
        try:
            from utils.email_service import email_service
            
            invite_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/signup?invite={invite.invite_token}"
            
            job_title = job.get("job_title", "Position")
            workplace_name = job.get("workplace_name", "")
            job_description = job.get("job_description", "")[:200]
            
            subject = f"Job Opportunity from {company_name}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #ff5f00; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">HR Bank</h1>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">You're Invited to Apply!</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        <strong>{company_name}</strong> thinks you'd be a great fit for an open position on HR Bank.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #ff5f00; margin-top: 0;">{job_title}</h3>
                        <p style="margin: 10px 0;"><strong>Location:</strong> {workplace_name}</p>
                        <p style="margin: 10px 0; color: #666;">{job_description}...</p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Create your HR Bank account to view the full job details and apply directly.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_link}" 
                           style="background: #ff5f00; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Create Account & View Job
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        This invitation expires in 30 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                    © 2024 HR Bank. All rights reserved.
                </div>
            </div>
            """
            
            await email_service.send_email(
                to_email=email,
                subject=subject,
                html_content=html_content
            )
            
            successful_invites.append(email)
            
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            failed_invites.append({"email": email, "reason": f"Email send failed: {str(e)}"})
    
    return {
        "success": True,
        "data": {
            "successful_invites": len(successful_invites),
            "failed_invites": len(failed_invites),
            "successes": successful_invites,
            "failures": failed_invites
        },
        "message": f"Sent {len(successful_invites)} job invitation(s)"
    }



@router.get("/workforce-inventory", response_model=Dict)
async def get_workforce_inventory(
    status_filter: str = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get workforce inventory - workers who are employed but not assigned to shifts"""
    from datetime import datetime, timezone
    
    query = {"employer_id": current_user["user_id"]}
    if status_filter:
        query["status"] = status_filter
    
    inventory = await db.workforce_inventory.find(query, {"_id": 0}).to_list(200)
    
    # Enrich with worker details
    for item in inventory:
        worker = await db.users.find_one(
            {"user_id": item.get("workforce_id")},
            {"_id": 0, "user_id": 1, "email": 1, "first_name": 1, "last_name": 1}
        )
        if worker:
            item["worker_details"] = worker
        
        # Calculate days until auto-terminate
        if item.get("auto_terminate_date"):
            days_left = (item["auto_terminate_date"] - datetime.now(timezone.utc)).days
            item["days_until_auto_terminate"] = max(0, days_left)
    
    return {
        "success": True,
        "data": {
            "inventory": inventory,
            "total": len(inventory),
            "unassigned_count": len([i for i in inventory if i.get("status") == "unassigned"])
        }
    }


@router.post("/workforce-inventory/process-auto-terminations", response_model=Dict)
async def process_auto_terminations(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Process workers who have been unassigned for 2+ weeks - terminate them"""
    from datetime import datetime, timezone
    
    # Find workers past their auto-terminate date
    expired = await db.workforce_inventory.find({
        "employer_id": current_user["user_id"],
        "status": "unassigned",
        "auto_terminate_date": {"$lte": datetime.now(timezone.utc)}
    }, {"_id": 0}).to_list(100)
    
    terminated_workers = []
    for item in expired:
        workforce_id = item.get("workforce_id")
        
        # Update employment relationship to terminated
        await db.employment_relationships.update_one(
            {"employer_id": current_user["user_id"], "workforce_id": workforce_id, "status": "active"},
            {"$set": {
                "status": "terminated",
                "termination_date": datetime.now(timezone.utc),
                "termination_reason": "auto_terminated_unassigned_2_weeks",
                "terminated_by": "system"
            }}
        )
        
        # Remove from inventory
        await db.workforce_inventory.delete_one({
            "employer_id": current_user["user_id"],
            "workforce_id": workforce_id
        })
        
        terminated_workers.append(workforce_id)
    
    return {
        "success": True,
        "data": {
            "terminated_count": len(terminated_workers),
            "terminated_workers": terminated_workers
        },
        "message": f"Auto-terminated {len(terminated_workers)} worker(s) who were unassigned for 2+ weeks"
    }



@router.get("/workforce-inventory/stats", response_model=Dict)
async def get_workforce_inventory_stats(
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Get workforce inventory statistics including workers approaching auto-termination"""
    from services.workforce_cleanup_service import get_workforce_inventory_stats as get_stats
    
    stats = await get_stats(db, current_user["user_id"])
    
    return {
        "success": True,
        "data": stats
    }


@router.post("/workforce-inventory/cleanup", response_model=Dict)
async def run_workforce_cleanup(
    dry_run: bool = True,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Manually trigger workforce cleanup (terminate workers unassigned for 2+ weeks).
    Use dry_run=true to preview what would be terminated without making changes.
    """
    from services.workforce_cleanup_service import terminate_unassigned_workers
    
    result = await terminate_unassigned_workers(db, current_user["user_id"], dry_run=dry_run)
    
    return {
        "success": True,
        "data": result,
        "message": "Dry run completed" if dry_run else f"Terminated {result['terminated_count']} worker(s)"
    }


@router.get("/workers", response_model=Dict)
async def get_employer_workers(
    workplace_id: str = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get all workers for this employer.
    Used for task assignment in field service mode.
    Pulls from: employment_relationships, shift assignments, and active workforce profiles.
    """
    worker_ids = set()
    
    # Method 1: Get from employment relationships
    relationships = await db.employment_relationships.find({
        "employer_id": current_user["user_id"],
        "status": "active"
    }, {"_id": 0, "workforce_id": 1}).to_list(500)
    
    for r in relationships:
        if r.get("workforce_id"):
            worker_ids.add(r["workforce_id"])
    
    # Method 2: Get from shift assignments (workers who have been assigned to employer's shifts)
    shift_query = {"employer_id": current_user["user_id"], "assigned_workers": {"$exists": True, "$ne": []}}
    if workplace_id:
        shift_query["workplace_id"] = workplace_id
    
    shifts = await db.shifts.find(shift_query, {"_id": 0, "assigned_workers": 1}).to_list(500)
    
    for shift in shifts:
        for worker in shift.get("assigned_workers", []):
            wid = worker.get("workforce_id") or worker.get("user_id")
            if wid:
                worker_ids.add(wid)
    
    # Method 3: Get all active workforce profiles (fallback for field service)
    profiles = await db.workforce_profiles.find(
        {"profile_status": "active"},
        {"_id": 0, "user_id": 1}
    ).to_list(100)
    
    for p in profiles:
        if p.get("user_id"):
            worker_ids.add(p["user_id"])
    
    if not worker_ids:
        return {
            "success": True,
            "data": {"workers": [], "count": 0}
        }
    
    # Get worker details
    workers = await db.users.find(
        {"user_id": {"$in": list(worker_ids)}, "user_type": "workforce"},
        {"_id": 0, "user_id": 1, "email": 1, "first_name": 1, "last_name": 1, "phone": 1}
    ).to_list(500)
    
    # Enrich with profile info
    enriched_workers = []
    for worker in workers:
        profile = await db.workforce_profiles.find_one(
            {"user_id": worker["user_id"]},
            {"_id": 0, "profile_photo_url": 1, "profile_status": 1}
        )
        
        enriched_workers.append({
            "user_id": worker["user_id"],
            "worker_id": worker["user_id"],
            "email": worker.get("email", ""),
            "first_name": worker.get("first_name", ""),
            "last_name": worker.get("last_name", ""),
            "phone": worker.get("phone"),
            "profile_photo_url": profile.get("profile_photo_url") if profile else None,
            "status": profile.get("profile_status", "active") if profile else "active"
        })
    
    return {
        "success": True,
        "data": {
            "workers": enriched_workers,
            "count": len(enriched_workers)
        }
    }
