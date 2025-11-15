from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

class AdminUser(BaseModel):
    """Admin user profile"""
    model_config = ConfigDict(extra="ignore")
    
    admin_id: str  # Same as user_id
    role: str = 'moderator'  # super_admin, moderator
    permissions: List[str] = Field(
        default_factory=lambda: [
            'manage_users',
            'manage_institutions',
            'manage_credentials',
            'view_analytics',
            'system_settings'
        ]
    )
    created_date: datetime = Field(default_factory=datetime.utcnow)

class AuditLog(BaseModel):
    """Audit log entry"""
    model_config = ConfigDict(extra="ignore")
    
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    user_type: Optional[str] = None
    action_category: str  # user_action, data_access, admin_action, security_event, financial
    action: str  # login, logout, created, updated, deleted, etc.
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    result: str = 'success'  # success, failure
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Notification(BaseModel):
    """User notification"""
    model_config = ConfigDict(extra="ignore")
    
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    notification_type: str  # job_opportunity, shift_management, task, attendance_payroll, credential, rating, account
    notification_subtype: str  # e.g., shift_assigned, credential_expired
    title: str
    message: str
    read_status: bool = False
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    action_button_text: Optional[str] = None
    metadata: Optional[dict] = None
    priority: str = 'normal'  # low, normal, high, urgent
    expires_at: Optional[datetime] = None
    created_date: datetime = Field(default_factory=datetime.utcnow)
