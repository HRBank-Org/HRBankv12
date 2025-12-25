from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class CredentialRequest(BaseModel):
    """Worker's credential pending institution verification"""
    credential_id: str = Field(default_factory=lambda: f"cred_{uuid.uuid4().hex[:12]}")
    worker_id: str
    worker_name: str
    worker_email: str
    
    # Credential details
    credential_type: str  # degree, certificate, diploma, license, certification
    credential_name: str  # e.g., "Personal Support Worker Certificate", "Bachelor of Nursing"
    field_of_study: Optional[str] = None  # e.g., "Nursing", "Computer Science"
    
    # Issuing institution
    institution_name: str
    institution_email: str  # Used to invite institution
    institution_id: Optional[str] = None  # Set after institution creates account
    
    # Dates
    issue_date: str
    expiry_date: Optional[str] = None
    
    # Files
    document_url: Optional[str] = None  # Uploaded credential document
    
    # Status
    status: str = "pending"  # pending, verified, rejected
    verification_date: Optional[str] = None
    verified_by: Optional[str] = None  # institution_id who verified
    rejection_reason: Optional[str] = None
    
    # Metadata
    created_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
class VerifiedCredential(BaseModel):
    """Verified credential displayed on worker profile"""
    credential_id: str
    credential_type: str
    credential_name: str
    field_of_study: Optional[str] = None
    institution_name: str
    institution_id: str
    issue_date: str
    expiry_date: Optional[str] = None
    verification_date: str
    document_url: Optional[str] = None
    is_expired: bool = False

CREDENTIAL_TYPES = [
    "Certificate",
    "Diploma", 
    "Degree",
    "License",
    "Certification",
    "Training Completion",
    "Industry Credential"
]
