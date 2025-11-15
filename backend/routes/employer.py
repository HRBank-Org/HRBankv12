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
    
    # Geocode address
    address = workplace_data.get("address")
    if address:
        coordinates = google_maps_service.geocode_address(address)
        if coordinates:
            workplace_data["lat"] = coordinates[0]
            workplace_data["long"] = coordinates[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to geocode address"
            )
    
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
        "created_date": datetime.utcnow().isoformat()
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
            "created_date": datetime.utcnow().isoformat()
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
    """Get all shifts for employer's workplaces"""
    
    # Get employer's workplaces
    workplaces = await db.workplaces.find(
        {"employer_id": current_user["user_id"]},
        {"workplace_id": 1}
    ).to_list(100)
    
    workplace_ids = [w["workplace_id"] for w in workplaces]
    
    # Get shifts for these workplaces
    shifts = await db.shifts.find(
        {"workplace_id": {"$in": workplace_ids}},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {"shifts": shifts}
    }

@router.patch("/me/profile", response_model=Dict)
async def update_employer_profile(
    profile_data: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update employer profile"""
    
    profile_data["updated_date"] = datetime.utcnow().isoformat()
    
    await db.employer_profiles.update_one(
        {"employer_id": current_user["user_id"]},
        {"$set": profile_data}
    )
    
    return {
        "success": True,
        "message": "Profile updated successfully"
    }

@router.delete("/workplaces/{workplace_id}", response_model=Dict)
async def delete_workplace(
    workplace_id: str,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Delete a workplace (only if no active shifts)"""
    
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
    
    # Check for active shifts
    active_shifts = await db.shifts.count_documents({
        "workplace_id": workplace_id,
        "status": {"$in": ["open", "filled"]}
    })
    
    if active_shifts > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete workplace with {active_shifts} active shift(s). Please complete or cancel shifts first."
        )
    
    # Delete workplace
    await db.workplaces.delete_one({"workplace_id": workplace_id})
    
    # Delete all completed shifts for this workplace
    await db.shifts.delete_many({"workplace_id": workplace_id})
    
    return {
        "success": True,
        "message": "Workplace deleted successfully"
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
    
    workplace_data["updated_date"] = datetime.utcnow().isoformat()
    
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
            "created_date": datetime.utcnow().isoformat()
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
                "created_date": datetime.utcnow().isoformat()
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
