from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

class InviteToken(BaseModel):
    """Invitation token for bulk invites"""
    model_config = ConfigDict(extra="ignore")
    
    invite_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    invited_by_user_id: str
    invited_by_user_type: str  # institution or employer
    
    # Invitee info
    email: str
    full_name: str
    phone: Optional[str] = None
    
    # Pre-fill data
    suggested_occupation: Optional[str] = None  # For institution invites
    program: Optional[str] = None  # For institution invites
    graduation_year: Optional[int] = None
    workplace_id: Optional[str] = None  # For employer invites
    
    # Token
    invite_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    expires_at: datetime
    
    # Status
    status: str = 'sent'  # sent, accepted, expired, cancelled
    accepted_date: Optional[datetime] = None
    created_user_id: Optional[str] = None
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)

class BulkInviteBatch(BaseModel):
    """Batch of invitations uploaded via CSV"""
    model_config = ConfigDict(extra="ignore")
    
    batch_id: str = Field(default_factory=lambda: f"batch_{uuid.uuid4().hex[:12]}")
    uploaded_by_user_id: str
    uploaded_by_user_type: str  # institution or employer
    
    # CSV info
    file_name: str
    total_rows: int
    successful_invites: int
    failed_rows: int
    
    # Invites created
    invite_ids: List[str] = []
    
    # Status
    status: str = 'processing'  # processing, completed, failed
    
    created_date: datetime = Field(default_factory=datetime.utcnow)
