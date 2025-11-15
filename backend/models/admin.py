from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

class Admin(BaseModel):
    """Admin user model"""
    model_config = ConfigDict(extra="ignore")
    
    admin_id: str = Field(default_factory=lambda: f"admin_{uuid.uuid4().hex[:12]}")
    user_id: str
    
    full_name: str
    email: str
    phone: Optional[str] = None
    
    role: str = 'admin'
    is_super_admin: bool = False
    
    assigned_zones: List[str] = []
    assigned_provinces: List[str] = []
    
    can_approve_documents: bool = True
    can_manage_users: bool = False
    can_manage_admins: bool = False
    can_view_analytics: bool = True
    
    status: str = 'active'
    
    created_by: Optional[str] = None
    created_date: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[str] = None


class Zone(BaseModel):
    """Geographic zone model"""
    model_config = ConfigDict(extra="ignore")
    
    zone_id: str = Field(default_factory=lambda: f"zone_{uuid.uuid4().hex[:12]}")
    
    zone_name: str
    zone_code: str
    province: str
    
    cities: List[str] = []
    postal_code_prefixes: List[str] = []
    
    total_users: int = 0
    total_employers: int = 0
    total_workforce: int = 0
    
    active: bool = True
    created_date: datetime = Field(default_factory=datetime.utcnow)
