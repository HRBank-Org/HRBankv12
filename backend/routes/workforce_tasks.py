"""
Workforce Task Management API
Endpoints for workers to view and complete daily shift tasks
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime, timedelta
from auth.dependencies import get_current_user, require_role
from database import get_database
import uuid

router = APIRouter(prefix="/api/workforce", tags=["Workforce Tasks"])

@router.get("/my-shifts")
async def get_my_shifts(
    date: str,
    current_user: dict = Depends(require_role("workforce"))
):
    """Get all shifts for the logged-in worker on a specific date"""
    db = await get_database()
    
    # Parse the date to get start and end of day
    try:
        target_date = datetime.fromisoformat(date)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Find shifts where the worker is assigned
    shifts = await db.calendar_shifts.find({
        "assigned_workers.worker_id": current_user["user_id"],
        "start_time": {
            "$gte": start_of_day.isoformat(),
            "$lte": end_of_day.isoformat()
        }
    }, {"_id": 0}).sort("start_time", 1).to_list(100)
    
    # Extract relevant data for each shift
    shift_data = []
    for shift in shifts:
        shift_data.append({
            "shift_id": shift.get("shift_id"),
            "position_title": shift.get("position_title"),
            "role_name": shift.get("position_title"),  # Alias
            "workplace_name": shift.get("workplace_name"),
            "start_time": shift.get("start_time"),
            "end_time": shift.get("end_time"),
            "standard_tasks": shift.get("standard_tasks", []),
            "custom_tasks": shift.get("custom_tasks", []),
            "hourly_rate": shift.get("hourly_rate")
        })
    
    return {
        "success": True,
        "data": {
            "shifts": shift_data,
            "count": len(shift_data)
        }
    }


@router.get("/task-completions")
async def get_task_completions(
    date: str,
    current_user: dict = Depends(require_role("workforce"))
):
    """Get all task completions for the worker on a specific date"""
    db = await get_database()
    
    try:
        target_date = datetime.fromisoformat(date)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get all task completions for this worker on this date
    completions = await db.task_completions.find({
        "worker_id": current_user["user_id"],
        "completed_at": {
            "$gte": start_of_day.isoformat(),
            "$lte": end_of_day.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "completions": completions,
            "count": len(completions)
        }
    }


@router.post("/task-completions")
async def mark_task_complete(
    task_data: dict,
    current_user: dict = Depends(require_role("workforce"))
):
    """Mark a task as complete"""
    db = await get_database()
    
    shift_id = task_data.get("shift_id")
    task_text = task_data.get("task_text")
    task_type = task_data.get("task_type", "standard")  # 'standard' or 'custom'
    
    if not shift_id or not task_text:
        raise HTTPException(status_code=400, detail="shift_id and task_text are required")
    
    # Verify the shift exists and worker is assigned
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "assigned_workers.worker_id": current_user["user_id"]
    })
    
    if not shift:
        raise HTTPException(
            status_code=404, 
            detail="Shift not found or you are not assigned to this shift"
        )
    
    # Check if task actually exists in the shift
    all_tasks = shift.get("standard_tasks", []) + shift.get("custom_tasks", [])
    if task_text not in all_tasks:
        raise HTTPException(status_code=400, detail="Task not found in shift")
    
    # Check if already completed
    existing = await db.task_completions.find_one({
        "worker_id": current_user["user_id"],
        "shift_id": shift_id,
        "task_text": task_text
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Task already marked as complete")
    
    # Create completion record
    completion = {
        "task_completion_id": str(uuid.uuid4()),
        "worker_id": current_user["user_id"],
        "shift_id": shift_id,
        "task_text": task_text,
        "task_type": task_type,
        "completed": True,
        "completed_at": datetime.utcnow().isoformat(),
        "employer_id": shift.get("employer_id"),
        "workplace_id": shift.get("workplace_id")
    }
    
    await db.task_completions.insert_one(completion)
    
    return {
        "success": True,
        "data": completion,
        "message": "Task marked as complete"
    }


@router.delete("/task-completions/{completion_id}")
async def unmark_task_complete(
    completion_id: str,
    current_user: dict = Depends(require_role("workforce"))
):
    """Unmark a task (remove completion)"""
    db = await get_database()
    
    # Find the completion
    completion = await db.task_completions.find_one({
        "task_completion_id": completion_id,
        "worker_id": current_user["user_id"]
    })
    
    if not completion:
        raise HTTPException(status_code=404, detail="Task completion not found")
    
    # Delete the completion
    await db.task_completions.delete_one({
        "task_completion_id": completion_id
    })
    
    return {
        "success": True,
        "message": "Task unmarked"
    }
