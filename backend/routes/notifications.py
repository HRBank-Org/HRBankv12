from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from models.admin import Notification
from typing import Dict, List
from datetime import datetime
from utils.ai_translation import ai_translation_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Language code to name mapping
LANGUAGE_NAMES = {
    'en': 'English', 'fr': 'French', 'zh-CN': 'Mandarin', 'zh-HK': 'Cantonese',
    'pa': 'Punjabi', 'tl': 'Tagalog', 'es': 'Spanish', 'ar': 'Arabic',
    'hi': 'Hindi', 'ur': 'Urdu', 'fa': 'Persian', 'ps': 'Pashto',
    'ta': 'Tamil', 'pt': 'Portuguese', 'ko': 'Korean', 'vi': 'Vietnamese',
    'gu': 'Gujarati', 'ru': 'Russian', 'uk': 'Ukrainian', 'bn': 'Bengali', 'pl': 'Polish'
}

def get_db():
    from server import db
    return db

@router.get("/my-notifications", response_model=Dict)
async def get_my_notifications(
    unread_only: bool = False,
    limit: int = 20,
    translate: bool = True,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get notifications for current user with optional auto-translation
    """
    
    query = {"user_id": current_user["user_id"]}
    
    if unread_only:
        query["read_status"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_date", -1).limit(limit).to_list(limit)
    
    # Get user's preferred language
    user_id = current_user["user_id"]
    user_type = current_user.get("user_type", "workforce")
    
    preferred_language = 'en'  # Default to English
    
    if user_type == "workforce":
        profile = await db.workforce_profiles.find_one(
            {"workforce_id": user_id},
            {"preferred_language": 1}
        )
        if profile:
            preferred_language = profile.get("preferred_language", "en")
    elif user_type == "employer":
        profile = await db.employer_profiles.find_one(
            {"employer_id": user_id},
            {"preferred_language": 1}
        )
        if profile:
            preferred_language = profile.get("preferred_language", "en")
    
    # Translate notifications if not English
    if translate and preferred_language != 'en':
        target_lang = LANGUAGE_NAMES.get(preferred_language, preferred_language)
        
        for notification in notifications:
            # Only translate if not already in user's language
            if notification.get("original_language", "en") != preferred_language:
                try:
                    # Translate title
                    if notification.get("title"):
                        notification["title_translated"] = await ai_translation_service.translate_text(
                            notification["title"],
                            target_lang,
                            "notification"
                        )
                    
                    # Translate message
                    if notification.get("message"):
                        notification["message_translated"] = await ai_translation_service.translate_text(
                            notification["message"],
                            target_lang,
                            "notification"
                        )
                    
                    notification["translated_to"] = preferred_language
                except Exception as e:
                    # Keep original if translation fails
                    print(f"Translation error: {e}")
    
    # Count unread
    unread_count = await db.notifications.count_documents({
        "user_id": current_user["user_id"],
        "read_status": False
    })
    
    return {
        "success": True,
        "data": {
            "notifications": notifications,
            "unread_count": unread_count,
            "user_language": preferred_language
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
