from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class Document(BaseModel):
    """User document model for ID, business registration, etc."""
    model_config = ConfigDict(extra="ignore")
    
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_type: str  # workforce, employer, institution
    
    # Document details
    document_type: str
    document_name: str
    file_url: str
    file_type: str
    file_size: int
    
    # Validity tracking
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    is_expired: bool = False
    days_until_expiry: Optional[int] = None
    
    # Verification
    verification_status: str = 'pending'
    verified_by: Optional[str] = None
    verified_date: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Metadata
    uploaded_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


# Document type definitions
WORKFORCE_DOCUMENT_TYPES = {
    'government_id': {
        'name': 'Government ID',
        'description': 'Valid government-issued photo ID',
        'required': True,
        'has_expiry': True
    },
    'sin_card': {
        'name': 'Social Insurance Number',
        'description': 'SIN card or letter',
        'required': True,
        'has_expiry': False
    },
    'work_permit': {
        'name': 'Work Permit',
        'description': 'Canadian work permit',
        'required': False,
        'has_expiry': True
    },
    'certifications': {
        'name': 'Professional Certifications',
        'description': 'Industry certifications',
        'required': False,
        'has_expiry': True
    }
}

EMPLOYER_DOCUMENT_TYPES = {
    'business_registration': {
        'name': 'Business Registration',
        'description': 'Business registration certificate',
        'required': True,
        'has_expiry': False
    },
    'business_license': {
        'name': 'Business License',
        'description': 'Municipal business license',
        'required': True,
        'has_expiry': True
    },
    'wsib_certificate': {
        'name': 'WSIB Certificate',
        'description': 'WSIB Certificate of Clearance',
        'required': True,
        'has_expiry': True
    },
    'liability_insurance': {
        'name': 'Liability Insurance',
        'description': 'General liability insurance',
        'required': True,
        'has_expiry': True
    },
    'payroll_registration': {
        'name': 'CRA Payroll Account',
        'description': 'CRA payroll registration',
        'required': True,
        'has_expiry': False
    }
}

INSTITUTION_DOCUMENT_TYPES = {
    'institution_license': {
        'name': 'Institution License',
        'description': 'Educational institution license',
        'required': True,
        'has_expiry': True
    },
    'accreditation': {
        'name': 'Accreditation Certificate',
        'description': 'Educational accreditation',
        'required': True,
        'has_expiry': True
    },
    'business_registration': {
        'name': 'Business Registration',
        'description': 'Registration documents',
        'required': True,
        'has_expiry': False
    },
    'liability_insurance': {
        'name': 'Liability Insurance',
        'description': 'Liability insurance certificate',
        'required': True,
        'has_expiry': True
    }
}
