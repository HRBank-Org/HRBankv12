import os
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from typing import Dict, List, Any, Optional
import json

load_dotenv()

# Onboarding conversation flows for different user types
WORKFORCE_ONBOARDING_STATES = {
    "welcome": {
        "ai_prompt": "Welcome to HR Bank! 👋 I'm here to help you get started quickly.\n\nDo you have a resume or CV? I can analyze it and suggest the best occupational profiles for you, complete with your experience and certifications.\n\nOr we can build your profile step by step if you prefer.",
        "quick_actions": [
            {"label": "📄 Upload Resume", "action": "upload_resume"},
            {"label": "✍️ Build Profile Manually", "action": "manual_entry"}
        ],
        "next_state": "resume_or_manual_choice",
        "progress": {"current": 1, "total": 5, "label": "Getting started"}
    },
    "resume_or_manual_choice": {
        "system_context": "Wait for user to upload resume or choose manual entry",
        "next_state": "resume_parsing",
        "progress": {"current": 1, "total": 5, "label": "Getting started"}
    },
    "resume_parsing": {
        "system_context": """User uploaded resume. Parse and extract:
        1. Name, contact info
        2. All work experience (job titles, companies, durations, responsibilities)
        3. All certifications (with dates if available)
        4. All skills (with proficiency levels)
        5. Education
        
        Then use action: {"type": "analyze_resume_for_profiles", "data": {"resume_text": "..."}}
        This will return 1-3 matching occupation templates with extracted data mapped to requirements.
        
        Present suggestions like:
        "Great! I analyzed your resume and found you're qualified for 3 roles:
        
        🛡️ Security Guard (92% match)
        From your resume:
        • Security License ✓
        • First Aid/CPR ✓
        • 18 months experience at ABC Security
        • Conflict resolution skills
        💰 Potential: $22/hr | $3,520/month | $42,240/year
        
        🚗 Driver (85% match)
        From your resume:
        • Class G License ✓
        • 12 months delivery experience
        • Route planning skills
        💰 Potential: $20/hr | $3,200/month | $38,400/year
        
        🏗️ Construction Worker (78% match)
        From your resume:
        • WHMIS ✓
        • 6 months experience
        • Basic hand tools
        💰 Potential: $24/hr | $3,840/month | $46,080/year
        
        Which profiles would you like me to create? You can select all 3 or just the ones you want."
        
        Show quick actions for each profile
        """,
        "next_state": "profile_selection",
        "progress": {"current": 2, "total": 5, "label": "Analyzing your experience"}
    },
    "profile_selection": {
        "system_context": "User is selecting which profiles to create. Store their selections.",
        "next_state": "document_collection",
        "progress": {"current": 3, "total": 6, "label": "Setting up profiles"}
    },
    "document_collection": {
        "ai_prompt": """Perfect! Your profiles are ready. 🎉

Now, to **activate your account** and start receiving job offers, I need to collect a few important documents. These ensure you get paid properly and employers can verify your qualifications.

📋 **Required Documents:**
• Government-issued ID (Driver's License, Passport, or Health Card)
• Social Insurance Number (SIN) document
• Banking information (for direct deposit payments)
• Void cheque or bank statement

📜 **For Your Qualifications:**
• Certification documents (Security License, First Aid, etc.)
• Proof of experience (reference letters, employment records)

⚠️ **Important:** Your account stays **"Pending"** until these are uploaded. Once complete, you'll be marked **"Active"** and can:
✅ Receive shift offers
✅ Get matched to jobs
✅ Receive payments via direct deposit

Upload your documents now to get started, or you can do it later from your profile.""",
        "quick_actions": [
            {"label": "📤 Upload Documents Now", "action": "upload_documents"},
            {"label": "⏭️ I'll do it later", "action": "skip_documents"}
        ],
        "next_state": "document_upload",
        "progress": {"current": 4, "total": 6, "label": "Account activation"}
    },
    "document_upload": {
        "system_context": """User is uploading documents. Track what's been uploaded.
        
        Required documents checklist:
        1. Government ID (passport, driver's license, health card)
        2. SIN document
        3. Banking info (void cheque or bank statement)
        4. Certification documents for their qualifications
        
        After each upload, confirm and show what's left:
        "Great! ✅ Government ID received. 
        
        Still needed:
        • SIN document
        • Banking info
        • Certification documents
        
        Upload next document or continue to availability setup."
        
        If user says "done" or "that's all", move to availability_setup.
        """,
        "next_state": "availability_setup",
        "progress": {"current": 4, "total": 6, "label": "Document upload"}
    },
    "manual_entry": {
        "system_context": "User chose manual entry. Ask what kind of work they're looking for, then guide through building one profile.",
        "next_state": "occupation_discovery",
        "progress": {"current": 2, "total": 5, "label": "Building your profile"}
    },
    "occupation_discovery": {
        "system_context": "Search occupations and let user pick one to build manually",
        "next_state": "manual_data_collection",
        "progress": {"current": 2, "total": 5, "label": "Building your profile"}
    },
    "manual_data_collection": {
        "system_context": "Collect certifications, skills, experience manually",
        "next_state": "document_collection",
        "progress": {"current": 3, "total": 6, "label": "Almost there"}
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
        "next_state": "final_approval",
        "progress": {"current": 4, "total": 5, "label": "Almost there!"}
    },
    "final_approval": {
        "system_context": """Show summary of everything collected and ask for approval.
        Format response like:
        "Perfect! Let me show you what we've set up:
        
        📋 Profile Summary:
        • Occupation: Security Guard (85% match)
        • Certifications: Security License, First Aid/CPR
        • Experience: 18 months
        • Availability: Mon-Fri, 9am-5pm
        
        💰 Earning Potential:
        • $22/hour
        • $3,520/month (160 hours)
        • $42,240/year
        
        Does everything look good? I'll save this to your profile."
        
        Wait for user confirmation (Yes/Looks good/Confirm/etc)
        """,
        "quick_actions": [
            {"label": "✅ Yes, save my profile", "action": "approve_and_save"},
            {"label": "✏️ Let me edit something", "action": "edit_profile"}
        ],
        "next_state": "save_and_complete",
        "progress": {"current": 5, "total": 5, "label": "Review & confirm"}
    },
    "save_and_complete": {
        "system_context": """User approved. Execute actions to save all data:
        1. Create worker_qualification with action: {"type": "create_worker_qualification", "data": {extracted_data}}
        2. Create availability_blocks with action: {"type": "create_availability_blocks", "data": {availability}}
        3. Respond with success message and welcome them to dashboard
        """,
        "next_state": "onboarding_complete",
        "progress": {"current": 5, "total": 5, "label": "Saving..."}
    },
    "onboarding_complete": {
        "ai_prompt": "🎉 Perfect! Your profile is now live and you're ready to receive shift offers!\n\n✨ Welcome to HR Bank! You can now browse available shifts, manage your schedule, and start earning. The dashboard is all yours!\n\nIf you ever need help, just click the chat button in the corner. Good luck! 🚀",
        "next_state": "help_mode",
        "progress": {"current": 5, "total": 5, "label": "Complete!"}
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
            "show_ui": response_data.get("show_ui"),
            "progress": state_config.get("progress"),
            "extracted_data": response_data.get("extracted_data", {}),
            "occupation_suggestions": response_data.get("occupation_suggestions", [])
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
