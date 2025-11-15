from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, date
import uuid

class Document(BaseModel):
    """User document model for ID, business registration, etc."""
    model_config = ConfigDict(extra="ignore")
    
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_type: str  # workforce, employer, institution
    
    # Document details
    document_type: str  # government_id, business_registration, institution_license, wsib_certificate, insurance_certificate, etc.
    document_name: str
    file_url: str  # Path or URL to stored file
    file_type: str  # pdf, jpg, png, etc.
    file_size: int  # in bytes
    
    # Validity tracking
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_expired: bool = False
    days_until_expiry: Optional[int] = None
    
    # Verification
    verification_status: str = 'pending'  # pending, verified, rejected, expired
    verified_by: Optional[str] = None  # user_id of admin who verified
    verified_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Metadata
    uploaded_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


class DocumentSettings(BaseModel):
    """Document requirements and settings per user type"""
    model_config = ConfigDict(extra="ignore")
    
    user_type: str
    required_documents: list[str]  # List of required document types
    optional_documents: list[str]  # List of optional document types
    max_file_size_mb: int = 10
    allowed_file_types: list[str] = ['pdf', 'jpg', 'jpeg', 'png']


# Document type definitions
WORKFORCE_DOCUMENT_TYPES = {
    'government_id': {
        'name': 'Government ID',
        'description': 'Valid government-issued photo ID (Driver\'s License, Passport, etc.)',
        'required': True,
        'has_expiry': True
    },
    'sin_card': {
        'name': 'Social Insurance Number',
        'description': 'SIN card or letter from Service Canada',
        'required': True,
        'has_expiry': False
    },
    'work_permit': {
        'name': 'Work Permit',
        'description': 'Canadian work permit (if applicable)',
        'required': False,
        'has_expiry': True
    },
    'certifications': {
        'name': 'Professional Certifications',
        'description': 'Industry certifications (First Aid, Food Handler, etc.)',
        'required': False,
        'has_expiry': True
    }
}

EMPLOYER_DOCUMENT_TYPES = {
    'business_registration': {
        'name': 'Business Registration',
        'description': 'Business registration certificate or incorporation documents',
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
        'description': 'Workplace Safety and Insurance Board Certificate of Clearance',
        'required': True,
        'has_expiry': True
    },
    'liability_insurance': {
        'name': 'Liability Insurance',
        'description': 'General liability insurance certificate',
        'required': True,
        'has_expiry': True
    },
    'payroll_registration': {
        'name': 'CRA Payroll Account',
        'description': 'Proof of CRA payroll account registration',
        'required': True,
        'has_expiry': False
    }
}

INSTITUTION_DOCUMENT_TYPES = {
    'institution_license': {
        'name': 'Educational Institution License',
        'description': 'Provincial/federal license to operate as an educational institution',
        'required': True,
        'has_expiry': True
    },
    'accreditation': {
        'name': 'Accreditation Certificate',
        'description': 'Accreditation from relevant educational authority',
        'required': True,
        'has_expiry': True
    },
    'business_registration': {
        'name': 'Business Registration',
        'description': 'Non-profit or business registration documents',
        'required': True,
        'has_expiry': False
    },
    'liability_insurance': {
        'name': 'Liability Insurance',
        'description': 'General liability insurance certificate',
        'required': True,
        'has_expiry': True
    },
    'privacy_policy': {
        'name': 'Privacy Policy Compliance',
        'description': 'Privacy policy compliance certificate (PIPEDA, FERPA)',
        'required': False,
        'has_expiry': True
    }
}
