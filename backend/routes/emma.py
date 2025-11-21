from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
import json
from dotenv import load_dotenv

from models.emma import (
    EmmaConversation,
    EmmaMessage,
    EmmaChatRequest,
    EmmaChatResponse,
    OnboardingContext
)
# from models.user import User  # Not needed since we get dict from auth
from database import get_database
from auth.dependencies import get_current_user

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/emma", tags=["Emma AI Assistant"])

# Emma AI Integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMMA_ENABLED = True
except ImportError:
    EMMA_ENABLED = False
    print("Warning: emergentintegrations not installed, Emma will use fallback responses")

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "")


def get_time_based_greeting():
    """Generate time-appropriate greeting"""
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    elif hour < 18:
        return "Good afternoon"
    else:
        return "Good evening"


def get_emma_system_prompt(user_type: str, user_name: str = "") -> str:
    """Generate Emma's system prompt based on user type"""
    base_prompt = f"""You are Emma, a friendly and professional HR onboarding assistant for HR Bank, Canada's premier workforce management platform.

Your personality:
- Warm, approachable, and professional woman in your late 30s
- Expert in Canadian employment law, compliance, and HR best practices
- Patient and supportive, especially with first-time users
- You guide users through profile setup, document collection, and compliance requirements

Your responsibilities:
1. Welcome users with time-appropriate greetings
2. Explain HR Bank's benefits and how it helps them
3. Guide them through profile completion step-by-step
4. Collect necessary documents (ID, resume for workers)
5. Ensure compliance with Ontario employment standards
6. Be available to answer questions and resume incomplete profiles

Important:
- Always be encouraging and positive
- Break down complex tasks into simple steps
- Confirm actions before making changes to user profiles
- Explain WHY documents are needed (compliance, verification, etc.)
- Use emojis sparingly and professionally
"""

    if user_type == "workforce":
        return base_prompt + f"""\n\nYou are helping {user_name or 'a workforce member'} complete their worker profile.

Key focus areas:
- Basic profile info (name, contact, address)
- ID document upload for verification
- Resume upload and parsing to create occupation profiles
- Skills and certifications
- Availability preferences
- Compliance documents (WSIB, T4 classification)

For resume parsing:
- Ask user to upload their resume
- Explain you'll automatically extract their work experience, skills, and education
- After parsing, show them what you found and ask for approval before updating their profile
- Guide them to add any missing information
"""
    else:  # employer
        return base_prompt + f"""\n\nYou are helping {user_name or 'an employer'} set up their company profile.

Key focus areas:
- Company information (name, address, industry)
- Contact person details
- Business registration documents
- WSIB coverage verification
- Workplace setup (locations, departments)
- Compliance with Ontario employment standards
- Understanding shift scheduling and workforce management features

Help them understand how HR Bank ensures compliance with:
- Minimum wage ($17.60/hr in Ontario)
- Overtime regulations
- Vacation pay and holiday pay
- T4 reporting and payroll
"""


async def get_or_create_conversation(user_id: str, user_type: str, db):
    """Get existing conversation or create new one"""
    conversation = await db.emma_conversations.find_one(
        {"user_id": user_id, "is_active": True}
    )
    
    if conversation:
        return EmmaConversation(**conversation)
    
    # Create new conversation with greeting
    greeting = get_time_based_greeting()
    new_conversation = EmmaConversation(
        user_id=user_id,
        user_type=user_type,
        messages=[
            EmmaMessage(
                role="assistant",
                content=f"{greeting}! 👋 I'm Emma, your personal HR Bank assistant. I'm here to help you get set up and ensure everything is compliant with Canadian employment standards. How can I help you today?"
            )
        ]
    )
    
    await db.emma_conversations.insert_one(new_conversation.model_dump())
    return new_conversation


async def get_emma_response(user_message: str, conversation: EmmaConversation, user_name: str = "") -> str:
    """Get Emma's AI-powered response"""
    if not EMMA_ENABLED or not EMERGENT_LLM_KEY:
        return "I'm here to help! However, my AI capabilities are currently unavailable. Please contact support for assistance."
    
    try:
        # Initialize Emma chat with conversation history
        emma_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation.conversation_id,
            system_message=get_emma_system_prompt(conversation.user_type, user_name)
        ).with_model("openai", "gpt-5-mini")
        
        # Create user message
        user_msg = UserMessage(text=user_message)
        
        # Get response
        response = await emma_chat.send_message(user_msg)
        return response
    
    except Exception as e:
        print(f"Emma AI error: {str(e)}")
        return "I apologize, I'm having trouble processing that right now. Could you please rephrase your question?"


@router.get("/conversation")
async def get_conversation(
    current_user: dict = Depends(get_current_user)
):
    """Get Emma conversation history"""
    db = await get_database()
    
    conversation = await get_or_create_conversation(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    return {
        "success": True,
        "data": {
            "conversation_id": conversation.conversation_id,
            "messages": [msg.model_dump() for msg in conversation.messages],
            "context": conversation.context.model_dump(),
            "onboarding_progress": calculate_onboarding_progress(conversation.context)
        }
    }


@router.post("/chat")
async def chat_with_emma(
    request: EmmaChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send message to Emma and get response"""
    db = await get_database()
    
    # Get or create conversation
    conversation = await get_or_create_conversation(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    # Add user message to conversation
    user_message = EmmaMessage(
        role="user",
        content=request.message,
        file_attachments=[request.file_attachment] if request.file_attachment else None
    )
    conversation.messages.append(user_message)
    
    # Get user's name for personalized responses
    user_profile = await db[f"{current_user['user_type']}_profiles"].find_one(
        {"user_id": current_user["user_id"]}
    )
    user_name = ""
    if user_profile:
        if current_user["user_type"] == "workforce":
            user_name = user_profile.get("first_name", "")
        else:
            user_name = user_profile.get("contact_name", "")
    
    # Get Emma's response
    emma_response_text = await get_emma_response(
        request.message,
        conversation,
        user_name
    )
    
    # Add Emma's response to conversation
    emma_message = EmmaMessage(
        role="assistant",
        content=emma_response_text
    )
    conversation.messages.append(emma_message)
    
    # Update conversation in database
    conversation.updated_date = datetime.now(timezone.utc)
    conversation.context.last_interaction = datetime.now(timezone.utc)
    
    await db.emma_conversations.update_one(
        {"conversation_id": conversation.conversation_id},
        {"$set": conversation.model_dump()}
    )
    
    # Calculate onboarding progress
    progress = calculate_onboarding_progress(conversation.context)
    
    return {
        "success": True,
        "data": {
            "message": emma_response_text,
            "onboarding_progress": progress,
            "should_show_file_upload": should_prompt_file_upload(conversation.context),
            "suggested_actions": get_suggested_actions(conversation.context, current_user["user_type"])
        }
    }


@router.post("/parse-resume")
async def parse_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and parse resume with Emma's AI"""
    if current_user["user_type"] != "workforce":
        raise HTTPException(status_code=403, detail="Resume parsing is only for workforce users")
    
    db = await get_database()
    
    # Save uploaded file
    upload_dir = "/app/uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{current_user["user_id"]}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Parse resume with Emma AI
    if not EMMA_ENABLED or not EMERGENT_LLM_KEY:
        return {
            "success": False,
            "error": "Resume parsing is currently unavailable. Please fill in your profile manually."
        }
    
    try:
        # Use Gemini for file parsing (as per playbook, only Gemini supports file attachments)
        from emergentintegrations.llm.chat import FileContentWithMimeType
        
        emma_parser = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"resume_parse_{current_user["user_id"]}",
            system_message="""You are a resume parsing expert. Extract structured data from resumes.
            
Return ONLY a JSON object with this exact structure:
            {
                "occupation_title": "Main job title",
                "years_of_experience": 5,
                "skills": ["skill1", "skill2", "skill3"],
                "work_experience": [
                    {
                        "company_name": "Company Name",
                        "position_title": "Job Title",
                        "start_date": "2020-01",
                        "end_date": "2023-12",
                        "description": "Brief description"
                    }
                ],
                "education": [
                    {
                        "institution": "School Name",
                        "degree": "Degree Name",
                        "field": "Field of Study",
                        "graduation_year": "2020"
                    }
                ],
                "certifications": ["Certification 1", "Certification 2"]
            }
            
Extract all available information. Use null for missing fields."""
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Determine MIME type
        mime_type = "application/pdf" if file_extension.lower() == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
        resume_file = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        response = await emma_parser.send_message(UserMessage(
            text="Parse this resume and extract all information in the specified JSON format.",
            file_contents=[resume_file]
        ))
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            parsed_data = json.loads(json_match.group())
        else:
            parsed_data = json.loads(response)
        
        # Store parsed data in conversation context
        conversation = await get_or_create_conversation(
            current_user["user_id"],
            current_user["user_type"],
            db
        )
        conversation.context.parsed_resume_data = parsed_data
        conversation.context.pending_documents.append("resume_approval")
        
        await db.emma_conversations.update_one(
            {"conversation_id": conversation.conversation_id},
            {"$set": {"context": conversation.context.model_dump()}}
        )
        
        return {
            "success": True,
            "data": {
                "parsed_data": parsed_data,
                "message": "I've reviewed your resume! Here's what I found. Please review and let me know if you'd like me to add this to your profile.",
                "file_path": file_path
            }
        }
    
    except Exception as e:
        print(f"Resume parsing error: {str(e)}")
        return {
            "success": False,
            "error": f"I had trouble reading your resume. Please make sure it's a PDF or Word document. Error: {str(e)}"
        }


@router.post("/approve-resume-data")
async def approve_resume_data(
    current_user: dict = Depends(get_current_user)
):
    """User approves parsed resume data to be added to profile"""
    if current_user["user_type"] != "workforce":
        raise HTTPException(status_code=403, detail="Resume data is only for workforce users")
    
    db = await get_database()
    
    # Get conversation with parsed data
    conversation = await get_or_create_conversation(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    if not conversation.context.parsed_resume_data:
        raise HTTPException(status_code=400, detail="No resume data to approve")
    
    parsed_data = conversation.context.parsed_resume_data
    
    # Create occupation profile from parsed data
    from models.occupation import OccupationProfile
    
    new_occupation = {
        "occupation_id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "occupation_title": parsed_data.get("occupation_title", "Untitled Position"),
        "occupation_category": "General",  # User can update later
        "years_of_experience": parsed_data.get("years_of_experience", 0),
        "skills": parsed_data.get("skills", []),
        "work_experience": [],  # Will be populated from employment history
        "certifications": [],
        "active": True,
        "created_date": datetime.now(timezone.utc).isoformat(),
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.occupation_profiles.insert_one(new_occupation)
    
    # Mark as approved
    conversation.context.resume_approved = True
    conversation.context.completed_steps.append("resume_parsing")
    if "resume_approval" in conversation.context.pending_documents:
        conversation.context.pending_documents.remove("resume_approval")
    
    await db.emma_conversations.update_one(
        {"conversation_id": conversation.conversation_id},
        {"$set": {"context": conversation.context.model_dump()}}
    )
    
    return {
        "success": True,
        "data": {
            "message": "Great! I've added your work experience to your profile. You can always edit or add more details later.",
            "occupation_id": new_occupation["occupation_id"]
        }
    }


@router.get("/onboarding-status")
async def get_onboarding_status(
    current_user: dict = Depends(get_current_user)
):
    """Get user's onboarding progress"""
    db = await get_database()
    
    conversation = await get_or_create_conversation(
        current_user["user_id"],
        current_user["user_type"],
        db
    )
    
    progress = calculate_onboarding_progress(conversation.context)
    
    return {
        "success": True,
        "data": {
            "progress": progress,
            "completed_steps": conversation.context.completed_steps,
            "pending_documents": conversation.context.pending_documents,
            "current_step": conversation.context.current_step,
            "is_complete": progress >= 100
        }
    }


def calculate_onboarding_progress(context: OnboardingContext) -> float:
    """Calculate onboarding completion percentage"""
    total_steps = 5  # greeting, profile_info, documents, occupation/workplace, compliance
    completed = len(context.completed_steps)
    return min((completed / total_steps) * 100, 100)


def should_prompt_file_upload(context: OnboardingContext) -> bool:
    """Determine if Emma should prompt for file uploads"""
    return len(context.pending_documents) > 0


def get_suggested_actions(context: OnboardingContext, user_type: str) -> list:
    """Get suggested next actions for user"""
    actions = []
    
    if "profile_info" not in context.completed_steps:
        actions.append("Complete your profile information")
    
    if "id_upload" in context.pending_documents:
        actions.append("Upload your ID for verification")
    
    if user_type == "workforce" and "resume_upload" in context.pending_documents:
        actions.append("Upload your resume")
    
    if "compliance" not in context.completed_steps:
        actions.append("Review compliance requirements")
    
    return actions if actions else ["You're all set! Feel free to ask me anything."]
