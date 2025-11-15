"""
AI Translation Service using Emergent LLM
Context-aware translation for workforce features
"""
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv

load_dotenv()

class AITranslationService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY', '')
        self.model_provider = "openai"
        self.model_name = "gpt-4o-mini"
    
    async def translate_text(
        self, 
        text: str, 
        target_language: str, 
        context: str = "general"
    ) -> str:
        """
        Translate text to target language with context awareness
        
        Args:
            text: Text to translate
            target_language: Target language (French, Spanish, Arabic, Ukrainian, Polish, Punjabi)
            context: Translation context (job_offer, chat_message, ui_element, notification)
        """
        
        # Create session for translation
        session_id = f"translate_{context}"
        
        # Context-aware system message
        system_messages = {
            "job_offer": f"You are a professional translator specializing in job postings and workplace terminology. Translate the following text to {target_language}, maintaining professional tone and preserving workplace-specific terms accurately.",
            "chat_message": f"You are translating a workplace chat message to {target_language}. Maintain the conversational tone and preserve any specific terms like shift times, locations, or job titles.",
            "ui_element": f"You are translating user interface text to {target_language}. Keep it concise and clear. Preserve button labels, menu items, and UI elements in a natural way.",
            "notification": f"You are translating a notification message to {target_language}. Maintain urgency and clarity while being professional.",
            "general": f"Translate the following text to {target_language} accurately."
        }
        
        system_message = system_messages.get(context, system_messages["general"])
        
        # Initialize chat
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model(self.model_provider, self.model_name)
        
        # Create translation prompt
        user_message = UserMessage(
            text=f"Translate this text to {target_language}. Only return the translation, no explanations:\n\n{text}"
        )
        
        # Get translation
        try:
            response = await chat.send_message(user_message)
            return response.strip()
        except Exception as e:
            # Fallback to original text if translation fails
            print(f"Translation error: {e}")
            return text
    
    async def translate_chat_message(
        self,
        message: str,
        from_language: str,
        to_language: str,
        sender_type: str = "worker"
    ) -> str:
        """
        Translate chat messages between worker and employer
        Worker → Employer: Worker's language → English
        Employer → Worker: English → Worker's language
        """
        
        context = "chat_message"
        
        if sender_type == "worker":
            # Worker typing in their language, employer needs English
            system_msg = f"Translate this workplace chat message from {from_language} to English. Maintain professional tone and preserve specific terms like times, dates, locations."
        else:
            # Employer typing in English, worker needs their language
            system_msg = f"Translate this workplace chat message from English to {to_language}. Be clear and professional."
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id="chat_translation",
            system_message=system_msg
        ).with_model(self.model_provider, self.model_name)
        
        user_message = UserMessage(
            text=f"Translate: {message}"
        )
        
        try:
            response = await chat.send_message(user_message)
            return response.strip()
        except Exception as e:
            print(f"Chat translation error: {e}")
            return message
    
    async def translate_job_offer(
        self,
        job_data: dict,
        target_language: str
    ) -> dict:
        """
        Translate entire job offer with context
        """
        
        system_msg = f"""You are translating a job posting to {target_language}. 
        Maintain professional tone and accurately translate:
        - Job titles and occupations
        - Workplace terminology
        - Required skills and certifications
        - Task descriptions
        
        Preserve formatting and return JSON format."""
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id="job_translation",
            system_message=system_msg
        ).with_model(self.model_provider, self.model_name)
        
        # Translate key fields
        fields_to_translate = ['role_title', 'company_name', 'workplace_name', 'required_skills']
        
        translated_job = job_data.copy()
        
        for field in fields_to_translate:
            if field in job_data and job_data[field]:
                translated_job[field] = await self.translate_text(
                    job_data[field] if isinstance(job_data[field], str) else str(job_data[field]),
                    target_language,
                    "job_offer"
                )
        
        return translated_job

# Singleton instance
ai_translation_service = AITranslationService()
