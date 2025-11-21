from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class EmmaMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    file_attachments: Optional[List[Dict[str, str]]] = None  # [{'file_name': 'resume.pdf', 'file_path': '/uploads/...'}]

class OnboardingContext(BaseModel):
    current_step: str = "greeting"  # greeting, profile_info, documents, occupation, compliance, complete
    completed_steps: List[str] = []
    profile_completion: Dict[str, bool] = {}  # {'basic_info': True, 'address': False, ...}
    pending_documents: List[str] = []  # ['id_upload', 'resume_upload', ...]
    parsed_resume_data: Optional[Dict[str, Any]] = None
    resume_approved: bool = False
    last_interaction: datetime = Field(default_factory=datetime.utcnow)

class EmmaConversation(BaseModel):
    conversation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_type: str  # workforce or employer
    messages: List[EmmaMessage] = []
    context: OnboardingContext = Field(default_factory=OnboardingContext)
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class EmmaChatRequest(BaseModel):
    message: str
    file_attachment: Optional[Dict[str, str]] = None  # {'file_name': 'resume.pdf', 'file_path': '/uploads/...'}

class EmmaChatResponse(BaseModel):
    message: str
    should_show_file_upload: bool = False
    upload_type: Optional[str] = None  # 'id', 'resume', 'document'
    onboarding_progress: float = 0.0  # percentage 0-100
    suggested_actions: Optional[List[str]] = None
