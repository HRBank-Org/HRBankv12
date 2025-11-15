from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict
from typing import Optional, Literal
from datetime import datetime
import uuid
import re

class User(BaseModel):
    """Base User model for all user types"""
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: f"usr_{uuid.uuid4().hex[:12]}")
    email: EmailStr
    user_type: Literal['workforce', 'employer', 'institution', 'admin']
    profile_status: Literal['active', 'pending', 'suspended', 'rejected'] = 'pending'
    email_verified: bool = False
    mfa_enabled: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)
    last_login_date: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

class UserCreate(BaseModel):
    """User creation model for signup"""
    email: EmailStr
    password: str
    user_type: Literal['workforce', 'employer', 'institution']
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r'^\+1-\d{3}-\d{3}-\d{4}$')
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least 1 uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least 1 lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least 1 number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least 1 special character')
        return v

class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str

class UserInDB(User):
    """User model with hashed password (stored in DB)"""
    password_hash: str

class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    expires_in: int = 86400  # 24 hours in seconds
    user_id: str
    email: str
    user_type: str

class EmailVerification(BaseModel):
    """Email verification token"""
    user_id: str
    verification_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    verified: bool = False
