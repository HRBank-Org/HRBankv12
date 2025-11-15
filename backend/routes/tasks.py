from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.common import Task
from typing import Dict, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def get_db():
    from server import db
    return db

@router.post("/roles/{role_id}/tasks", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_task(
    role_id: str,
    task_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create task for a role (employer only)
    """
    
    # Verify role belongs to employer
    role = await db.roles.find_one({"role_id": role_id})
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    
    shift = await db.shifts.find_one({"shift_id": role["shift_id"]})
    workplace = await db.workplaces.find_one({"workplace_id": shift["workplace_id"]})
    
    if workplace["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Create task
    task = Task(
        role_id=role_id,
        task_title=task_data.get("task_title"),
        description=task_data.get("description"),
        priority=task_data.get("priority", "medium"),
        estimated_duration_minutes=task_data.get("estimated_duration_minutes"),
        assigned_to_workforce_id=task_data.get("assigned_to_workforce_id"),
        subtasks=task_data.get("subtasks", [])
    )
    
    await db.tasks.insert_one(task.model_dump())
    
    return {
        "success": True,
        "data": {"task_id": task.task_id},
        "message": "Task created"
    }

@router.get("/roles/{role_id}/tasks", response_model=Dict)
async def get_role_tasks(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all tasks for a role
    """
    
    tasks = await db.tasks.find(
        {"role_id": role_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": {"tasks": tasks}
    }

@router.patch("/tasks/{task_id}/status", response_model=Dict)
async def update_task_status(
    task_id: str,
    status_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Update task status (worker marks as in_progress or completed)
    """
    
    new_status = status_data.get("status")
    
    await db.tasks.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "status": new_status,
                "updated_date": datetime.utcnow().isoformat()
            }
        }
    )
    
    if new_status == "completed":
        await db.tasks.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "completion_date": datetime.utcnow().isoformat(),
                    "actual_duration_minutes": status_data.get("actual_duration_minutes")
                }
            }
        )
    
    return {
        "success": True,
        "message": "Task status updated"
    }
