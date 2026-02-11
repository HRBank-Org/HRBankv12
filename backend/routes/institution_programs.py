"""
Institution Programs & Faculty Routes
=====================================
Hierarchical management: Faculty → Program → Cohort

This provides the ROOT structure for institution operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, List, Optional
from datetime import datetime, timezone
from auth.dependencies import get_current_user, require_role
from models.institution_programs import (
    Faculty, FacultyCreate, FacultyUpdate,
    Program, ProgramCreate, ProgramUpdate,
    CREDENTIAL_TYPES, DELIVERY_MODES, PROGRAM_STATUS
)
import uuid

router = APIRouter(prefix="/api/institution/programs", tags=["Institution Programs"])

def get_db():
    from server import db
    return db


# ==================== METADATA ENDPOINTS ====================

@router.get("/metadata")
async def get_programs_metadata():
    """Get dropdown options for program forms"""
    return {
        "success": True,
        "data": {
            "credential_types": CREDENTIAL_TYPES,
            "delivery_modes": DELIVERY_MODES,
            "program_statuses": PROGRAM_STATUS
        }
    }


# ==================== FACULTY ENDPOINTS ====================

@router.get("/faculties")
async def get_faculties(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get all faculties for the institution"""
    institution_id = current_user["user_id"]
    
    faculties = await db.institution_faculties.find(
        {"institution_id": institution_id, "is_active": True},
        {"_id": 0}
    ).sort("display_order", 1).to_list(100)
    
    # Get program counts per faculty
    for faculty in faculties:
        count = await db.institution_programs.count_documents({
            "institution_id": institution_id,
            "faculty_id": faculty["faculty_id"],
            "is_active": True
        })
        faculty["programs_count"] = count
    
    return {
        "success": True,
        "data": {
            "faculties": faculties,
            "count": len(faculties)
        }
    }


@router.post("/faculties")
async def create_faculty(
    faculty_data: FacultyCreate,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Create a new faculty"""
    institution_id = current_user["user_id"]
    
    # Check for duplicate name
    existing = await db.institution_faculties.find_one({
        "institution_id": institution_id,
        "faculty_name": faculty_data.faculty_name,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faculty '{faculty_data.faculty_name}' already exists"
        )
    
    # Get next display order
    last_faculty = await db.institution_faculties.find_one(
        {"institution_id": institution_id},
        sort=[("display_order", -1)]
    )
    next_order = (last_faculty.get("display_order", 0) + 1) if last_faculty else 0
    
    faculty = Faculty(
        institution_id=institution_id,
        faculty_name=faculty_data.faculty_name,
        description=faculty_data.description,
        icon=faculty_data.icon,
        color=faculty_data.color,
        display_order=next_order
    )
    
    await db.institution_faculties.insert_one(faculty.model_dump())
    
    return {
        "success": True,
        "data": {"faculty_id": faculty.faculty_id, "faculty_name": faculty.faculty_name},
        "message": f"Faculty '{faculty.faculty_name}' created successfully"
    }


@router.put("/faculties/{faculty_id}")
async def update_faculty(
    faculty_id: str,
    faculty_data: FacultyUpdate,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Update a faculty"""
    institution_id = current_user["user_id"]
    
    faculty = await db.institution_faculties.find_one({
        "faculty_id": faculty_id,
        "institution_id": institution_id
    })
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    update_data = {k: v for k, v in faculty_data.model_dump().items() if v is not None}
    update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.institution_faculties.update_one(
        {"faculty_id": faculty_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Faculty updated successfully"
    }


@router.delete("/faculties/{faculty_id}")
async def delete_faculty(
    faculty_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Soft delete a faculty (only if no programs)"""
    institution_id = current_user["user_id"]
    
    # Check if faculty has programs
    programs_count = await db.institution_programs.count_documents({
        "institution_id": institution_id,
        "faculty_id": faculty_id,
        "is_active": True
    })
    
    if programs_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete faculty with {programs_count} active programs. Move or delete programs first."
        )
    
    await db.institution_faculties.update_one(
        {"faculty_id": faculty_id, "institution_id": institution_id},
        {"$set": {"is_active": False, "updated_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": "Faculty deleted successfully"
    }


# ==================== PROGRAM ENDPOINTS ====================

@router.get("")
async def get_programs(
    faculty_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get all programs, optionally filtered by faculty"""
    institution_id = current_user["user_id"]
    
    query = {"institution_id": institution_id, "is_active": True}
    
    if faculty_id:
        query["faculty_id"] = faculty_id
    if status_filter:
        query["status"] = status_filter
    if search:
        query["$or"] = [
            {"program_name": {"$regex": search, "$options": "i"}},
            {"program_code": {"$regex": search, "$options": "i"}},
            {"sub_faculty": {"$regex": search, "$options": "i"}}
        ]
    
    programs = await db.institution_programs.find(
        query,
        {"_id": 0}
    ).sort([("faculty_id", 1), ("display_order", 1)]).to_list(500)
    
    # Get faculty names for display
    faculty_ids = list(set(p["faculty_id"] for p in programs))
    faculties = await db.institution_faculties.find(
        {"faculty_id": {"$in": faculty_ids}},
        {"_id": 0, "faculty_id": 1, "faculty_name": 1, "icon": 1, "color": 1}
    ).to_list(100)
    faculty_map = {f["faculty_id"]: f for f in faculties}
    
    # Enrich programs with faculty info
    for program in programs:
        faculty = faculty_map.get(program["faculty_id"], {})
        program["faculty_name"] = faculty.get("faculty_name", "Unknown")
        program["faculty_icon"] = faculty.get("icon", "📚")
        program["faculty_color"] = faculty.get("color", "#3B82F6")
    
    # Group by faculty for frontend
    by_faculty = {}
    for program in programs:
        fid = program["faculty_id"]
        if fid not in by_faculty:
            by_faculty[fid] = {
                "faculty_id": fid,
                "faculty_name": program["faculty_name"],
                "faculty_icon": program["faculty_icon"],
                "faculty_color": program["faculty_color"],
                "programs": []
            }
        by_faculty[fid]["programs"].append(program)
    
    return {
        "success": True,
        "data": {
            "programs": programs,
            "by_faculty": list(by_faculty.values()),
            "count": len(programs)
        }
    }


@router.get("/{program_id}")
async def get_program(
    program_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get a single program with details"""
    institution_id = current_user["user_id"]
    
    program = await db.institution_programs.find_one(
        {"program_id": program_id, "institution_id": institution_id},
        {"_id": 0}
    )
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Get faculty info
    faculty = await db.institution_faculties.find_one(
        {"faculty_id": program["faculty_id"]},
        {"_id": 0, "faculty_name": 1, "icon": 1, "color": 1}
    )
    program["faculty_name"] = faculty.get("faculty_name") if faculty else "Unknown"
    program["faculty_icon"] = faculty.get("icon") if faculty else "📚"
    
    # Get cohort (class) stats
    cohorts = await db.institution_classes.find(
        {"institution_id": institution_id, "program_id": program_id},
        {"_id": 0}
    ).to_list(100)
    
    program["cohorts"] = cohorts
    program["total_cohorts"] = len(cohorts)
    program["active_cohorts"] = len([c for c in cohorts if c.get("status") == "active"])
    
    return {
        "success": True,
        "data": program
    }


@router.post("")
async def create_program(
    program_data: ProgramCreate,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Create a new program"""
    institution_id = current_user["user_id"]
    
    # Verify faculty exists
    faculty = await db.institution_faculties.find_one({
        "faculty_id": program_data.faculty_id,
        "institution_id": institution_id,
        "is_active": True
    })
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    # Check for duplicate program name in same faculty
    existing = await db.institution_programs.find_one({
        "institution_id": institution_id,
        "faculty_id": program_data.faculty_id,
        "program_name": program_data.program_name,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Program '{program_data.program_name}' already exists in this faculty"
        )
    
    # Get next display order
    last_program = await db.institution_programs.find_one(
        {"institution_id": institution_id, "faculty_id": program_data.faculty_id},
        sort=[("display_order", -1)]
    )
    next_order = (last_program.get("display_order", 0) + 1) if last_program else 0
    
    program = Program(
        institution_id=institution_id,
        faculty_id=program_data.faculty_id,
        program_name=program_data.program_name,
        program_code=program_data.program_code,
        sub_faculty=program_data.sub_faculty,
        description=program_data.description,
        marketing_name=program_data.marketing_name or program_data.program_name,
        credential_type=program_data.credential_type,
        duration_weeks=program_data.duration_weeks,
        duration_display=program_data.duration_display,
        validity_period_months=program_data.validity_period_months,
        delivery_mode=program_data.delivery_mode,
        outline_url=program_data.outline_url,
        status=program_data.status,
        display_order=next_order
    )
    
    await db.institution_programs.insert_one(program.model_dump())
    
    # Update faculty programs count
    await db.institution_faculties.update_one(
        {"faculty_id": program_data.faculty_id},
        {"$inc": {"programs_count": 1}}
    )
    
    return {
        "success": True,
        "data": {
            "program_id": program.program_id,
            "program_name": program.program_name,
            "faculty_name": faculty["faculty_name"]
        },
        "message": f"Program '{program.program_name}' created successfully"
    }


@router.put("/{program_id}")
async def update_program(
    program_id: str,
    program_data: ProgramUpdate,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Update a program"""
    institution_id = current_user["user_id"]
    
    program = await db.institution_programs.find_one({
        "program_id": program_id,
        "institution_id": institution_id
    })
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # If changing faculty, verify new faculty exists
    if program_data.faculty_id and program_data.faculty_id != program["faculty_id"]:
        new_faculty = await db.institution_faculties.find_one({
            "faculty_id": program_data.faculty_id,
            "institution_id": institution_id,
            "is_active": True
        })
        if not new_faculty:
            raise HTTPException(status_code=404, detail="New faculty not found")
        
        # Update old and new faculty counts
        await db.institution_faculties.update_one(
            {"faculty_id": program["faculty_id"]},
            {"$inc": {"programs_count": -1}}
        )
        await db.institution_faculties.update_one(
            {"faculty_id": program_data.faculty_id},
            {"$inc": {"programs_count": 1}}
        )
    
    update_data = {k: v for k, v in program_data.model_dump().items() if v is not None}
    update_data["updated_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.institution_programs.update_one(
        {"program_id": program_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Program updated successfully"
    }


@router.delete("/{program_id}")
async def delete_program(
    program_id: str,
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Soft delete a program (only if no cohorts)"""
    institution_id = current_user["user_id"]
    
    program = await db.institution_programs.find_one({
        "program_id": program_id,
        "institution_id": institution_id
    })
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Check if program has cohorts
    cohorts_count = await db.institution_classes.count_documents({
        "institution_id": institution_id,
        "program_id": program_id
    })
    
    if cohorts_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete program with {cohorts_count} cohorts. Archive or delete cohorts first."
        )
    
    await db.institution_programs.update_one(
        {"program_id": program_id},
        {"$set": {"is_active": False, "updated_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update faculty count
    await db.institution_faculties.update_one(
        {"faculty_id": program["faculty_id"]},
        {"$inc": {"programs_count": -1}}
    )
    
    return {
        "success": True,
        "message": "Program deleted successfully"
    }


# ==================== DASHBOARD STATS ====================

@router.get("/stats/overview")
async def get_programs_overview(
    current_user: dict = Depends(require_role("institution")),
    db = Depends(get_db)
):
    """Get programs overview for dashboard"""
    institution_id = current_user["user_id"]
    
    # Count faculties
    faculties_count = await db.institution_faculties.count_documents({
        "institution_id": institution_id,
        "is_active": True
    })
    
    # Count programs
    programs_count = await db.institution_programs.count_documents({
        "institution_id": institution_id,
        "is_active": True
    })
    
    # Count active programs
    active_programs = await db.institution_programs.count_documents({
        "institution_id": institution_id,
        "is_active": True,
        "status": "active"
    })
    
    # Programs by credential type
    pipeline = [
        {"$match": {"institution_id": institution_id, "is_active": True}},
        {"$group": {"_id": "$credential_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_credential_type = await db.institution_programs.aggregate(pipeline).to_list(20)
    
    # Programs by delivery mode
    pipeline = [
        {"$match": {"institution_id": institution_id, "is_active": True}},
        {"$group": {"_id": "$delivery_mode", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_delivery_mode = await db.institution_programs.aggregate(pipeline).to_list(10)
    
    return {
        "success": True,
        "data": {
            "faculties_count": faculties_count,
            "programs_count": programs_count,
            "active_programs": active_programs,
            "by_credential_type": by_credential_type,
            "by_delivery_mode": by_delivery_mode
        }
    }
