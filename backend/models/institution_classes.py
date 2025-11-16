"""
Institution Classes and Class Templates Models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

# Credential types that can be issued
CREDENTIAL_TYPES = [
    'Certificate',
    'Diploma', 
    'Degree',
    'Professional License',
    'Training Badge',
    'Certification',
    'Course Completion'
]

# Class statuses
CLASS_STATUS = [
    'draft',      # Being created/edited
    'active',     # Currently running
    'completed',  # Finished
    'archived'    # Old/inactive
]

class ClassTemplate(BaseModel):
    """Reusable class template"""
    model_config = ConfigDict(extra="ignore")
    
    template_id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    institution_id: str
    
    # Template details
    template_name: str
    description: Optional[str] = None
    credential_type: str  # Certificate, Diploma, Degree, etc.
    validity_period_months: Optional[int] = None  # How long credential is valid (None = lifetime)
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


class InstitutionClass(BaseModel):
    """A class/course offered by institution"""
    model_config = ConfigDict(extra="ignore")
    
    class_id: str = Field(default_factory=lambda: f"class_{uuid.uuid4().hex[:12]}")
    institution_id: str
    template_id: Optional[str] = None  # If created from template
    
    # Class details
    title: str
    description: Optional[str] = None
    credential_type: str  # Certificate, Diploma, Degree, etc.
    
    # Dates
    start_date: str  # ISO format
    end_date: str    # ISO format
    
    # Credential validity
    validity_period_months: Optional[int] = None  # None = lifetime
    
    # Status
    status: str = 'draft'  # draft, active, completed, archived
    
    # Enrollment
    enrolled_students: List[str] = []  # List of user_ids
    total_enrolled: int = 0
    credentials_issued: int = 0
    
    # Metadata
    created_by: str  # user_id of institution admin who created it
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)


class CredentialIssuance(BaseModel):
    """Record of credential issued to a student"""
    model_config = ConfigDict(extra="ignore")
    
    credential_id: str = Field(default_factory=lambda: f"cred_{uuid.uuid4().hex[:12]}")
    
    # Relationships
    institution_id: str
    class_id: str
    student_id: str  # workforce user_id
    
    # Credential details
    credential_type: str
    credential_name: str  # e.g., "Food Safety Certificate"
    
    # Blockchain mock
    blockchain_hash: str = Field(default_factory=lambda: f"0x{uuid.uuid4().hex}")
    blockchain_url: Optional[str] = None
    
    # Dates
    issue_date: str  # ISO format
    expiry_date: Optional[str] = None  # ISO format, None if lifetime
    
    # Status
    status: str = 'active'  # active, expired, revoked
    is_verified: bool = True  # Issued credentials are auto-verified
    
    # Metadata
    issued_by: str  # user_id of institution admin
    issued_date: datetime = Field(default_factory=datetime.utcnow)
    revoked_date: Optional[datetime] = None
    revoke_reason: Optional[str] = None


class VerificationRequest(BaseModel):
    """Request from workforce to verify their credential"""
    model_config = ConfigDict(extra="ignore")
    
    request_id: str = Field(default_factory=lambda: f"vreq_{uuid.uuid4().hex[:12]}")
    
    # Requestor info
    workforce_id: str
    occupation_id: Optional[str] = None  # Which occupation profile this is for
    
    # Credential info
    credential_name: str
    credential_type: str
    institution_name: str
    registrar_email: str  # Email to send verification request
    
    # Document
    credential_image_url: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    
    # Status
    status: str = 'pending'  # pending, verified, rejected, institution_invited
    
    # Institution response (after they join)
    institution_id: Optional[str] = None
    verified_by: Optional[str] = None
    verified_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Invitation tracking
    invitation_sent: bool = False
    invitation_sent_date: Optional[datetime] = None
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
