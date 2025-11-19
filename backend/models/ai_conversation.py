from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ConversationMessage(BaseModel):
    role: str  # "ai" or "user"
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    file_url: Optional[str] = None

class AIConversation(BaseModel):
    conversation_id: str
    user_id: str
    user_type: str  # "workforce", "employer", "institution"
    conversation_state: str  # Current state in onboarding flow
    conversation_history: List[ConversationMessage] = []
    extracted_data: Dict[str, Any] = {}  # Data extracted from conversation
    onboarding_complete: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    message: str
    file_url: Optional[str] = None

class QuickAction(BaseModel):
    label: str
    action: str
    data: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    ai_message: str
    next_state: str
    actions: List[Dict[str, Any]] = []
    quick_actions: List[QuickAction] = []
    show_ui: Optional[str] = None  # "calendar", "form", etc.
    progress: Optional[Dict[str, Any]] = None  # {"current": 2, "total": 5, "label": "Setting up availability"}
