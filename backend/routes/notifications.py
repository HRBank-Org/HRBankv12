from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.admin import Notification
from typing import Dict, List
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def get_db():
    from server import db
    return db

@router.get("/my-notifications", response_model=Dict)
async def get_my_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get notifications for current user
    """
    
    query = {"user_id": current_user["user_id"]}
    
    if unread_only:
        query["read_status"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_date", -1).limit(limit).to_list(limit)
    
    # Count unread
    unread_count = await db.notifications.count_documents({
        "user_id": current_user["user_id"],
        "read_status": False
    })
    
    return {
        "success": True,
        "data": {
            "notifications": notifications,
            "unread_count": unread_count
        }
    }

@router.post("/notifications/{notification_id}/read", response_model=Dict)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Mark notification as read
    """
    
    await db.notifications.update_one(
        {
            "notification_id": notification_id,
            "user_id": current_user["user_id"]
        },
        {
            "$set": {
                "read_status": True,
                "read_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Notification marked as read"
    }

@router.post("/mark-all-read", response_model=Dict)
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Mark all notifications as read
    """
    
    result = await db.notifications.update_many(
        {
            "user_id": current_user["user_id"],
            "read_status": False
        },
        {
            "$set": {
                "read_status": True,
                "read_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Marked {result.modified_count} notifications as read"
    }

async def create_notification(
    user_id: str,
    notification_type: str,
    notification_subtype: str,
    title: str,
    message: str,
    action_url: str = None,
    priority: str = "normal",
    db = None
):
    """
    Helper function to create notifications
    """
    
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        notification_subtype=notification_subtype,
        title=title,
        message=message,
        action_url=action_url,
        priority=priority
    )
    
    await db.notifications.insert_one(notification.model_dump())
    
    # TODO: Send push notification if enabled
    # TODO: Send email if enabled
    
    return notification.notification_id
