"""
Auto-Dispatch Routes for Grid Services
======================================
API endpoints for automatic task dispatching to field service workers.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional
from datetime import datetime, timezone

from auth.dependencies import get_current_user, require_role
from services.auto_dispatch import auto_dispatch_service

router = APIRouter(prefix="/auto-dispatch", tags=["Auto-Dispatch"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db


@router.post("/task/{task_id}", response_model=Dict)
async def dispatch_single_task(
    task_id: str,
    dry_run: bool = Query(False, description="If true, only show recommendations without assigning"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Auto-dispatch a single service task to the best available worker.
    
    Uses scoring algorithm based on:
    - Geographic proximity
    - Worker availability
    - Skills match
    - Workload balancing
    - Worker preferences
    """
    
    # Verify task belongs to this employer
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = await auto_dispatch_service.auto_dispatch_task(db, task_id, dry_run=dry_run)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Dispatch failed"))
    
    return {
        "success": True,
        "data": result,
        "message": "Task recommendations generated" if dry_run else "Task dispatched successfully"
    }


@router.post("/bulk", response_model=Dict)
async def bulk_dispatch_tasks(
    workplace_id: Optional[str] = Query(None, description="Filter by workplace"),
    task_date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    dry_run: bool = Query(False, description="If true, only show recommendations"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Auto-dispatch multiple pending tasks at once.
    
    Automatically assigns all unassigned tasks to optimal workers.
    Use dry_run=true to preview assignments before committing.
    """
    
    result = await auto_dispatch_service.bulk_auto_dispatch(
        db=db,
        employer_id=current_user["user_id"],
        workplace_id=workplace_id,
        task_date=task_date,
        dry_run=dry_run
    )
    
    return {
        "success": True,
        "data": result,
        "message": f"Bulk dispatch {'preview' if dry_run else 'completed'}: {result['dispatched']} tasks"
    }


@router.get("/recommendations/{task_id}", response_model=Dict)
async def get_dispatch_recommendations(
    task_id: str,
    limit: int = Query(5, ge=1, le=20, description="Number of recommendations"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get worker recommendations for a task without assigning.
    
    Returns ranked list of available workers with dispatch scores.
    """
    
    # Verify task belongs to this employer
    task = await db.service_tasks.find_one(
        {"task_id": task_id, "employer_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = await auto_dispatch_service.auto_dispatch_task(db, task_id, dry_run=True)
    
    if not result.get("success"):
        return {
            "success": False,
            "data": {
                "task_id": task_id,
                "recommendations": [],
                "message": result.get("error", "No workers available")
            }
        }
    
    return {
        "success": True,
        "data": {
            "task_id": task_id,
            "recommendations": result.get("recommendations", [])[:limit],
            "best_match": result.get("best_match")
        }
    }


@router.get("/stats", response_model=Dict)
async def get_dispatch_stats(
    workplace_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Get auto-dispatch statistics for the employer.
    
    Returns metrics on dispatch performance, worker utilization, etc.
    """
    
    # Build query
    query = {"employer_id": current_user["user_id"]}
    
    if workplace_id:
        query["workplace_id"] = workplace_id
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["scheduled_date"] = date_query
    
    # Get task statistics
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_tasks": {"$sum": 1},
            "auto_dispatched": {
                "$sum": {"$cond": [{"$eq": ["$dispatch_method", "auto"]}, 1, 0]}
            },
            "manual_dispatched": {
                "$sum": {"$cond": [{"$ne": ["$dispatch_method", "auto"]}, 1, 0]}
            },
            "pending": {
                "$sum": {"$cond": [{"$in": ["$status", ["pending", "unassigned"]]}, 1, 0]}
            },
            "completed": {
                "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
            },
            "avg_dispatch_score": {"$avg": "$dispatch_score"}
        }}
    ]
    
    result = await db.service_tasks.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_tasks": 0,
        "auto_dispatched": 0,
        "manual_dispatched": 0,
        "pending": 0,
        "completed": 0,
        "avg_dispatch_score": None
    }
    
    # Remove MongoDB _id
    stats.pop("_id", None)
    
    # Calculate percentages
    total = stats["total_tasks"]
    if total > 0:
        stats["auto_dispatch_rate"] = round((stats["auto_dispatched"] / total) * 100, 1)
        stats["completion_rate"] = round((stats["completed"] / total) * 100, 1)
    else:
        stats["auto_dispatch_rate"] = 0
        stats["completion_rate"] = 0
    
    return {
        "success": True,
        "data": stats
    }


@router.put("/config", response_model=Dict)
async def update_dispatch_config(
    config: dict,
    current_user: dict = Depends(require_role("employer")),
    db = Depends(get_db)
):
    """
    Update auto-dispatch configuration for the employer.
    
    Configurable options:
    - max_distance_km: Maximum distance for worker assignment
    - max_daily_tasks: Maximum tasks per worker per day
    - buffer_minutes: Buffer time between tasks
    - priority_weights: Weighting for dispatch scoring factors
    """
    
    allowed_keys = ["max_distance_km", "max_daily_tasks", "buffer_minutes", "priority_weights"]
    
    # Filter to allowed keys
    filtered_config = {k: v for k, v in config.items() if k in allowed_keys}
    
    if not filtered_config:
        raise HTTPException(status_code=400, detail="No valid configuration options provided")
    
    # Validate values
    if "max_distance_km" in filtered_config:
        if not 1 <= filtered_config["max_distance_km"] <= 100:
            raise HTTPException(status_code=400, detail="max_distance_km must be between 1 and 100")
    
    if "max_daily_tasks" in filtered_config:
        if not 1 <= filtered_config["max_daily_tasks"] <= 20:
            raise HTTPException(status_code=400, detail="max_daily_tasks must be between 1 and 20")
    
    if "buffer_minutes" in filtered_config:
        if not 0 <= filtered_config["buffer_minutes"] <= 120:
            raise HTTPException(status_code=400, detail="buffer_minutes must be between 0 and 120")
    
    # Save to employer settings
    await db.employer_profiles.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"dispatch_config": filtered_config}},
        upsert=True
    )
    
    return {
        "success": True,
        "data": filtered_config,
        "message": "Dispatch configuration updated"
    }
