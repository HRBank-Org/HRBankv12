"""
Notification Preferences API
Manage user notification preferences
"""
from fastapi import APIRouter, Depends, HTTPException, status
from auth.dependencies import get_current_user
from models.notification_preferences import (
    WorkerNotificationPreferences,
    EmployerNotificationPreferences,
    WORKER_NOTIFICATION_TYPES,
    EMPLOYER_NOTIFICATION_TYPES
)
from database import get_database
from datetime import datetime, timezone
from typing import Dict

router = APIRouter(prefix="/api/notification-preferences", tags=["Notification Preferences"])


@router.get("/types")
async def get_notification_types(
    current_user: dict = Depends(get_current_user)
):
    """Get available notification types and their descriptions"""
    user_type = current_user.get("user_type")
    
    if user_type == "workforce":
        return {
            "success": True,
            "data": {
                "types": WORKER_NOTIFICATION_TYPES,
                "user_type": "workforce"
            }
        }
    elif user_type == "employer":
        return {
            "success": True,
            "data": {
                "types": EMPLOYER_NOTIFICATION_TYPES,
                "user_type": "employer"
            }
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user type"
        )


@router.get("/")
async def get_preferences(
    current_user: dict = Depends(get_current_user)
):
    """Get user's notification preferences"""
    db = await get_database()
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type")
    
    # Get preferences from database
    preferences = await db.notification_preferences.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    # If no preferences exist, create defaults
    if not preferences:
        if user_type == "workforce":
            default_prefs = WorkerNotificationPreferences(user_id=user_id)
        elif user_type == "employer":
            default_prefs = EmployerNotificationPreferences(user_id=user_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user type"
            )
        
        # Save defaults
        await db.notification_preferences.insert_one(default_prefs.model_dump())
        preferences = default_prefs.model_dump()
    
    return {
        "success": True,
        "data": preferences
    }


@router.put("/")
async def update_preferences(
    preferences_update: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    db = await get_database()
    user_id = current_user["user_id"]
    
    # Get existing preferences
    existing = await db.notification_preferences.find_one({"user_id": user_id})
    
    # Prepare update
    update_data = {
        **preferences_update,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if existing:
        # Update existing
        await db.notification_preferences.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
    else:
        # Create new
        update_data["user_id"] = user_id
        update_data["created_at"] = datetime.now(timezone.utc)
        await db.notification_preferences.insert_one(update_data)
    
    return {
        "success": True,
        "message": "Notification preferences updated successfully"
    }


@router.patch("/{notification_type}")
async def update_notification_type(
    notification_type: str,
    channel_settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a specific notification type's channel settings"""
    db = await get_database()
    user_id = current_user["user_id"]
    
    # Validate notification type exists
    user_type = current_user.get("user_type")
    valid_types = WORKER_NOTIFICATION_TYPES if user_type == "workforce" else EMPLOYER_NOTIFICATION_TYPES
    
    if notification_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid notification type: {notification_type}"
        )
    
    # Update specific notification type
    update_field = f"{notification_type}"
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {
            "$set": {
                update_field: channel_settings,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Updated preferences for {notification_type}"
    }


@router.post("/reset")
async def reset_to_defaults(
    current_user: dict = Depends(get_current_user)
):
    """Reset notification preferences to defaults"""
    db = await get_database()
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type")
    
    # Create default preferences
    if user_type == "workforce":
        default_prefs = WorkerNotificationPreferences(user_id=user_id)
    elif user_type == "employer":
        default_prefs = EmployerNotificationPreferences(user_id=user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user type"
        )
    
    # Replace existing preferences
    await db.notification_preferences.replace_one(
        {"user_id": user_id},
        default_prefs.model_dump(),
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Notification preferences reset to defaults"
    }


async def should_send_notification(db, user_id: str, notification_type: str, channel: str) -> bool:
    """
    Helper function to check if a notification should be sent
    
    Args:
        db: Database instance
        user_id: User ID
        notification_type: Type of notification (e.g., 'shift_assigned')
        channel: Notification channel ('email', 'sms', 'push')
    
    Returns:
        bool: True if notification should be sent
    """
    try:
        # Get user preferences
        preferences = await db.notification_preferences.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not preferences:
            # No preferences set, use defaults (send all)
            return True
        
        # Check if notification type exists in preferences
        if notification_type not in preferences:
            # Notification type not in preferences, send by default
            return True
        
        # Get channel settings for this notification type
        type_settings = preferences.get(notification_type, {})
        
        # Check if channel is enabled
        return type_settings.get(channel, True)
        
    except Exception as e:
        # On error, default to sending (fail open)
        print(f"Error checking notification preferences: {str(e)}")
        return True
