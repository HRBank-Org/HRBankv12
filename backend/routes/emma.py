from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
import json
import asyncio
from dotenv import load_dotenv

from models.emma import (
    EmmaConversation,
    EmmaMessage,
    EmmaChatRequest,
    EmmaChatResponse,
    OnboardingContext
)
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


def get_emma_system_prompt(user_type: str, user_name: str = "", preferred_language: str = "en") -> str:
    """Generate Emma's system prompt based on user type and language preference"""
    
    # Language instruction
    language_instruction = ""
    if preferred_language != "en":
        language_names = {
            'fr': 'French', 'zh-CN': 'Mandarin Chinese', 'zh-HK': 'Cantonese Chinese',
            'pa': 'Punjabi', 'tl': 'Tagalog', 'es': 'Spanish', 'ar': 'Arabic',
            'hi': 'Hindi', 'ur': 'Urdu', 'fa': 'Persian (Farsi)', 'ps': 'Pashto',
            'ta': 'Tamil', 'pt': 'Portuguese', 'ko': 'Korean', 'vi': 'Vietnamese',
            'gu': 'Gujarati', 'ru': 'Russian', 'uk': 'Ukrainian', 'bn': 'Bengali', 'pl': 'Polish'
        }
        lang_name = language_names.get(preferred_language, preferred_language)
        language_instruction = f"""

IMPORTANT LANGUAGE INSTRUCTION:
- The user prefers to communicate in {lang_name}
- ALWAYS respond in {lang_name}
- Use culturally appropriate greetings and expressions
- Maintain professional tone in {lang_name}
- If you need to use English terms (like job titles or legal terms), provide the {lang_name} translation in parentheses
"""
    
    base_prompt = f"""You are Emma, a friendly and professional HR onboarding assistant for HR Bank, Canada's premier workforce management platform.

Your personality:
- Warm, approachable, and professional woman in your late 30s
- Expert in Canadian employment law, compliance, and HR best practices
- Patient and supportive, especially with first-time users
- You guide users through profile setup, document collection, and compliance requirements
- Multilingual - you can communicate fluently in the user's preferred language

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
- Keep responses concise and actionable (2-3 sentences max unless explaining complex topics)
{language_instruction}"""

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


async def get_or_create_conversation(user_id: str, user_type: str, db, preferred_language: str = "en"):
    """Get existing conversation or create new one"""
    conversation = await db.emma_conversations.find_one(
        {"user_id": user_id, "is_active": True}
    )
    
    if conversation:
        return EmmaConversation(**conversation)
    
    # Create new conversation with greeting in user's language
    greeting = get_time_based_greeting()
    
    # Greeting translations for common languages
    greetings = {
        'en': f"{greeting}! 👋 I'm Emma, your personal HR Bank assistant. I'm here to help you get set up and ensure everything is compliant with Canadian employment standards. How can I help you today?",
        'fr': f"{greeting}! 👋 Je suis Emma, votre assistante personnelle HR Bank. Je suis là pour vous aider à vous installer et à vous assurer que tout est conforme aux normes canadiennes en matière d'emploi. Comment puis-je vous aider aujourd'hui?",
        'es': f"¡{greeting}! 👋 Soy Emma, tu asistente personal de HR Bank. Estoy aquí para ayudarte a configurar todo y asegurarme de que cumples con las normas laborales canadienses. ¿Cómo puedo ayudarte hoy?",
        'ar': f"{greeting}! 👋 أنا إيما، مساعدتك الشخصية في HR Bank. أنا هنا لمساعدتك في الإعداد وضمان الامتثال لمعايير العمل الكندية. كيف يمكنني مساعدتك اليوم؟",
        'zh-CN': f"{greeting}！👋 我是Emma，您的HR Bank个人助理。我在这里帮助您完成设置，并确保符合加拿大就业标准。今天我能帮您什么？",
        'hi': f"{greeting}! 👋 मैं Emma हूं, आपकी HR Bank की व्यक्तिगत सहायक। मैं यहां आपकी सेटअप में मदद करने और कनाडाई रोजगार मानकों का अनुपालन सुनिश्चित करने के लिए हूं। आज मैं आपकी कैसे मदद कर सकती हूं?",
        'pa': f"{greeting}! 👋 ਮੈਂ Emma ਹਾਂ, ਤੁਹਾਡੀ HR Bank ਦੀ ਨਿੱਜੀ ਸਹਾਇਕ। ਮੈਂ ਇੱਥੇ ਤੁਹਾਡੀ ਸੈੱਟਅੱਪ ਵਿੱਚ ਮਦਦ ਕਰਨ ਅਤੇ ਕੈਨੇਡੀਅਨ ਰੁਜ਼ਗਾਰ ਮਾਪਦੰਡਾਂ ਦੀ ਪਾਲਣਾ ਯਕੀਨੀ ਬਣਾਉਣ ਲਈ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?",
        'ur': f"{greeting}! 👋 میں Emma ہوں، آپ کی HR Bank کی ذاتی معاون۔ میں یہاں آپ کی سیٹ اپ میں مدد کرنے اور کینیڈین روزگار کے معیارات کی تعمیل کو یقینی بنانے کے لیے ہوں۔ آج میں آپ کی کیسے مدد کر سکتی ہوں؟",
        'ps': f"{greeting}! 👋 زه Emma یم، ستاسو د HR Bank شخصي مرستیال. زه دلته یم چې ستاسو سره د سیټ اپ کولو کې مرسته وکړم او ډاډ ترلاسه کړم چې هرڅه د کاناډا د کار معیارونو سره سم دي. نن ورځ زه څنګه ستاسو سره مرسته کولی شم؟",
        'tl': f"{greeting}! 👋 Ako si Emma, ang iyong personal na HR Bank assistant. Nandito ako para tulungan kang mag-setup at tiyaking sumusunod ka sa mga pamantayan ng Canadian employment. Paano kita matutulungan ngayon?",
    }
    
    welcome_message = greetings.get(preferred_language, greetings['en'])
    
    new_conversation = EmmaConversation(
        user_id=user_id,
        user_type=user_type,
        messages=[
            EmmaMessage(
                role="assistant",
                content=welcome_message
            )
        ]
    )
    
    await db.emma_conversations.insert_one(new_conversation.model_dump())
    return new_conversation


async def get_emma_response(user_message: str, conversation: EmmaConversation, user_name: str = "", preferred_language: str = "en") -> str:
    """Get Emma's AI-powered response with timeout handling"""
    if not EMMA_ENABLED or not EMERGENT_LLM_KEY:
        return "I'm here to help! However, my AI capabilities are currently unavailable. Please contact support for assistance."
    
    try:
        # Initialize Emma chat with conversation history and language preference
        emma_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation.conversation_id,
            system_message=get_emma_system_prompt(conversation.user_type, user_name, preferred_language)
        ).with_model("openai", "gpt-4o-mini")
        
        # Create user message
        user_msg = UserMessage(text=user_message)
        
        # Get response with timeout (30 seconds)
        response = await asyncio.wait_for(
            emma_chat.send_message(user_msg),
            timeout=30.0
        )
        return response
    
    except asyncio.TimeoutError:
        print("Emma AI timeout: Response took too long")
        return "I apologize for the delay. Let me help you with that. Could you please rephrase your question or let me know what specific information you need?"
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
        current_user['user_id'],
        current_user['user_type'],
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
    
    # Get user's preferred language
    preferred_language = "en"
    profile_collection = f"{current_user['user_type']}_profiles"
    id_field = "workforce_id" if current_user['user_type'] == "workforce" else "employer_id"
    
    user_profile = await db[profile_collection].find_one(
        {id_field: current_user['user_id']}
    )
    
    if user_profile:
        preferred_language = user_profile.get("preferred_language", "en")
    
    # Get or create conversation with language preference
    conversation = await get_or_create_conversation(
        current_user['user_id'],
        current_user['user_type'],
        db,
        preferred_language
    )
    
    # Add user message to conversation
    user_message = EmmaMessage(
        role="user",
        content=request.message,
        file_attachments=[request.file_attachment] if request.file_attachment else None
    )
    conversation.messages.append(user_message)
    
    # Get user's name for personalized responses
    user_name = ""
    if user_profile:
        if current_user['user_type'] == "workforce":
            user_name = user_profile.get("first_name", user_profile.get("full_name", ""))
        else:
            user_name = user_profile.get("contact_name", "")
    
    # Get Emma's response in user's preferred language
    emma_response_text = await get_emma_response(
        request.message,
        conversation,
        user_name,
        preferred_language
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
            "conversation_id": conversation.conversation_id
        }
    }


@router.post("/parse-resume")
async def parse_resume(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Parse resume file using Gemini (workforce only)"""
    if current_user['user_type'] != 'workforce':
        raise HTTPException(status_code=403, detail="Only workforce users can upload resumes")
    
    if not EMMA_ENABLED or not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="AI services unavailable")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, FileAttachment
        
        # Initialize Gemini chat (only Gemini supports file attachments)
        gemini_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"resume_{current_user['user_id']}",
            system_message="You are a resume parsing assistant. Extract structured information from resumes."
        ).with_model("gemini", "gemini-2.0-flash-exp")
        
        # Create file attachment
        file_attachment = FileAttachment(
            data=request['file_data'],
            mime_type=request['file_type']
        )
        
        prompt = """Please analyze this resume and extract the following information in JSON format:
{
  "occupation_title": "primary job title or position",
  "years_of_experience": "total years of work experience as a number",
  "skills": ["skill1", "skill2", ...],
  "work_experience": [
    {"company": "company name", "position": "job title", "duration": "years worked"}
  ],
  "education": [{"degree": "degree name", "institution": "school name"}],
  "certifications": ["cert1", "cert2", ...]
}

Provide only the JSON, no additional text."""
        
        # Parse with timeout
        response = await asyncio.wait_for(
            gemini_chat.send_message_with_attachment(prompt, [file_attachment]),
            timeout=45.0
        )
        
        # Parse JSON response
        parsed_data = json.loads(response)
        
        # Store parsed data in conversation context
        db = await get_database()
        await db.emma_conversations.update_one(
            {"user_id": current_user['user_id'], "is_active": True},
            {"$set": {"context.parsed_resume_data": parsed_data}}
        )
        
        return {
            "success": True,
            "data": parsed_data
        }
    
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Resume parsing timed out. Please try again.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse resume data")
    except Exception as e:
        print(f"Resume parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse resume")


@router.post("/approve-resume-data")
async def approve_resume_data(
    current_user: dict = Depends(get_current_user)
):
    """Create occupation profile from parsed resume data (workforce only)"""
    if current_user['user_type'] != 'workforce':
        raise HTTPException(status_code=403, detail="Only workforce users can create occupation profiles")
    
    db = await get_database()
    
    # Get parsed resume data from conversation
    conversation = await db.emma_conversations.find_one(
        {"user_id": current_user['user_id'], "is_active": True}
    )
    
    if not conversation or not conversation.get('context', {}).get('parsed_resume_data'):
        raise HTTPException(status_code=404, detail="No parsed resume data found")
    
    parsed_data = conversation['context']['parsed_resume_data']
    
    # Create occupation profile
    occupation_profile = {
        "profile_id": str(uuid.uuid4()),
        "user_id": current_user['user_id'],
        "occupation_title": parsed_data.get('occupation_title', ''),
        "years_of_experience": int(parsed_data.get('years_of_experience', 0)),
        "skills": parsed_data.get('skills', []),
        "created_date": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    await db.occupation_profiles.insert_one(occupation_profile)
    
    return {
        "success": True,
        "data": {
            "message": "Your occupation profile has been created successfully!",
            "profile_id": occupation_profile['profile_id']
        }
    }


@router.get("/onboarding-status")
async def get_onboarding_status(
    current_user: dict = Depends(get_current_user)
):
    """Get user's onboarding progress and next steps"""
    db = await get_database()
    
    # Get conversation context
    conversation = await db.emma_conversations.find_one(
        {"user_id": current_user['user_id'], "is_active": True}
    )
    
    if not conversation:
        # Create conversation if doesn't exist
        conversation = await get_or_create_conversation(
            current_user['user_id'],
            current_user['user_type'],
            db
        )
        context = conversation.context
    else:
        context = OnboardingContext(**conversation.get('context', {}))
    
    progress = calculate_onboarding_progress(context)
    
    return {
        "success": True,
        "data": {
            "progress": progress,
            "profile_completion": context.profile_completion,
            "pending_documents": context.pending_documents,
            "resume_approved": context.resume_approved,
            "last_interaction": context.last_interaction.isoformat() if context.last_interaction else None
        }
    }


@router.post("/reset-conversation")
async def reset_conversation(
    current_user: dict = Depends(get_current_user)
):
    """Reset Emma conversation and start fresh onboarding"""
    db = await get_database()
    
    # Mark all existing conversations as inactive
    await db.emma_conversations.update_many(
        {"user_id": current_user['user_id'], "is_active": True},
        {"$set": {"is_active": False}}
    )
    
    # Create new conversation with fresh greeting
    new_conversation = await get_or_create_conversation(
        current_user['user_id'],
        current_user['user_type'],
        db
    )
    
    return {
        "success": True,
        "data": {
            "message": "Conversation reset successfully. Emma is ready to start fresh!",
            "conversation_id": new_conversation.conversation_id
        }
    }


def calculate_onboarding_progress(context: OnboardingContext) -> int:
    """Calculate onboarding completion percentage"""
    progress = 0
    
    # Calculate profile completion
    if context.profile_completion:
        completed_fields = sum(1 for v in context.profile_completion.values() if v)
        total_fields = len(context.profile_completion)
        if total_fields > 0:
            progress += int((completed_fields / total_fields) * 50)
    
    # Documents uploaded
    if len(context.pending_documents) == 0 and len(context.completed_steps) > 1:
        progress += 30
    
    # Resume approved (occupation profile)
    if context.resume_approved:
        progress += 20
    
    return min(progress, 100)


def should_prompt_file_upload(context: OnboardingContext) -> bool:
    """Determine if file upload should be prompted"""
    return len(context.pending_documents) > 0