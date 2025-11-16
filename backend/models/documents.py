from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class Document(BaseModel):
    """User document model for ID, business registration, etc."""
    model_config = ConfigDict(extra="ignore")
    
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_type: str  # workforce, employer, institution, admin
    
    # Document details
    document_type: str
    document_name: str
    file_url: Optional[str] = None  # Optional for number-only documents
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    
    # Document/License numbers (for BN, Payroll, GST/HST, License numbers)
    document_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    
    # Validity tracking
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    is_expired: bool = False
    days_until_expiry: Optional[int] = None
    
    # Verification
    verification_status: str = 'pending'  # pending, approved, rejected
    verified_by: Optional[str] = None
    verified_date: Optional[str] = None
    rejection_reason: Optional[str] = None
    activates_account: bool = False  # If true, account activates when approved
    
    # Metadata
    uploaded_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


# Document type definitions
WORKFORCE_DOCUMENT_TYPES = {
    'government_id': {
        'name': 'Government ID',
        'description': 'Valid government-issued photo ID (Driver License, Passport, PR Card, etc.)',
        'required': True,
        'has_expiry': True,
        'activates_account': True
    },
    'work_permit': {
        'name': 'Work Permit',
        'description': 'Canadian work permit (if applicable)',
        'required': False,
        'has_expiry': True,
        'activates_account': True
    }
}

# Admins have same document requirements as workforce (HR Bank is employer)
ADMIN_DOCUMENT_TYPES = {
    'government_id': {
        'name': 'Government ID',
        'description': 'Valid government-issued photo ID',
        'required': True,
        'has_expiry': True,
        'activates_account': True
    },
    'work_permit': {
        'name': 'Work Permit',
        'description': 'Canadian work permit (if applicable)',
        'required': False,
        'has_expiry': True,
        'activates_account': True
    }
}

EMPLOYER_DOCUMENT_TYPES = {
    'business_license': {
        'name': 'Business License',
        'description': 'Provincial/Municipal business license',
        'required': True,
        'has_expiry': True,
        'has_number': True,
        'activates_account': True
    },
    'business_number': {
        'name': 'Business Number (BN)',
        'description': '9-digit CRA Business Number',
        'required': True,
        'has_expiry': False,
        'has_number': True,
        'number_format': '9 digits',
        'activates_account': True
    },
    'payroll_number': {
        'name': 'Payroll Account Number',
        'description': 'CRA Payroll Account (BN + RP identifier)',
        'required': True,
        'has_expiry': False,
        'has_number': True,
        'number_format': 'XXXXXXXXX RP 0001',
        'activates_account': True
    },
    'gst_hst_number': {
        'name': 'GST/HST Number',
        'description': 'GST/HST Registration Number (BN + RT identifier)',
        'required': True,
        'has_expiry': False,
        'has_number': True,
        'number_format': 'XXXXXXXXX RT 0001',
        'activates_account': True
    }
}

INSTITUTION_DOCUMENT_TYPES = {
    'business_license': {
        'name': 'Business License',
        'description': 'Provincial/Municipal business license',
        'required': True,
        'has_expiry': True,
        'has_number': True,
        'activates_account': True
    },
    'business_number': {
        'name': 'Business Number (BN)',
        'description': '9-digit CRA Business Number',
        'required': True,
        'has_expiry': False,
        'has_number': True,
        'activates_account': True
    },
    'accreditation': {
        'name': 'Accreditation Certificate',
        'description': 'Educational/Professional accreditation',
        'required': False,
        'has_expiry': True,
        'has_number': True,
        'activates_account': False
    },
    'payroll_number': {
        'name': 'Payroll Account Number',
        'description': 'CRA Payroll Account (if applicable)',
        'required': False,
        'has_expiry': False,
        'has_number': True,
        'activates_account': False
    },
    'gst_hst_number': {
        'name': 'GST/HST Number',
        'description': 'GST/HST Registration Number',
        'required': False,
        'has_expiry': False,
        'has_number': True,
        'activates_account': False
    }
}
