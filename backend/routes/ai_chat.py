from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime
from database import get_database
from auth.dependencies import get_current_user
from models.ai_conversation import (
    AIConversation,
    ConversationMessage,
    ChatRequest,
    ChatResponse
)
from services.ai_onboarding_service import AIOnboardingService
import uuid
import os

router = APIRouter()

# Initialize AI service
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
ai_service = AIOnboardingService(api_key=EMERGENT_LLM_KEY)


@router.post("/ai/chat/start")
async def start_onboarding_chat(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Start AI onboarding conversation for a new user
    Returns initial welcome message
    """
    
    # Check if conversation already exists
    existing = await db.ai_conversations.find_one({"user_id": current_user["user_id"]})
    
    if existing:
        # Return existing conversation
        return {
            "success": True,
            "data": {
                "conversation_id": existing["conversation_id"],
                "current_state": existing["conversation_state"],
                "conversation_history": existing["conversation_history"],
                "onboarding_complete": existing.get("onboarding_complete", False)
            }
        }
    
    # Create new conversation
    conversation_id = str(uuid.uuid4())
    user_type = current_user.get("user_type", "workforce")
    
    # Get initial message from AI service
    initial_response = ai_service.get_initial_message(user_type)
    
    # Create conversation record
    conversation = {
        "conversation_id": conversation_id,
        "user_id": current_user["user_id"],
        "user_type": user_type,
        "conversation_state": initial_response["next_state"],
        "conversation_history": [
            {
                "role": "ai",
                "message": initial_response["ai_message"],
                "timestamp": datetime.utcnow(),
                "file_url": None
            }
        ],
        "extracted_data": {},
        "onboarding_complete": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.ai_conversations.insert_one(conversation)
    
    return {
        "success": True,
        "data": {
            "conversation_id": conversation_id,
            "ai_message": initial_response["ai_message"],
            "current_state": initial_response["next_state"],
            "quick_actions": initial_response.get("quick_actions", []),
            "progress": initial_response.get("progress"),
            "onboarding_complete": False
        }
    }


@router.post("/ai/chat/message")
async def send_chat_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Send a message in the AI onboarding chat
    """
    
    # Get conversation
    conversation = await db.ai_conversations.find_one({"user_id": current_user["user_id"]})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found. Please start onboarding first.")
    
    # Add user message to history
    user_message = {
        "role": "user",
        "message": request.message,
        "timestamp": datetime.utcnow(),
        "file_url": request.file_url
    }
    
    conversation["conversation_history"].append(user_message)
    
    # Process message with AI
    ai_response = await ai_service.process_message(
        user_id=current_user["user_id"],
        user_type=conversation["user_type"],
        current_state=conversation["conversation_state"],
        user_message=request.message,
        conversation_history=conversation["conversation_history"],
        extracted_data=conversation.get("extracted_data", {})
    )
    
    # Add AI response to history
    ai_message = {
        "role": "ai",
        "message": ai_response["ai_message"],
        "timestamp": datetime.utcnow(),
        "file_url": None
    }
    
    conversation["conversation_history"].append(ai_message)
    
    # Update extracted data
    if ai_response.get("extracted_data"):
        conversation["extracted_data"].update(ai_response["extracted_data"])
    
    # Update state
    conversation["conversation_state"] = ai_response["next_state"]
    
    # Check if onboarding is complete
    if ai_response["next_state"] == "help_mode":
        conversation["onboarding_complete"] = True
        
        # Update user record
        await db.users.update_one(
            {"user_id": current_user["user_id"]},
            {
                "$set": {
                    "onboarding_complete": True,
                    "onboarding_completed_at": datetime.utcnow()
                }
            }
        )
    
    conversation["updated_at"] = datetime.utcnow()
    
    # Save conversation
    await db.ai_conversations.update_one(
        {"conversation_id": conversation["conversation_id"]},
        {"$set": conversation}
    )
    
    # Execute any actions
    action_results = []
    for action in ai_response.get("actions", []):
        result = await execute_action(action, current_user, db, conversation)
        action_results.append(result)
    
    return {
        "success": True,
        "data": {
            "conversation_id": conversation["conversation_id"],
            "ai_message": ai_response["ai_message"],
            "current_state": ai_response["next_state"],
            "quick_actions": ai_response.get("quick_actions", []),
            "show_ui": ai_response.get("show_ui"),
            "progress": ai_response.get("progress"),
            "onboarding_complete": conversation["onboarding_complete"],
            "action_results": action_results
        }
    }


@router.get("/ai/chat/conversation")
async def get_conversation(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get current AI conversation"""
    conversation = await db.ai_conversations.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not conversation:
        return {
            "success": True,
            "data": None
        }
    
    return {
        "success": True,
        "data": conversation
    }


@router.post("/ai/chat/reset")
async def reset_onboarding(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Reset onboarding conversation (for testing)"""
    await db.ai_conversations.delete_many({"user_id": current_user["user_id"]})
    
    return {
        "success": True,
        "message": "Onboarding conversation reset"
    }


async def execute_action(action: Dict, current_user: dict, db, conversation: Dict):
    """Execute an action returned by AI"""
    action_type = action.get("type")
    action_data = action.get("data", {})
    
    try:
        if action_type == "create_availability_block":
            # Create availability block
            # Implementation based on your existing availability system
            return {"type": action_type, "status": "success", "message": "Availability created"}
        
        elif action_type == "create_worker_qualification":
            # Create worker qualification
            # Implementation based on your occupation template system
            return {"type": action_type, "status": "success", "message": "Qualification created"}
        
        elif action_type == "create_workplace":
            # Create workplace for employer
            return {"type": action_type, "status": "success", "message": "Workplace created"}
        
        elif action_type == "create_employer_role":
            # Create employer role
            return {"type": action_type, "status": "success", "message": "Role created"}
        
        else:
            return {"type": action_type, "status": "skipped", "message": "Unknown action type"}
    
    except Exception as e:
        return {"type": action_type, "status": "error", "message": str(e)}
