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
    occupation_suggestions = []
    
    for action in ai_response.get("actions", []):
        result = await execute_action(action, current_user, db, conversation)
        action_results.append(result)
        
        # If action was search_occupations, add to suggestions
        if action.get("type") == "search_occupations" and result.get("status") == "success":
            occupation_suggestions = result.get("data", [])
    
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
            "action_results": action_results,
            "occupation_suggestions": occupation_suggestions
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
        if action_type == "search_occupations":
            # Search occupation templates and return with earnings
            query = action_data.get("query", "")
            templates = await db.occupation_templates.find(
                {
                    "active": True,
                    "$or": [
                        {"name": {"$regex": query, "$options": "i"}},
                        {"category": {"$regex": query, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).limit(5).to_list(5)
            
            # Add earnings data
            for template in templates:
                # Get average hourly rates from employer roles for this occupation
                avg_rate = await db.employer_roles.aggregate([
                    {"$match": {"occupation_template_id": template["template_id"], "active": True}},
                    {"$group": {"_id": None, "avg_rate": {"$avg": "$hourly_rate"}}}
                ]).to_list(1)
                
                hourly_rate = avg_rate[0]["avg_rate"] if avg_rate else 20.0  # Default $20/hr
                template["earnings"] = {
                    "hourly": round(hourly_rate, 2),
                    "monthly": round(hourly_rate * 160, 2),  # 40 hrs/week * 4 weeks
                    "annual": round(hourly_rate * 2080, 2)   # 40 hrs/week * 52 weeks
                }
            
            return {"type": action_type, "status": "success", "data": templates}
        
        elif action_type == "create_availability_blocks":
            # Create availability blocks from parsed schedule
            availability_data = action_data.get("availability", [])
            created_count = 0
            
            for block in availability_data:
                availability_event = {
                    "id": str(uuid.uuid4()),
                    "workforce_id": current_user["user_id"],
                    "start": block["start"],
                    "end": block["end"],
                    "type": "available",
                    "title": "Available"
                }
                await db.availability_events.insert_one(availability_event)
                created_count += 1
            
            return {"type": action_type, "status": "success", "message": f"{created_count} availability blocks created"}
        
        elif action_type == "create_worker_qualification":
            # Create worker qualification from extracted data
            from models.occupation_templates import (
                WorkerCertification, WorkerSkill, WorkerExperience, 
                EmployerExperience, WorkerPhysicalRequirement, WorkerOtherRequirement
            )
            from utils.match_score_calculator import calculate_match_score
            
            template_id = action_data.get("occupation_template_id")
            template = await db.occupation_templates.find_one({"template_id": template_id}, {"_id": 0})
            
            if not template:
                return {"type": action_type, "status": "error", "message": "Occupation template not found"}
            
            # Build qualification data
            certifications = [
                {
                    "name": cert["name"],
                    "has": cert.get("has", True),
                    "document_url": cert.get("document_url"),
                    "issue_date": cert.get("issue_date"),
                    "expiry_date": cert.get("expiry_date"),
                    "verified": False,
                    "verified_by": None,
                    "verified_date": None
                }
                for cert in action_data.get("certifications", [])
            ]
            
            skills = [
                {
                    "name": skill["name"],
                    "has": skill.get("has", True),
                    "proficiency_level": skill.get("proficiency_level", "basic"),
                    "verified": False,
                    "verified_by": None,
                    "verified_date": None
                }
                for skill in action_data.get("skills", [])
            ]
            
            experience_employers = [
                {"name": emp["name"], "months": emp["months"], "verified": False}
                for emp in action_data.get("experience_employers", [])
            ]
            
            experience = {
                "total_months": action_data.get("experience_months", 0),
                "employers": experience_employers
            }
            
            physical_requirements = [
                {"name": pr["name"], "confirmed": pr.get("confirmed", True)}
                for pr in action_data.get("physical_requirements", [])
            ]
            
            other_requirements = [
                {
                    "name": other["name"],
                    "has": other.get("has", True),
                    "document_url": other.get("document_url"),
                    "issue_date": other.get("issue_date"),
                    "expiry_date": other.get("expiry_date")
                }
                for other in action_data.get("other_requirements", [])
            ]
            
            # Calculate match score
            qual_data = {
                "certifications": certifications,
                "skills": skills,
                "experience": experience,
                "physical_requirements": physical_requirements,
                "other_requirements": other_requirements
            }
            
            match_score = calculate_match_score(template, qual_data)
            
            # Create qualification record
            qualification = {
                "qualification_id": str(uuid.uuid4()),
                "worker_id": current_user["user_id"],
                "occupation_template_id": template_id,
                "occupation_name": template["name"],
                "certifications": certifications,
                "skills": skills,
                "experience": experience,
                "physical_requirements": physical_requirements,
                "other_requirements": other_requirements,
                "match_score": match_score,
                "last_calculated": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db.worker_qualifications.insert_one(qualification)
            
            return {
                "type": action_type, 
                "status": "success", 
                "message": f"Qualification created with {match_score}% match score",
                "data": {"match_score": match_score, "occupation_name": template["name"]}
            }
        
        elif action_type == "create_workplace":
            # Create workplace for employer
            workplace_data = action_data.get("workplace", {})
            workplace = {
                "workplace_id": str(uuid.uuid4()),
                "employer_id": current_user["user_id"],
                "name": workplace_data.get("name", "Main Location"),
                "address": workplace_data.get("address", ""),
                "city": workplace_data.get("city", ""),
                "province": workplace_data.get("province", ""),
                "postal_code": workplace_data.get("postal_code", ""),
                "created_at": datetime.utcnow()
            }
            await db.workplaces.insert_one(workplace)
            return {"type": action_type, "status": "success", "message": "Workplace created", "data": workplace}
        
        elif action_type == "create_employer_role":
            # Create employer role
            role_data = action_data.get("role", {})
            role = {
                "role_id": str(uuid.uuid4()),
                "employer_id": current_user["user_id"],
                "workplace_id": role_data.get("workplace_id"),
                "occupation_template_id": role_data.get("occupation_template_id"),
                "occupation_name": role_data.get("occupation_name"),
                "role_name": role_data.get("role_name"),
                "custom_requirements": role_data.get("custom_requirements"),
                "hourly_rate": role_data.get("hourly_rate", 20.0),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "active": True
            }
            await db.employer_roles.insert_one(role)
            return {"type": action_type, "status": "success", "message": "Role created", "data": role}
        
        else:
            return {"type": action_type, "status": "skipped", "message": "Unknown action type"}
    
    except Exception as e:
        print(f"Error executing action {action_type}: {str(e)}")
        return {"type": action_type, "status": "error", "message": str(e)}
