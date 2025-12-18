"""
Service Task Routes for Field Service Work Mode

Handles task CRUD, check-in/out, and routing for field service workers.
This is separate from role-based tasks - these are location-based service visits.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional, List
from datetime import datetime, timezone
from math import radians, sin, cos, sqrt, atan2

from config.database import get_db
from middleware.auth import get_current_user, require_role
from models.tasks import (
    Task, TaskStatus, TaskType, TaskAddress, TaskCheckIn,
    WorkBlock, CreateTaskRequest, TaskCheckInRequest
)

router = APIRouter(prefix="/service-tasks", tags=["service-tasks"])


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


@router.post("", response_model=Dict)
async def create_service_task(
    task_data: CreateTaskRequest,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Create a new service task for a field service workplace.
    Can be called by employer directly or via external integration (CleanGrid).
    """
    # Verify workplace exists and is field service mode
    workplace = await db.workplaces.find_one(
        {"workplace_id": task_data.workplace_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    if workplace.get("work_mode") != "field_service":
        raise HTTPException(
            status_code=400, 
            detail="Service tasks can only be created for field service workplaces"
        )
    
    # Extract FSA from postal code
    fsa = task_data.postal_code[:3].upper() if task_data.postal_code else None
    
    # Verify FSA is in workplace's service territory (if service_fsas is defined)
    service_fsas = workplace.get("service_fsas", [])
    if service_fsas and fsa and fsa not in service_fsas:
        raise HTTPException(
            status_code=400,
            detail=f"FSA {fsa} is not in this workplace's service territory. Served FSAs: {', '.join(service_fsas)}"
        )
    
    # Create task address
    address = TaskAddress(
        street_address=task_data.street_address,
        unit_number=task_data.unit_number,
        city=task_data.city,
        province=task_data.province,
        postal_code=task_data.postal_code,
        fsa=fsa,
        client_name=task_data.client_name,
        client_phone=task_data.client_phone,
        access_notes=task_data.access_notes
    )
    
    # Create task
    task = Task(
        employer_id=current_user["user_id"],
        workplace_id=task_data.workplace_id,
        worker_id=task_data.worker_id,
        work_block_id=task_data.work_block_id,
        external_ref=task_data.external_ref,
        external_source=task_data.external_source,
        task_type=task_data.task_type,
        title=task_data.title,
        description=task_data.description,
        address=address,
        scheduled_date=task_data.scheduled_date,
        scheduled_start_time=task_data.scheduled_start_time,
        scheduled_end_time=task_data.scheduled_end_time,
        estimated_duration_minutes=task_data.estimated_duration_minutes,
        priority=task_data.priority,
        billing_amount=task_data.billing_amount,
        status=TaskStatus.ASSIGNED if task_data.worker_id else TaskStatus.PENDING
    )
    
    # Save to database
    await db.service_tasks.insert_one(task.model_dump())
    
    return {
        "success": True,
        "data": {"task_id": task.task_id},
        "message": "Service task created successfully"
    }


@router.get("", response_model=Dict)
async def get_service_tasks(
    workplace_id: Optional[str] = None,
    worker_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,  # YYYY-MM-DD
    fsa: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get service tasks with optional filters.
    Employers see all tasks for their workplaces.
    Workers see only their assigned tasks.
    """
    query = {}
    
    if current_user.get("user_type") == "employer":
        query["employer_id"] = current_user["user_id"]
        if workplace_id:
            query["workplace_id"] = workplace_id
        if worker_id:
            query["worker_id"] = worker_id
    else:
        # Worker - only see their tasks
        query["worker_id"] = current_user["user_id"]
    
    if status:
        query["status"] = status
    
    if date:
        query["scheduled_date"] = date
    
    if fsa:
        query["address.fsa"] = fsa.upper()
    
    tasks = await db.service_tasks.find(query, {"_id": 0}).sort("scheduled_start_time", 1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "tasks": tasks,
            "count": len(tasks)
        }
    }


@router.get("/route/{date_str}", response_model=Dict)
async def get_worker_route(
    date_str: str,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Get worker's task route for a specific date.
    Returns tasks in route order with estimated travel times.
    """
    tasks = await db.service_tasks.find(
        {
            "worker_id": current_user["user_id"],
            "scheduled_date": date_str,
            "status": {"$nin": [TaskStatus.CANCELLED.value]}
        },
        {"_id": 0}
    ).sort("route_order", 1).to_list(50)
    
    # Calculate totals
    total_duration = sum(t.get("estimated_duration_minutes", 60) for t in tasks)
    completed = len([t for t in tasks if t.get("status") == TaskStatus.COMPLETED.value])
    
    # Get work block if exists
    work_block = await db.work_blocks.find_one(
        {
            "worker_id": current_user["user_id"],
            "date": date_str
        },
        {"_id": 0}
    )
    
    return {
        "success": True,
        "data": {
            "date": date_str,
            "work_block_id": work_block.get("work_block_id") if work_block else None,
            "total_tasks": len(tasks),
            "completed_tasks": completed,
            "tasks": tasks,
            "estimated_total_duration_minutes": total_duration,
            "estimated_travel_minutes": len(tasks) * 15  # Rough estimate
        }
    }


@router.get("/{task_id}", response_model=Dict)
async def get_service_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get a single service task by ID"""
    query = {"task_id": task_id}
    
    if current_user.get("user_type") == "employer":
        query["employer_id"] = current_user["user_id"]
    else:
        query["worker_id"] = current_user["user_id"]
    
    task = await db.service_tasks.find_one(query, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "success": True,
        "data": {"task": task}
    }


@router.patch("/{task_id}", response_model=Dict)
async def update_service_task(
    task_id: str,
    updates: Dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Update service task details (employer only)"""
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Don't allow updating completed/cancelled tasks
    if task.get("status") in [TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]:
        raise HTTPException(status_code=400, detail="Cannot update completed or cancelled tasks")
    
    # Allowed update fields
    allowed_fields = [
        "title", "description", "worker_id", "work_block_id",
        "scheduled_date", "scheduled_start_time", "scheduled_end_time",
        "estimated_duration_minutes", "priority", "route_order",
        "billing_amount", "status"
    ]
    
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.service_tasks.update_one(
        {"task_id": task_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Task updated successfully"
    }


@router.post("/{task_id}/assign", response_model=Dict)
async def assign_service_task(
    task_id: str,
    worker_id: str,
    work_block_id: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Assign a service task to a worker"""
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.service_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "worker_id": worker_id,
            "work_block_id": work_block_id,
            "status": TaskStatus.ASSIGNED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Task assigned to worker {worker_id}"
    }


@router.post("/{task_id}/check-in", response_model=Dict)
async def check_in_task(
    task_id: str,
    check_in_data: TaskCheckInRequest,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker checks in at task location.
    GPS must be within geofence radius of task address.
    """
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "worker_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")
    
    if task.get("status") not in [TaskStatus.ASSIGNED.value, TaskStatus.EN_ROUTE.value]:
        raise HTTPException(status_code=400, detail=f"Cannot check in to task with status: {task.get('status')}")
    
    if task.get("check_in"):
        raise HTTPException(status_code=400, detail="Already checked in to this task")
    
    # Calculate distance from task location
    task_address = task.get("address", {})
    task_lat = task_address.get("latitude")
    task_lon = task_address.get("longitude")
    
    distance_m = None
    verified = False
    
    if task_lat and task_lon:
        distance_m = calculate_distance(
            check_in_data.latitude, check_in_data.longitude,
            task_lat, task_lon
        )
        geofence_radius = task.get("geofence_radius_m", 100)
        verified = distance_m <= geofence_radius
        
        if not verified:
            raise HTTPException(
                status_code=400,
                detail=f"Too far from task location. Distance: {int(distance_m)}m, Required: within {geofence_radius}m"
            )
    else:
        # No GPS coordinates for task - allow check-in but mark as unverified
        verified = False
    
    check_in = TaskCheckIn(
        timestamp=datetime.now(timezone.utc),
        latitude=check_in_data.latitude,
        longitude=check_in_data.longitude,
        accuracy_m=check_in_data.accuracy_m,
        distance_from_task_m=distance_m,
        verified=verified,
        verification_method="gps"
    )
    
    await db.service_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "check_in": check_in.model_dump(),
            "actual_start_time": datetime.now(timezone.utc).isoformat(),
            "status": TaskStatus.IN_PROGRESS.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {
            "verified": verified,
            "distance_m": int(distance_m) if distance_m else None,
            "check_in_time": check_in.timestamp.isoformat()
        },
        "message": "Checked in successfully"
    }


@router.post("/{task_id}/check-out", response_model=Dict)
async def check_out_task(
    task_id: str,
    check_out_data: TaskCheckInRequest,
    current_user: dict = Depends(require_role("workforce")),
    db = Depends(get_db)
):
    """
    Worker checks out from task location.
    Completes the task and calculates actual duration.
    """
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "worker_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")
    
    if task.get("status") != TaskStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=400, detail="Must be checked in before checking out")
    
    if task.get("check_out"):
        raise HTTPException(status_code=400, detail="Already checked out from this task")
    
    # Calculate distance
    task_address = task.get("address", {})
    task_lat = task_address.get("latitude")
    task_lon = task_address.get("longitude")
    
    distance_m = None
    verified = False
    
    if task_lat and task_lon:
        distance_m = calculate_distance(
            check_out_data.latitude, check_out_data.longitude,
            task_lat, task_lon
        )
        geofence_radius = task.get("geofence_radius_m", 100)
        verified = distance_m <= geofence_radius
    
    check_out = TaskCheckIn(
        timestamp=datetime.now(timezone.utc),
        latitude=check_out_data.latitude,
        longitude=check_out_data.longitude,
        accuracy_m=check_out_data.accuracy_m,
        distance_from_task_m=distance_m,
        verified=verified,
        verification_method="gps"
    )
    
    # Calculate actual duration
    check_in_time = task.get("actual_start_time")
    actual_duration = None
    if check_in_time:
        if isinstance(check_in_time, str):
            check_in_time = datetime.fromisoformat(check_in_time.replace('Z', '+00:00'))
        delta = datetime.now(timezone.utc) - check_in_time
        actual_duration = int(delta.total_seconds() / 60)
    
    await db.service_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "check_out": check_out.model_dump(),
            "actual_end_time": datetime.now(timezone.utc).isoformat(),
            "actual_duration_minutes": actual_duration,
            "status": TaskStatus.COMPLETED.value,
            "notes": check_out_data.notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {
            "verified": verified,
            "distance_m": int(distance_m) if distance_m else None,
            "actual_duration_minutes": actual_duration,
            "check_out_time": check_out.timestamp.isoformat()
        },
        "message": "Checked out successfully. Task completed!"
    }


@router.post("/{task_id}/cancel", response_model=Dict)
async def cancel_task(
    task_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Cancel a service task"""
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("status") == TaskStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed task")
    
    await db.service_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "status": TaskStatus.CANCELLED.value,
            "notes": reason or task.get("notes"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Task cancelled"
    }


# ==================== Work Block Routes ====================

@router.post("/work-blocks", response_model=Dict)
async def create_work_block(
    workplace_id: str,
    date: str,
    scheduled_start_time: str,
    scheduled_end_time: str,
    worker_id: Optional[str] = None,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """Create a work block for a field service worker"""
    work_block = WorkBlock(
        employer_id=current_user["user_id"],
        workplace_id=workplace_id,
        worker_id=worker_id,
        date=date,
        scheduled_start_time=scheduled_start_time,
        scheduled_end_time=scheduled_end_time
    )
    
    await db.work_blocks.insert_one(work_block.model_dump())
    
    return {
        "success": True,
        "data": {"work_block_id": work_block.work_block_id},
        "message": "Work block created"
    }


@router.get("/work-blocks", response_model=Dict)
async def get_work_blocks(
    workplace_id: Optional[str] = None,
    worker_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get work blocks with optional filters"""
    query = {}
    
    if current_user.get("user_type") == "employer":
        query["employer_id"] = current_user["user_id"]
        if workplace_id:
            query["workplace_id"] = workplace_id
        if worker_id:
            query["worker_id"] = worker_id
    else:
        query["worker_id"] = current_user["user_id"]
    
    if date:
        query["date"] = date
    
    work_blocks = await db.work_blocks.find(query, {"_id": 0}).sort("date", -1).to_list(50)
    
    return {
        "success": True,
        "data": {
            "work_blocks": work_blocks,
            "count": len(work_blocks)
        }
    }
