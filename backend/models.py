from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: Optional[str] = None
    user_type: str  # workforce, employer, institution
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False

class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    user_type: str

class UserLogin(BaseModel):
    email: str
    password: str
    user_type: str

class PartnerLogo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution_id: str
    logo_url: str
    institution_name: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class PartnerLogoCreate(BaseModel):
    institution_name: str
    logo_url: str

class PartnerLogoResponse(BaseModel):
    id: str
    institution_name: str
    logo_url: str
    uploaded_at: datetime
    is_active: bool

class MetricsData(BaseModel):
    workforce_count: int
    employer_count: int
    institution_count: int
    job_count: int
    compliance_rate: float
