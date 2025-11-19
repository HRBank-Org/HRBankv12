"""
AI Agent Routes - Customer Service Chatbot for HR Bank
Provides AI assistance for profile completion, document issues, and general help
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from auth.dependencies import get_current_user
from database import get_db

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    success: bool
    data: Dict


def get_system_message(user_type: str, user_name: str) -> str:
    """Generate system message based on user type"""
    
    if user_type == "workforce":
        return f"""You are Suzie, a friendly and helpful HR Bank assistant for workforce members.

Your role:
- Help workers understand profile completion requirements
- Explain document expiry issues and how to resolve them
- Assist with availability, shifts, and timesheets
- Answer questions about the platform
- Provide guidance in a warm, supportive tone

The user's name is {user_name}. Be personable and helpful.

Platform context:
- Workers need to complete their profile with personal info, certifications, and work history
- Required documents (e.g., work permits, certifications) must be uploaded and verified
- Expired documents will restrict account access
- Workers can set availability and view assigned shifts
- Workers can clock in/out and view timesheets

Keep responses concise and actionable. Always be encouraging and supportive."""

    else:  # employer or institution
        return f"""You are Emma, a professional HR Bank assistant for employers and business managers.

Your role:
- Help employers with workplace setup and workforce management
- Explain compliance requirements (WSIB, T4, etc.)
- Assist with shift scheduling and roster management
- Answer questions about the platform
- Provide guidance in a professional, efficient tone

The user's name is {user_name}. Be professional and knowledgeable.

Platform context:
- Employers need to complete company profile and compliance verification
- Required documents (business license, WSIB, insurance) must be current
- Employers can create workplaces, post shifts, and manage workforce
- System tracks attendance, hours, and payroll calculations
- Employers can communicate with workers through the platform

Keep responses clear, professional, and focused on business efficiency."""


@router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_agent(
    request: ChatMessageRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Send a message to the AI agent and get a response
    Maintains conversation history per user
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        user_id = current_user["user_id"]
        user_type = current_user["user_type"]
        
        # Get user's name for personalization
        if user_type == "workforce":
            profile = await db.workforce_profiles.find_one({"user_id": user_id})
            user_name = profile.get("full_name", "there") if profile else "there"
        elif user_type == "employer":
            profile = await db.employer_profiles.find_one({"user_id": user_id})
            user_name = profile.get("contact_name", "there") if profile else "there"
        else:
            profile = await db.institution_profiles.find_one({"user_id": user_id})
            user_name = profile.get("contact_name", "there") if profile else "there"
        
        # Get or create conversation thread
        thread = await db.agent_conversations.find_one({
            "user_id": user_id
        })
        
        if not thread:
            # Create new conversation
            thread_id = f"agent_{user_id}"
            thread = {
                "thread_id": thread_id,
                "user_id": user_id,
                "user_type": user_type,
                "created_date": datetime.utcnow().isoformat(),
                "last_message_date": datetime.utcnow().isoformat(),
                "message_count": 0
            }
            await db.agent_conversations.insert_one(thread)
        else:
            thread_id = thread["thread_id"]
        
        # Initialize AI chat
        api_key = os.getenv("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=thread_id,
            system_message=get_system_message(user_type, user_name)
        ).with_model("openai", "gpt-4.5-preview")
        
        # Send user message to AI
        user_message = UserMessage(text=request.message)
        ai_response = await chat.send_message(user_message)
        
        # Save user message to database
        user_msg_doc = {
            "message_id": f"msg_{user_id}_{datetime.utcnow().timestamp()}",
            "thread_id": thread_id,
            "sender_id": user_id,
            "sender_type": "user",
            "message_text": request.message,
            "created_date": datetime.utcnow().isoformat()
        }
        await db.agent_messages.insert_one(user_msg_doc)
        
        # Save AI response to database
        ai_msg_doc = {
            "message_id": f"msg_ai_{datetime.utcnow().timestamp()}",
            "thread_id": thread_id,
            "sender_id": "ai_agent",
            "sender_type": "agent",
            "message_text": ai_response,
            "created_date": datetime.utcnow().isoformat()
        }
        await db.agent_messages.insert_one(ai_msg_doc)
        
        # Update conversation thread
        await db.agent_conversations.update_one(
            {"thread_id": thread_id},
            {
                "$set": {
                    "last_message_date": datetime.utcnow().isoformat(),
                    "last_message": ai_response[:100]
                },
                "$inc": {"message_count": 2}
            }
        )
        
        return {
            "success": True,
            "data": {
                "message": ai_response,
                "thread_id": thread_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        print(f"AI Agent Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")


@router.get("/history", response_model=Dict)
async def get_conversation_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get the conversation history with the AI agent
    """
    try:
        user_id = current_user["user_id"]
        
        # Get conversation thread
        thread = await db.agent_conversations.find_one({"user_id": user_id})
        
        if not thread:
            return {
                "success": True,
                "data": {
                    "messages": [],
                    "agent_name": "Suzie" if current_user["user_type"] == "workforce" else "Emma"
                }
            }
        
        # Get messages
        messages_cursor = db.agent_messages.find(
            {"thread_id": thread["thread_id"]}
        ).sort("created_date", 1)
        
        messages = await messages_cursor.to_list(length=None)
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "message_id": msg["message_id"],
                "sender_type": msg["sender_type"],
                "message_text": msg["message_text"],
                "created_date": msg["created_date"]
            })
        
        return {
            "success": True,
            "data": {
                "messages": formatted_messages,
                "agent_name": "Suzie" if current_user["user_type"] == "workforce" else "Emma",
                "thread_id": thread["thread_id"]
            }
        }
        
    except Exception as e:
        print(f"Get History Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load history: {str(e)}")


@router.get("/thread-info", response_model=Dict)
async def get_agent_thread_info(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get agent thread information for display in messages list
    Returns agent name, last message, unread count, etc.
    """
    try:
        user_id = current_user["user_id"]
        user_type = current_user["user_type"]
        
        # Get conversation thread
        thread = await db.agent_conversations.find_one({"user_id": user_id})
        
        agent_name = "Suzie" if user_type == "workforce" else "Emma"
        agent_photo = "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb" if user_type == "workforce" else "https://images.unsplash.com/photo-1652471949169-9c587e8898cd"
        
        if not thread:
            # No conversation yet
            return {
                "success": True,
                "data": {
                    "thread_id": None,
                    "agent_name": agent_name,
                    "agent_photo": agent_photo,
                    "last_message": "Hi! I'm here to help you with any questions.",
                    "last_message_date": None,
                    "unread_count": 0,
                    "message_count": 0
                }
            }
        
        return {
            "success": True,
            "data": {
                "thread_id": thread["thread_id"],
                "agent_name": agent_name,
                "agent_photo": agent_photo,
                "last_message": thread.get("last_message", "Chat with me anytime!"),
                "last_message_date": thread.get("last_message_date"),
                "unread_count": 0,  # Agent messages don't have unread count
                "message_count": thread.get("message_count", 0)
            }
        }
        
    except Exception as e:
        print(f"Get Thread Info Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load thread info: {str(e)}")
