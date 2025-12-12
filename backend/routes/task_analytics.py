"""
Task Completion Analytics API
Endpoints for employers to view task completion metrics and KPIs
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime, timedelta
from auth.dependencies import get_current_user, require_role
from database import get_database

router = APIRouter(prefix="/employer/task-analytics", tags=["Task Analytics"])

@router.get("/overview")
async def get_task_analytics_overview(
    days: int = 30,
    current_user: dict = Depends(require_role("employer"))
):
    """Get overall task completion analytics for the employer"""
    db = await get_database()
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get all task completions for this employer's shifts
    completions = await db.task_completions.find({
        "employer_id": current_user["user_id"],
        "completed_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Get all shifts with tasks for this employer
    shifts = await db.calendar_shifts.find({
        "employer_id": current_user["user_id"],
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        },
        "$or": [
            {"standard_tasks": {"$exists": True, "$ne": []}},
            {"custom_tasks": {"$exists": True, "$ne": []}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Calculate metrics
    total_shifts_with_tasks = len(shifts)
    total_tasks = sum(
        len(shift.get("standard_tasks", [])) + len(shift.get("custom_tasks", []))
        for shift in shifts
    )
    total_completions = len(completions)
    
    completion_rate = (total_completions / total_tasks * 100) if total_tasks > 0 else 0
    
    # Get worker-wise breakdown
    worker_stats = {}
    for completion in completions:
        worker_id = completion.get("worker_id")
        if worker_id not in worker_stats:
            worker_stats[worker_id] = {"completed": 0, "total": 0}
        worker_stats[worker_id]["completed"] += 1
    
    # Add total tasks for each worker
    for shift in shifts:
        for worker in shift.get("assigned_workers", []):
            worker_id = worker.get("worker_id")
            if worker_id:
                if worker_id not in worker_stats:
                    worker_stats[worker_id] = {"completed": 0, "total": 0}
                worker_stats[worker_id]["total"] += len(shift.get("standard_tasks", [])) + len(shift.get("custom_tasks", []))
    
    # Get worker details
    worker_ids = list(worker_stats.keys())
    workers = await db.users.find(
        {"user_id": {"$in": worker_ids}},
        {"_id": 0, "user_id": 1, "first_name": 1, "last_name": 1}
    ).to_list(1000)
    
    worker_details = {}
    for worker in workers:
        worker_id = worker["user_id"]
        stats = worker_stats.get(worker_id, {})
        completed = stats.get("completed", 0)
        total = stats.get("total", 0)
        
        worker_details[worker_id] = {
            "worker_id": worker_id,
            "worker_name": f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip(),
            "tasks_completed": completed,
            "tasks_total": total,
            "completion_rate": (completed / total * 100) if total > 0 else 0
        }
    
    # Sort by completion rate
    top_performers = sorted(
        worker_details.values(),
        key=lambda x: x["completion_rate"],
        reverse=True
    )[:5]
    
    return {
        "success": True,
        "data": {
            "period_days": days,
            "total_shifts_with_tasks": total_shifts_with_tasks,
            "total_tasks": total_tasks,
            "total_completions": total_completions,
            "completion_rate": round(completion_rate, 1),
            "top_performers": top_performers,
            "worker_stats": list(worker_details.values())
        }
    }


@router.get("/by-shift/{shift_id}")
async def get_shift_task_details(
    shift_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Get detailed task completion status for a specific shift"""
    db = await get_database()
    
    # Get shift
    shift = await db.calendar_shifts.find_one({
        "shift_id": shift_id,
        "employer_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get task completions for this shift
    completions = await db.task_completions.find({
        "shift_id": shift_id
    }, {"_id": 0}).to_list(1000)
    
    # Build completion map
    completion_map = {}
    for comp in completions:
        task_text = comp.get("task_text")
        completion_map[task_text] = {
            "completed": comp.get("completed"),
            "completed_at": comp.get("completed_at"),
            "worker_id": comp.get("worker_id")
        }
    
    # Get all tasks
    standard_tasks = shift.get("standard_tasks", [])
    custom_tasks = shift.get("custom_tasks", [])
    
    task_details = []
    for task in standard_tasks:
        task_details.append({
            "task_text": task,
            "task_type": "standard",
            "completed": task in completion_map,
            "completion_info": completion_map.get(task)
        })
    
    for task in custom_tasks:
        task_details.append({
            "task_text": task,
            "task_type": "custom",
            "completed": task in completion_map,
            "completion_info": completion_map.get(task)
        })
    
    total_tasks = len(task_details)
    completed_tasks = sum(1 for t in task_details if t["completed"])
    
    return {
        "success": True,
        "data": {
            "shift": shift,
            "tasks": task_details,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }
    }


@router.get("/by-worker/{worker_id}")
async def get_worker_task_performance(
    worker_id: str,
    days: int = 30,
    current_user: dict = Depends(require_role("employer"))
):
    """Get task completion performance for a specific worker"""
    db = await get_database()
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get worker info
    worker = await db.users.find_one(
        {"user_id": worker_id},
        {"_id": 0, "first_name": 1, "last_name": 1, "email": 1}
    )
    
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Get task completions
    completions = await db.task_completions.find({
        "worker_id": worker_id,
        "employer_id": current_user["user_id"],
        "completed_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Get shifts assigned to this worker
    shifts = await db.calendar_shifts.find({
        "employer_id": current_user["user_id"],
        "assigned_workers.worker_id": worker_id,
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_tasks = sum(
        len(shift.get("standard_tasks", [])) + len(shift.get("custom_tasks", []))
        for shift in shifts
    )
    total_completions = len(completions)
    completion_rate = (total_completions / total_tasks * 100) if total_tasks > 0 else 0
    
    # Group by shift
    shift_performance = []
    for shift in shifts:
        shift_tasks = len(shift.get("standard_tasks", [])) + len(shift.get("custom_tasks", []))
        shift_completions = sum(
            1 for c in completions if c.get("shift_id") == shift.get("shift_id")
        )
        
        shift_performance.append({
            "shift_id": shift.get("shift_id"),
            "shift_date": shift.get("start_time"),
            "position_title": shift.get("position_title"),
            "workplace_name": shift.get("workplace_name"),
            "total_tasks": shift_tasks,
            "completed_tasks": shift_completions,
            "completion_rate": (shift_completions / shift_tasks * 100) if shift_tasks > 0 else 0
        })
    
    return {
        "success": True,
        "data": {
            "worker": {
                "worker_id": worker_id,
                "name": f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip(),
                "email": worker.get("email")
            },
            "period_days": days,
            "total_shifts": len(shifts),
            "total_tasks": total_tasks,
            "total_completions": total_completions,
            "completion_rate": round(completion_rate, 1),
            "shift_performance": shift_performance
        }
    }
