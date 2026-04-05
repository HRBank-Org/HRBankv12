from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class OccupationProfile(BaseModel):
    """Separate occupation profile for workforce (max 3 per worker)"""
    model_config = ConfigDict(extra="ignore")
    
    occupation_id: str = Field(default_factory=lambda: f"occ_{uuid.uuid4().hex[:12]}")
    workforce_id: str
    occupation_title: str  # e.g., "Security Guard", "Personal Support Worker"
    occupation_category: str  # e.g., "Security", "Healthcare", "Hospitality"
    
    # Skills specific to this occupation
    skills: List[str] = []
    
    # Experience tracking (specific to this occupation)
    years_of_experience: int = 0  # Self-reported years of experience
    total_hours_worked: float = 0.0
    total_shifts_completed: int = 0
    
    # Dual Rating System
    general_rating_avg: float = 0.0  # Behavior, ethics, professionalism (shared across all occupations)
    general_rating_count: int = 0
    skill_rating_avg: float = 0.0  # Skills for THIS occupation only
    skill_rating_count: int = 0
    
    # Certifications (occupation-specific)
    certifications: List[str] = []  # credential_ids verified AND admin-approved
    
    # Preferences (occupation-specific)
    hourly_rate_preference: Optional[float] = None
    
    # Status
    active: bool = True  # Can be set to false to "pause" this occupation
    profile_completeness: int = 0  # Calculated: skills (33%), certs (33%), rate (34%)
    
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OccupationRating(BaseModel):
    """Rating for a specific occupation (skill-based)"""
    model_config = ConfigDict(extra="ignore")
    
    rating_id: str = Field(default_factory=lambda: f"occrt_{uuid.uuid4().hex[:12]}")
    occupation_id: str  # Which occupation this rating is for
    from_employer_id: str
    booking_id: str
    
    # Skill ratings (specific to occupation)
    work_quality: int  # 1-5
    technical_skills: int  # 1-5
    task_completion: int  # 1-5
    occupation_expertise: int  # 1-5
    
    skill_rating_overall: float  # Average of above
    comment: Optional[str] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GeneralRating(BaseModel):
    """General rating for workforce (behavior, not occupation-specific)"""
    model_config = ConfigDict(extra="ignore")
    
    rating_id: str = Field(default_factory=lambda: f"genrt_{uuid.uuid4().hex[:12]}")
    workforce_id: str  # Worker being rated
    from_employer_id: str
    booking_id: str
    
    # General ratings (apply to all occupations)
    professionalism: int  # 1-5
    communication: int  # 1-5
    reliability: int  # 1-5
    punctuality: int  # 1-5
    
    general_rating_overall: float  # Average of above
    comment: Optional[str] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CredentialApproval(BaseModel):
    """Admin approval step for verified credentials"""
    model_config = ConfigDict(extra="ignore")
    
    approval_id: str = Field(default_factory=lambda: f"appr_{uuid.uuid4().hex[:12]}")
    credential_id: str
    occupation_id: str  # Which occupation this credential belongs to
    workforce_id: str
    
    # Institution verification (step 1)
    institution_verified: bool = False
    institution_verified_by: Optional[str] = None
    institution_verified_date: Optional[datetime] = None
    
    # Admin approval (step 2)
    admin_approved: bool = False
    admin_approved_by: Optional[str] = None
    admin_approved_date: Optional[datetime] = None
    admin_rejection_reason: Optional[str] = None
    
    status: str = 'pending_institution'  # pending_institution, pending_admin, approved, rejected
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
