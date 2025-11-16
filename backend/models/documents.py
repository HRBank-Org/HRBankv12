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
        'requires_issue_date': True,
        'requires_expiry_date': True,
        'activates_account': True
    },
    'work_permit': {
        'name': 'Work Permit',
        'description': 'Canadian work permit (required for non-citizens/PR)',
        'required': True,
        'has_expiry': True,
        'requires_issue_date': True,
        'requires_expiry_date': True,
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
        'requires_issue_date': True,
        'requires_expiry_date': True,
        'activates_account': True
    },
    'work_permit': {
        'name': 'Work Permit',
        'description': 'Canadian work permit (required for non-citizens/PR)',
        'required': True,
        'has_expiry': True,
        'requires_issue_date': True,
        'requires_expiry_date': True,
        'activates_account': True
    }
}

EMPLOYER_DOCUMENT_TYPES = {
    'business_registration': {
        'name': 'Business Registration',
        'description': 'Certificate of Incorporation or Sole Proprietorship registration',
        'required': True,
        'has_expiry': False,
        'requires_file': True,
        'requires_issue_date': True,
        'requires_expiry_date': False,
        'activates_account': True
    },
    'government_id': {
        'name': 'Government ID (Contact Person)',
        'description': 'Valid government-issued photo ID of the contact person',
        'required': True,
        'has_expiry': True,
        'requires_file': True,
        'requires_issue_date': True,
        'requires_expiry_date': True,
        'activates_account': True
    },
    'business_number': {
        'name': 'Business Number (BN)',
        'description': '9-digit CRA Business Number',
        'required': True,
        'has_expiry': False,
        'requires_file': False,
        'is_number_only': True,
        'number_format': '9 digits',
        'number_pattern': r'^\d{9}$',
        'number_example': '123456789',
        'requires_issue_date': False,
        'requires_expiry_date': False,
        'activates_account': True
    },
    'payroll_number': {
        'name': 'Payroll Account Number',
        'description': 'CRA Payroll Account (BN + RP identifier)',
        'required': True,
        'has_expiry': False,
        'requires_file': False,
        'is_number_only': True,
        'number_format': 'XXXXXXXXX RP 0001',
        'number_pattern': r'^\d{9}\s?RP\s?\d{4}$',
        'number_example': '123456789 RP 0001',
        'requires_issue_date': False,
        'requires_expiry_date': False,
        'activates_account': True
    },
    'gst_hst_number': {
        'name': 'GST/HST Number',
        'description': 'GST/HST Registration Number (BN + RT identifier)',
        'required': True,
        'has_expiry': False,
        'requires_file': False,
        'is_number_only': True,
        'number_format': 'XXXXXXXXX RT 0001',
        'number_pattern': r'^\d{9}\s?RT\s?\d{4}$',
        'number_example': '123456789 RT 0001',
        'requires_issue_date': False,
        'requires_expiry_date': False,
        'activates_account': True
    }
}

INSTITUTION_DOCUMENT_TYPES = {
    'business_registration': {
        'name': 'Business Registration',
        'description': 'Certificate of Incorporation or Educational Institution Registration',
        'required': True,
        'has_expiry': False,
        'requires_file': True,
        'requires_issue_date': True,
        'requires_expiry_date': False,
        'activates_account': True
    },
    'registrar_id': {
        'name': 'Registrar/Contact Person ID',
        'description': 'Valid government-issued photo ID of the registrar or primary contact person',
        'required': True,
        'has_expiry': True,
        'requires_file': True,
        'requires_issue_date': True,
        'requires_expiry_date': True,
        'activates_account': True
    },
    'accreditation': {
        'name': 'Accreditation Certificate',
        'description': 'Educational/Professional accreditation (optional)',
        'required': False,
        'has_expiry': True,
        'requires_file': True,
        'requires_issue_date': True,
        'requires_expiry_date': True,
        'activates_account': False
    }
}
