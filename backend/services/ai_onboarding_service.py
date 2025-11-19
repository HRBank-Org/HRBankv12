import os
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from typing import Dict, List, Any, Optional
import json

load_dotenv()

# Onboarding conversation flows for different user types
WORKFORCE_ONBOARDING_STATES = {
    "welcome": {
        "ai_prompt": "Welcome to HR Bank! I'm here to help you get started. What kind of work are you looking for? (For example: security guard, bartender, driver, healthcare worker, etc.)",
        "next_state": "occupation_discovery",
        "progress": {"current": 1, "total": 4, "label": "Getting to know you"}
    },
    "occupation_discovery": {
        "system_context": "User mentioned their occupation. Search occupation templates and ask if they have a resume.",
        "next_state": "resume_upload_or_manual",
        "progress": {"current": 2, "total": 4, "label": "Building your profile"}
    },
    "resume_upload_or_manual": {
        "ai_prompt": "Great! Do you have a resume or CV you'd like to upload? I can extract your information automatically. Or we can enter it manually.",
        "quick_actions": [
            {"label": "📄 Upload Resume", "action": "upload_resume"},
            {"label": "✍️ Enter Manually", "action": "manual_entry"}
        ],
        "next_state": "waiting_resume_or_manual",
        "progress": {"current": 2, "total": 4, "label": "Building your profile"}
    },
    "resume_confirmation": {
        "system_context": "Resume parsed. Show extracted data and ask for confirmation.",
        "next_state": "availability_setup",
        "progress": {"current": 3, "total": 4, "label": "Setting up availability"}
    },
    "manual_entry": {
        "system_context": "Guide user through manual entry of certifications, skills, and experience.",
        "next_state": "availability_setup",
        "progress": {"current": 3, "total": 4, "label": "Almost there!"}
    },
    "availability_setup": {
        "ai_prompt": "Perfect! Now let's set up your availability. When are you available to work?",
        "quick_actions": [
            {"label": "📅 Regular Schedule", "action": "regular_schedule"},
            {"label": "🔄 Flexible (24/7)", "action": "flexible"},
            {"label": "🎯 Custom Times", "action": "custom_calendar"}
        ],
        "next_state": "availability_input",
        "progress": {"current": 3, "total": 4, "label": "Setting up availability"}
    },
    "availability_input": {
        "system_context": "User is providing availability information. Parse it and create availability blocks.",
        "next_state": "onboarding_complete",
        "progress": {"current": 4, "total": 4, "label": "Finishing up"}
    },
    "onboarding_complete": {
        "ai_prompt": "🎉 All set! Your profile is complete and you're ready to receive shift offers. Welcome to HR Bank!",
        "next_state": "help_mode",
        "progress": {"current": 4, "total": 4, "label": "Complete!"}
    }
}

EMPLOYER_ONBOARDING_STATES = {
    "welcome": {
        "ai_prompt": "Welcome to HR Bank! I'm here to help you set up your company profile. What's your company name?",
        "next_state": "company_name_input",
        "progress": {"current": 1, "total": 5, "label": "Company setup"}
    },
    "company_name_input": {
        "system_context": "User provided company name. Ask about industry.",
        "next_state": "industry_selection",
        "progress": {"current": 2, "total": 5, "label": "Company details"}
    },
    "industry_selection": {
        "ai_prompt": "What industry does your company operate in?",
        "quick_actions": [
            {"label": "🛡️ Security", "action": "select_industry", "data": {"industry": "Security"}},
            {"label": "🍽️ Hospitality", "action": "select_industry", "data": {"industry": "Hospitality"}},
            {"label": "🚚 Transportation", "action": "select_industry", "data": {"industry": "Transportation"}},
            {"label": "🏥 Healthcare", "action": "select_industry", "data": {"industry": "Healthcare"}},
            {"label": "🏗️ Construction", "action": "select_industry", "data": {"industry": "Construction"}},
            {"label": "🏢 Other", "action": "select_industry", "data": {"industry": "Other"}}
        ],
        "next_state": "location_setup",
        "progress": {"current": 2, "total": 5, "label": "Company details"}
    },
    "location_setup": {
        "ai_prompt": "Do you have one location or multiple?",
        "quick_actions": [
            {"label": "📍 One Location", "action": "one_location"},
            {"label": "📍 Multiple Locations", "action": "multiple_locations"}
        ],
        "next_state": "location_input",
        "progress": {"current": 3, "total": 5, "label": "Location setup"}
    },
    "location_input": {
        "system_context": "User is providing location information. Create workplace records.",
        "next_state": "role_creation",
        "progress": {"current": 4, "total": 5, "label": "Role setup"}
    },
    "role_creation": {
        "ai_prompt": "Great! Now let's create your first role. What kind of workers do you need? (e.g., security guards, bartenders, drivers)",
        "next_state": "role_input",
        "progress": {"current": 4, "total": 5, "label": "Role setup"}
    },
    "role_input": {
        "system_context": "User mentioned worker type. Search occupation templates and ask about hourly rate.",
        "next_state": "onboarding_complete",
        "progress": {"current": 5, "total": 5, "label": "Finishing up"}
    },
    "onboarding_complete": {
        "ai_prompt": "🎉 All set! Your company profile is ready. You can now post shifts and find workers. Welcome to HR Bank!",
        "next_state": "help_mode",
        "progress": {"current": 5, "total": 5, "label": "Complete!"}
    }
}


class AIOnboardingService:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def get_onboarding_states(self, user_type: str) -> Dict:
        """Get onboarding state flow for user type"""
        if user_type == "workforce":
            return WORKFORCE_ONBOARDING_STATES
        elif user_type == "employer":
            return EMPLOYER_ONBOARDING_STATES
        else:
            return {}
    
    def get_system_message(self, user_type: str, current_state: str) -> str:
        """Generate system message for AI based on user type and current state"""
        
        base_prompt = f"""You are an AI onboarding assistant for HR Bank, a workforce management platform in Canada.

User type: {user_type}
Current onboarding state: {current_state}

Your role:
- Guide the user through a conversational onboarding process
- Ask clear, simple questions one at a time
- Be friendly, helpful, and encouraging
- Extract relevant information from user responses
- Provide quick action buttons when appropriate
- Confirm understanding before moving forward

Important guidelines:
- Keep responses concise (2-3 sentences max)
- Ask ONE question at a time
- Use emojis sparingly to keep it friendly
- If user provides unclear info, ask for clarification
- Always confirm before saving important data
- Be encouraging and positive

"""
        
        if user_type == "workforce":
            base_prompt += """
Workforce Onboarding Goals:
1. Discover their desired occupation(s)
2. Collect certifications, skills, and experience (via resume or manual entry)
3. Set up availability schedule
4. Complete profile to start receiving shift offers

Data to extract:
- Occupation(s) they're interested in
- Certifications (name, issue date, expiry date)
- Skills (name, proficiency level: basic/intermediate/advanced)
- Work experience (employer names, job titles, duration in months)
- Availability (days and times they can work)
"""
        elif user_type == "employer":
            base_prompt += """
Employer Onboarding Goals:
1. Get company name and industry
2. Set up workplace location(s)
3. Create first worker role(s)
4. Complete profile to start posting shifts

Data to extract:
- Company name
- Industry sector
- Workplace addresses (one or multiple)
- Worker roles needed (occupation types)
- Hourly rates for roles
"""
        
        return base_prompt
    
    async def process_message(
        self,
        user_id: str,
        user_type: str,
        current_state: str,
        user_message: str,
        conversation_history: List[Dict],
        extracted_data: Dict = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate AI response
        Returns: ChatResponse dict
        """
        
        if extracted_data is None:
            extracted_data = {}
        
        states = self.get_onboarding_states(user_type)
        state_config = states.get(current_state, {})
        
        # Initialize AI chat
        system_message = self.get_system_message(user_type, current_state)
        
        # Add state-specific context
        if "system_context" in state_config:
            system_message += f"\n\nCurrent context: {state_config['system_context']}"
        
        # Add extracted data context
        if extracted_data:
            system_message += f"\n\nData extracted so far: {json.dumps(extracted_data, indent=2)}"
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"{user_id}_{current_state}",
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Create conversation context from history
        context_messages = []
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            context_messages.append(f"{msg['role'].upper()}: {msg['message']}")
        
        # Build the prompt with context
        full_prompt = ""
        if context_messages:
            full_prompt += "Recent conversation:\n" + "\n".join(context_messages) + "\n\n"
        
        full_prompt += f"User's current message: {user_message}\n\n"
        full_prompt += """
Based on the user's message, provide:
1. A conversational response (2-3 sentences)
2. What data to extract (if any)
3. What action to take next
4. The next conversation state

Respond in JSON format:
{
  "ai_message": "Your friendly response here",
  "extracted_data": {"key": "value"},
  "actions": [{"type": "action_type", "data": {}}],
  "next_state": "state_name"
}
"""
        
        # Send message to AI
        user_msg = UserMessage(text=full_prompt)
        ai_response = await chat.send_message(user_msg)
        
        # Parse AI response
        try:
            response_data = json.loads(ai_response)
        except:
            # Fallback if AI doesn't return proper JSON
            response_data = {
                "ai_message": ai_response,
                "extracted_data": {},
                "actions": [],
                "next_state": state_config.get("next_state", current_state)
            }
        
        # Build response
        result = {
            "ai_message": response_data.get("ai_message", ai_response),
            "next_state": response_data.get("next_state", state_config.get("next_state", current_state)),
            "actions": response_data.get("actions", []),
            "quick_actions": state_config.get("quick_actions", []),
            "show_ui": None,
            "progress": state_config.get("progress"),
            "extracted_data": response_data.get("extracted_data", {})
        }
        
        return result
    
    def get_initial_message(self, user_type: str) -> Dict[str, Any]:
        """Get the initial welcome message for a user type"""
        states = self.get_onboarding_states(user_type)
        welcome_state = states.get("welcome", {})
        
        return {
            "ai_message": welcome_state.get("ai_prompt", "Welcome! Let's get you started."),
            "next_state": welcome_state.get("next_state", "welcome"),
            "actions": [],
            "quick_actions": welcome_state.get("quick_actions", []),
            "show_ui": None,
            "progress": welcome_state.get("progress"),
            "extracted_data": {}
        }
