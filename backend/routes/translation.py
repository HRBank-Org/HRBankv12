from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from utils.ai_translation import ai_translation_service
from typing import Dict

router = APIRouter(prefix="/translation", tags=["Translation"])

def get_db():
    from server import db
    return db

@router.post("/translate", response_model=Dict)
async def translate_text(
    translation_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Translate text using AI
    """
    
    text = translation_data.get("text")
    target_language = translation_data.get("target_language")
    context = translation_data.get("context", "general")
    
    if not text or not target_language:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text and target_language required"
        )
    
    translated = await ai_translation_service.translate_text(
        text=text,
        target_language=target_language,
        context=context
    )
    
    return {
        "success": True,
        "data": {
            "original": text,
            "translated": translated,
            "target_language": target_language
        }
    }

@router.patch("/users/me/language", response_model=Dict)
async def update_language_preference(
    language_data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Update user's preferred language
    """
    
    preferred_language = language_data.get("preferred_language")
    
    # Update user profile based on type
    if current_user["user_type"] == "workforce":
        await db.workforce_profiles.update_one(
            {"workforce_id": current_user["user_id"]},
            {"$set": {"preferred_language": preferred_language}}
        )
    
    return {
        "success": True,
        "message": "Language preference updated"
    }
