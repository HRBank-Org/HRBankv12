from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

class ChatThread(BaseModel):
    """Chat thread between employer and worker for a specific booking"""
    model_config = ConfigDict(extra="ignore")
    
    thread_id: str = Field(default_factory=lambda: f"thread_{uuid.uuid4().hex[:12]}")
    booking_id: str  # Links to specific booking/shift
    workforce_id: str
    employer_id: str
    shift_id: str
    role_title: str  # For display
    
    # Thread status
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_from: Optional[str] = None  # user_id
    
    # Unread counts
    employer_unread_count: int = 0
    workforce_unread_count: int = 0
    
    # Thread metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    archived: bool = False

class Message(BaseModel):
    """Individual message in a chat thread"""
    model_config = ConfigDict(extra="ignore")
    
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    thread_id: str
    from_user_id: str
    from_user_type: str  # workforce or employer
    to_user_id: str
    
    # Message content
    message_text: str
    message_type: str = 'text'  # text, image, file (future)
    attachment_url: Optional[str] = None
    
    # Status
    read: bool = False
    read_at: Optional[datetime] = None
    delivered: bool = False
    delivered_at: Optional[datetime] = None
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    edited: bool = False
    deleted: bool = False
