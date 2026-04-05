from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, date, timezone
import uuid

class WorkforceProfile(BaseModel):
    """Worker profile - personal info only (no occupation-specific data)"""
    model_config = ConfigDict(extra="ignore")
    
    workforce_id: str  # Same as user_id
    
    # Name fields - collected during signup/onboarding
    first_name: str
    last_name: str
    full_name: Optional[str] = None  # Auto-generated from first_name + last_name for compatibility
    
    phone: str  # PRIVATE - Never shown to employers
    address: str  # PRIVATE - Never shown to employers
    city: Optional[str] = None  # For Canada-wide expansion
    province: Optional[str] = None  # ON, BC, AB, QC, etc.
    postal_code: str  # Used for matching, but full address hidden
    lat: float
    long: float
    
    # Verification status
    phone_verified: bool = False
    phone_verified_at: Optional[datetime] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    
    # EDUCATION INFORMATION
    education: Dict = Field(
        default_factory=lambda: {
            'high_school': {
                'completed': False,
                'school_name': '',
                'graduation_year': None,
                'location': ''
            },
            'college': {
                'completed': False,
                'school_name': '',
                'program': '',
                'graduation_year': None,
                'location': ''
            },
            'trade_school': {
                'completed': False,
                'school_name': '',
                'trade': '',
                'completion_year': None,
                'location': ''
            },
            'bachelors': {
                'completed': False,
                'school_name': '',
                'degree': '',
                'major': '',
                'graduation_year': None,
                'location': ''
            },
            'masters': {
                'completed': False,
                'school_name': '',
                'degree': '',
                'major': '',
                'graduation_year': None,
                'location': ''
            }
        }
    )
    
    # UNIVERSAL AVAILABILITY (shared across all occupations)
    availability_hours: Dict[str, List[str]] = Field(
        default_factory=lambda: {
            'monday': [],
            'tuesday': [],
            'wednesday': [],
            'thursday': [],
            'friday': [],
            'saturday': [],
            'sunday': []
        }
    )
    blackout_dates: List[str] = []  # Dates worker is NOT available
    
    # General info (not occupation-specific)
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None
    preferred_language: str = 'English'  # English, French, Spanish, Arabic, Ukrainian, Polish, Punjabi
    
    # Overall stats (across all occupations)
    total_hours_worked: float = 0.0  # Sum of all occupations
    total_shifts_completed: int = 0
    general_rating_avg: float = 0.0  # Behavior/professionalism (shared)
    general_rating_count: int = 0
    
    # Occupation profiles (max 3)
    occupation_count: int = 0  # Current number of occupation profiles
    
    # Account status
    onboarding_completed: bool = False
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkforceCredential(BaseModel):
    """Worker credential with 3-step approval (submit → institution verify → admin approve)"""
    model_config = ConfigDict(extra="ignore")
    
    credential_id: str = Field(default_factory=lambda: f"cred_{uuid.uuid4().hex[:12]}")
    workforce_id: str
    occupation_id: str  # Which occupation this credential belongs to
    credential_type_id: str
    credential_type_name: str  # For display
    issuing_institution_name: str
    credential_id_number: Optional[str] = None
    issue_date: date
    expiration_date: Optional[date] = None
    document_url: str
    
    # Step 1: Worker submission
    submitted_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Step 2: Institution verification
    institution_verification_status: str = 'pending'  # pending, verified, rejected
    verified_by_institution_id: Optional[str] = None
    institution_verified_date: Optional[datetime] = None
    institution_rejection_reason: Optional[str] = None
    
    # Step 3: Admin approval (AFTER institution verification)
    admin_approval_status: str = 'pending'  # pending, approved, rejected
    approved_by_admin_id: Optional[str] = None
    admin_approved_date: Optional[datetime] = None
    admin_rejection_reason: Optional[str] = None
    
    # Final status (only "approved" if both institution AND admin approve)
    final_status: str = 'pending_institution'  # pending_institution, pending_admin, approved, rejected
    
    notes: Optional[str] = None
    priority: str = 'normal'  # normal, urgent

class CredentialType(BaseModel):
    """Credential type definition"""
    model_config = ConfigDict(extra="ignore")
    
    credential_type_id: str = Field(default_factory=lambda: f"ct_{uuid.uuid4().hex[:12]}")
    credential_name: str
    category: str  # e.g., "Hospitality", "Healthcare", "Safety"
    description: str
    typical_expiration_years: Optional[int] = None
    verifying_institutions: List[str] = []  # institution_ids that can verify
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
