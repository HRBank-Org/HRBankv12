from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

class InstitutionProfile(BaseModel):
    """Institution profile for credential verification"""
    model_config = ConfigDict(extra="ignore")
    
    institution_id: str  # Same as user_id
    
    # Contact person details - collected during signup/onboarding
    first_name: str
    last_name: str
    title: Optional[str] = None  # Job title (e.g., "Registrar", "Verification Officer")
    
    # Institution details
    institution_name: str
    institution_logo_url: Optional[str] = None  # Institution logo for header display
    institution_type: str  # college, government, certification_body, employer
    
    address: str
    postal_code: str
    catchment_area_postal_codes: List[str] = []  # For demand analytics filtering
    phone: str
    
    # Legacy fields for backward compatibility
    contact_person: Optional[str] = None  # Deprecated - use first_name + last_name
    contact_name: Optional[str] = None  # Deprecated - use first_name + last_name
    full_name: Optional[str] = None  # Auto-generated from first_name + last_name
    
    verified_status: str = 'pending'  # approved, pending, rejected
    credentials_issued: List[str] = []  # credential_type_ids they can verify
    api_key: Optional[str] = None
    api_key_created_date: Optional[datetime] = None
    total_verified: int = 0
    avg_verification_time_days: float = 0.0
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class CredentialVerificationRequest(BaseModel):
    """Verification request for institution"""
    model_config = ConfigDict(extra="ignore")
    
    request_id: str = Field(default_factory=lambda: f"vr_{uuid.uuid4().hex[:12]}")
    workforce_id: str
    credential_id: str
    assigned_to_institution_id: str
    requested_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = 'pending'  # pending, in_progress, verified, rejected
    verified_by_institution_id: Optional[str] = None
    verification_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    priority: str = 'normal'  # normal, urgent
    updated_date: datetime = Field(default_factory=datetime.utcnow)
