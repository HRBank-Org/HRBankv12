"""
Remote Work Management Routes
Handles remote/white-collar work with deliverables-based reporting
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from auth.dependencies import get_current_user, require_role
from database import get_database
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/remote-work", tags=["Remote Work"])


# ============== MODELS ==============

class DeliverableCreate(BaseModel):
    """Model for creating a deliverable"""
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    priority: str = "medium"  # low, medium, high, urgent


class DeliverableUpdate(BaseModel):
    """Model for updating a deliverable"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # pending, in_progress, submitted, approved, rejected
    due_date: Optional[str] = None
    actual_hours: Optional[float] = None
    submission_notes: Optional[str] = None
    submission_url: Optional[str] = None


class RemoteShiftCreate(BaseModel):
    """Model for creating a remote work shift"""
    workplace_id: str
    role_id: Optional[str] = None
    position_title: str
    worker_id: Optional[str] = None
    start_date: str
    end_date: str
    hourly_rate: float
    expected_hours: float
    deliverables: List[DeliverableCreate] = []
    notes: Optional[str] = None


# ============== SHIFT MANAGEMENT ==============

@router.post("/shifts")
async def create_remote_shift(
    shift_data: RemoteShiftCreate,
    current_user: dict = Depends(require_role("employer"))
):
    """Create a remote work shift with deliverables"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    # Verify workplace
    workplace = await db.workplaces.find_one({
        "workplace_id": shift_data.workplace_id,
        "employer_id": employer_id
    })
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Create deliverables with IDs
    deliverables = []
    for d in shift_data.deliverables:
        deliverables.append({
            "deliverable_id": f"del_{uuid.uuid4().hex[:12]}",
            "title": d.title,
            "description": d.description,
            "due_date": d.due_date,
            "estimated_hours": d.estimated_hours,
            "priority": d.priority,
            "status": "pending",
            "actual_hours": None,
            "submission_notes": None,
            "submission_url": None,
            "submitted_at": None,
            "reviewed_at": None,
            "reviewer_notes": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create the remote shift
    shift = {
        "shift_id": f"remote_{uuid.uuid4().hex[:12]}",
        "employer_id": employer_id,
        "workplace_id": shift_data.workplace_id,
        "workplace_name": workplace.get("workplace_name", ""),
        "role_id": shift_data.role_id,
        "position_title": shift_data.position_title,
        "worker_id": shift_data.worker_id,
        "worker_name": None,
        
        # Time period
        "start_date": shift_data.start_date,
        "end_date": shift_data.end_date,
        "start_time": f"{shift_data.start_date}T09:00:00",  # Default work hours
        "end_time": f"{shift_data.end_date}T17:00:00",
        
        # Work type
        "work_type": "remote",
        "shift_type": "remote",
        "source": "remote",
        
        # Pay
        "hourly_rate": shift_data.hourly_rate,
        "expected_hours": shift_data.expected_hours,
        "actual_hours": 0,
        "billable_hours": 0,
        
        # Deliverables
        "deliverables": deliverables,
        "total_deliverables": len(deliverables),
        "completed_deliverables": 0,
        "approved_deliverables": 0,
        
        # Status
        "status": "scheduled" if not shift_data.worker_id else "assigned",
        "notes": shift_data.notes,
        
        # Metadata
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": employer_id
    }
    
    # If worker assigned, get their name
    if shift_data.worker_id:
        worker = await db.users.find_one(
            {"user_id": shift_data.worker_id},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        if worker:
            shift["worker_name"] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
    
    # Insert into unified shifts collection
    await db.shifts.insert_one(shift)
    
    return {
        "success": True,
        "data": {k: v for k, v in shift.items() if k != "_id"},
        "message": "Remote work shift created successfully"
    }


@router.get("/shifts")
async def get_remote_shifts(
    status: Optional[str] = None,
    worker_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_role("employer"))
):
    """Get remote work shifts for employer"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    query = {
        "employer_id": employer_id,
        "work_type": "remote"
    }
    
    if status:
        query["status"] = status
    if worker_id:
        query["worker_id"] = worker_id
    if start_date and end_date:
        query["start_date"] = {"$gte": start_date, "$lte": end_date}
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_date", -1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "shifts": shifts,
            "count": len(shifts)
        }
    }


@router.get("/shifts/{shift_id}")
async def get_remote_shift_detail(
    shift_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed remote shift with deliverables"""
    db = await get_database()
    
    shift = await db.shifts.find_one(
        {"shift_id": shift_id, "work_type": "remote"},
        {"_id": 0}
    )
    
    if not shift:
        raise HTTPException(status_code=404, detail="Remote shift not found")
    
    # Check authorization
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type")
    
    if user_type == "employer" and shift.get("employer_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif user_type == "workforce" and shift.get("worker_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "success": True,
        "data": shift
    }


# ============== DELIVERABLE MANAGEMENT ==============

@router.post("/shifts/{shift_id}/deliverables")
async def add_deliverable(
    shift_id: str,
    deliverable: DeliverableCreate,
    current_user: dict = Depends(require_role("employer"))
):
    """Add a deliverable to an existing remote shift"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "employer_id": employer_id,
        "work_type": "remote"
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Remote shift not found")
    
    new_deliverable = {
        "deliverable_id": f"del_{uuid.uuid4().hex[:12]}",
        "title": deliverable.title,
        "description": deliverable.description,
        "due_date": deliverable.due_date,
        "estimated_hours": deliverable.estimated_hours,
        "priority": deliverable.priority,
        "status": "pending",
        "actual_hours": None,
        "submission_notes": None,
        "submission_url": None,
        "submitted_at": None,
        "reviewed_at": None,
        "reviewer_notes": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$push": {"deliverables": new_deliverable},
            "$inc": {"total_deliverables": 1},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "success": True,
        "data": new_deliverable,
        "message": "Deliverable added successfully"
    }


@router.put("/shifts/{shift_id}/deliverables/{deliverable_id}")
async def update_deliverable(
    shift_id: str,
    deliverable_id: str,
    update: DeliverableUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a deliverable (worker can submit, employer can review)"""
    db = await get_database()
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type")
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "work_type": "remote"
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Remote shift not found")
    
    # Find the deliverable
    deliverables = shift.get("deliverables", [])
    deliverable_idx = None
    for i, d in enumerate(deliverables):
        if d.get("deliverable_id") == deliverable_id:
            deliverable_idx = i
            break
    
    if deliverable_idx is None:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    # Authorize based on user type and action
    if user_type == "workforce":
        if shift.get("worker_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        # Workers can only update submission fields
        allowed_fields = ["status", "actual_hours", "submission_notes", "submission_url"]
        update_data = {k: v for k, v in update.model_dump(exclude_unset=True).items() if k in allowed_fields}
        
        if update_data.get("status") == "submitted":
            update_data["submitted_at"] = datetime.now(timezone.utc).isoformat()
    elif user_type == "employer":
        if shift.get("employer_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        update_data = update.model_dump(exclude_unset=True)
        
        if update_data.get("status") in ["approved", "rejected"]:
            update_data["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Apply updates
    for key, value in update_data.items():
        deliverables[deliverable_idx][key] = value
    
    # Recalculate counts
    completed = len([d for d in deliverables if d.get("status") in ["submitted", "approved"]])
    approved = len([d for d in deliverables if d.get("status") == "approved"])
    actual_hours = sum(d.get("actual_hours", 0) or 0 for d in deliverables if d.get("status") in ["submitted", "approved"])
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$set": {
                "deliverables": deliverables,
                "completed_deliverables": completed,
                "approved_deliverables": approved,
                "actual_hours": actual_hours,
                "billable_hours": actual_hours,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "data": deliverables[deliverable_idx],
        "message": "Deliverable updated successfully"
    }


# ============== WORKER ENDPOINTS ==============

@router.get("/worker/shifts")
async def get_worker_remote_shifts(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Get remote shifts assigned to a worker"""
    db = await get_database()
    worker_id = current_user["user_id"]
    
    query = {
        "worker_id": worker_id,
        "work_type": "remote"
    }
    
    if status:
        query["status"] = status
    
    shifts = await db.shifts.find(query, {"_id": 0}).sort("start_date", -1).to_list(50)
    
    return {
        "success": True,
        "data": {
            "shifts": shifts,
            "count": len(shifts)
        }
    }


@router.post("/worker/shifts/{shift_id}/log-time")
async def log_remote_time(
    shift_id: str,
    hours: float = Query(..., gt=0, le=24),
    notes: Optional[str] = None,
    deliverable_id: Optional[str] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Log time worked on a remote shift"""
    db = await get_database()
    worker_id = current_user["user_id"]
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "worker_id": worker_id,
        "work_type": "remote"
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Remote shift not found or not assigned to you")
    
    # Create time log entry
    time_log = {
        "log_id": f"tlog_{uuid.uuid4().hex[:8]}",
        "hours": hours,
        "notes": notes,
        "deliverable_id": deliverable_id,
        "logged_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update shift
    current_hours = shift.get("actual_hours", 0) or 0
    new_hours = current_hours + hours
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$push": {"time_logs": time_log},
            "$set": {
                "actual_hours": new_hours,
                "billable_hours": new_hours,
                "status": "in_progress" if shift.get("status") == "assigned" else shift.get("status"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "data": {
            "time_log": time_log,
            "total_hours": new_hours
        },
        "message": f"Logged {hours} hours successfully"
    }


@router.post("/worker/shifts/{shift_id}/submit")
async def submit_remote_shift(
    shift_id: str,
    summary: Optional[str] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Submit a remote shift for review"""
    db = await get_database()
    worker_id = current_user["user_id"]
    
    shift = await db.shifts.find_one({
        "shift_id": shift_id,
        "worker_id": worker_id,
        "work_type": "remote"
    })
    
    if not shift:
        raise HTTPException(status_code=404, detail="Remote shift not found")
    
    if shift.get("status") == "submitted":
        raise HTTPException(status_code=400, detail="Shift already submitted")
    
    await db.shifts.update_one(
        {"shift_id": shift_id},
        {
            "$set": {
                "status": "submitted",
                "submission_summary": summary,
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Shift submitted for review"
    }


# ============== REPORTING ==============

@router.get("/reports/summary")
async def get_remote_work_summary(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: dict = Depends(require_role("employer"))
):
    """Get summary report of remote work"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    pipeline = [
        {
            "$match": {
                "employer_id": employer_id,
                "work_type": "remote",
                "start_date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_shifts": {"$sum": 1},
                "total_expected_hours": {"$sum": "$expected_hours"},
                "total_actual_hours": {"$sum": "$actual_hours"},
                "total_deliverables": {"$sum": "$total_deliverables"},
                "completed_deliverables": {"$sum": "$completed_deliverables"},
                "approved_deliverables": {"$sum": "$approved_deliverables"},
                "total_cost": {"$sum": {"$multiply": ["$actual_hours", "$hourly_rate"]}}
            }
        }
    ]
    
    result = await db.shifts.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "success": True,
            "data": {
                "total_shifts": 0,
                "total_expected_hours": 0,
                "total_actual_hours": 0,
                "total_deliverables": 0,
                "completed_deliverables": 0,
                "approved_deliverables": 0,
                "total_cost": 0,
                "efficiency_rate": 0,
                "completion_rate": 0
            }
        }
    
    summary = result[0]
    summary.pop("_id", None)
    
    # Calculate rates
    if summary["total_deliverables"] > 0:
        summary["completion_rate"] = round(
            summary["completed_deliverables"] / summary["total_deliverables"] * 100, 1
        )
    else:
        summary["completion_rate"] = 0
    
    if summary["total_expected_hours"] > 0:
        summary["efficiency_rate"] = round(
            summary["total_actual_hours"] / summary["total_expected_hours"] * 100, 1
        )
    else:
        summary["efficiency_rate"] = 0
    
    return {
        "success": True,
        "data": summary
    }


@router.get("/reports/by-worker")
async def get_remote_work_by_worker(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: dict = Depends(require_role("employer"))
):
    """Get remote work report grouped by worker"""
    db = await get_database()
    employer_id = current_user["user_id"]
    
    pipeline = [
        {
            "$match": {
                "employer_id": employer_id,
                "work_type": "remote",
                "start_date": {"$gte": start_date, "$lte": end_date},
                "worker_id": {"$ne": None}
            }
        },
        {
            "$group": {
                "_id": "$worker_id",
                "worker_name": {"$first": "$worker_name"},
                "shifts": {"$sum": 1},
                "expected_hours": {"$sum": "$expected_hours"},
                "actual_hours": {"$sum": "$actual_hours"},
                "deliverables_assigned": {"$sum": "$total_deliverables"},
                "deliverables_completed": {"$sum": "$completed_deliverables"},
                "deliverables_approved": {"$sum": "$approved_deliverables"},
                "total_earned": {"$sum": {"$multiply": ["$actual_hours", "$hourly_rate"]}}
            }
        },
        {"$sort": {"actual_hours": -1}}
    ]
    
    results = await db.shifts.aggregate(pipeline).to_list(100)
    
    workers = []
    for r in results:
        workers.append({
            "worker_id": r["_id"],
            "worker_name": r.get("worker_name", "Unknown"),
            "shifts": r["shifts"],
            "expected_hours": r["expected_hours"],
            "actual_hours": r["actual_hours"],
            "deliverables_assigned": r["deliverables_assigned"],
            "deliverables_completed": r["deliverables_completed"],
            "deliverables_approved": r["deliverables_approved"],
            "total_earned": round(r["total_earned"], 2),
            "efficiency_rate": round(r["actual_hours"] / r["expected_hours"] * 100, 1) if r["expected_hours"] > 0 else 0,
            "approval_rate": round(r["deliverables_approved"] / r["deliverables_assigned"] * 100, 1) if r["deliverables_assigned"] > 0 else 0
        })
    
    return {
        "success": True,
        "data": {
            "workers": workers,
            "count": len(workers)
        }
    }
