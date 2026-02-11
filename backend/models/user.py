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
    phone: Optional[str] = Field(None, pattern=r'^\+1-\d{3}-\d{3}-\d{4}$')
    country: Optional[str] = "CA"  # Default to Canada, supports international
    province: Optional[str] = None  # State/Province code (e.g., ON, TX, MH)
    postal_code: Optional[str] = None  # Postal/ZIP code for jurisdiction detection
    city: Optional[str] = None
    date_of_birth: Optional[str] = None  # Required for workforce, format: YYYY-MM-DD
    
    @validator('phone', always=True)
    def validate_phone_requirement(cls, v, values):
        """Phone is required for workforce/employer, optional for institution"""
        user_type = values.get('user_type')
        if user_type in ['workforce', 'employer'] and not v:
            raise ValueError('Phone number is required for workforce and employer accounts')
        return v
    
    @validator('date_of_birth', always=True)
    def validate_age_requirement(cls, v, values):
        """Date of birth required for workforce, must be at least 16 years old"""
        user_type = values.get('user_type')
        if user_type == 'workforce':
            if not v:
                raise ValueError('Date of birth is required for workforce accounts')
            try:
                from datetime import datetime
                dob = datetime.strptime(v, '%Y-%m-%d')
                today = datetime.now()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                if age < 16:
                    raise ValueError('You must be at least 16 years old to create a workforce account')
                if age > 100:
                    raise ValueError('Invalid date of birth')
            except ValueError as e:
                if 'does not match format' in str(e):
                    raise ValueError('Date of birth must be in YYYY-MM-DD format')
                raise e
        return v
    
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
