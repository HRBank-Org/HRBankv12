from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
import uuid

class JobPosting(BaseModel):
    """Job posting created from a shift/role by employer"""
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employer_id: str
    workplace_id: str
    shift_id: Optional[str] = None
    roster_id: Optional[str] = None
    role_id: Optional[str] = None
    
    # Job Details
    position_title: str
    occupation_template_id: Optional[str] = None  # Links to admin occupation template
    required_skills: List[str] = []
    required_certifications: List[str] = []
    
    # Compensation & Schedule
    pay_per_hour: float
    shift_duration: str  # e.g., "8 hours", "4-6 hours"
    employment_duration: str  # e.g., "3 months", "ongoing", "seasonal"
    start_date: Optional[date] = None
    
    # Location (inherited from workplace)
    workplace_address: str
    workplace_city: str
    workplace_postal_code: str
    workplace_coordinates: Optional[Dict[str, float]] = None  # {lat, lng}
    
    # Job Description
    key_tasks: str
    additional_requirements: Optional[str] = None
    
    # Matching Criteria
    max_distance_km: float = 25.0  # Default 25km radius
    
    # Status
    status: str = "active"  # active, filled, cancelled
    positions_available: int = 1
    positions_filled: int = 0
    
    # Timestamps
    posted_date: datetime = Field(default_factory=datetime.utcnow)
    expires_date: Optional[datetime] = None
    filled_date: Optional[datetime] = None
    
    # Metadata
    company_name: str
    company_logo_url: Optional[str] = None

class JobMatch(BaseModel):
    """Represents a match between a job and a workforce member"""
    match_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    workforce_id: str
    
    # Match Scoring
    match_score: float  # 0-100 percentage
    skill_match_score: float
    certification_match_score: float
    distance_score: float
    availability_score: float
    
    # Details
    distance_km: float
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    matched_certifications: List[str] = []
    missing_certifications: List[str] = []
    
    # Status
    status: str = "matched"  # matched, applied, viewed, rejected
    workforce_applied: bool = False
    employer_viewed: bool = False
    employer_interested: bool = False
    
    # Timestamps
    matched_date: datetime = Field(default_factory=datetime.utcnow)
    applied_date: Optional[datetime] = None
    viewed_date: Optional[datetime] = None

class InterviewInvitation(BaseModel):
    """Interview invitation from employer to workforce"""
    interview_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    employer_id: str
    workforce_id: str
    
    # Interview Details
    scheduled_date: date
    scheduled_time: time
    duration_minutes: int = 30
    timezone: str = "America/Toronto"
    
    # Video Call
    video_room_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    video_link: Optional[str] = None
    
    # Additional Info
    position_title: str
    company_name: str
    notes: Optional[str] = None
    
    # Status
    status: str = "pending"  # pending, accepted, declined, completed, cancelled
    
    # Timestamps
    created_date: datetime = Field(default_factory=datetime.utcnow)
    accepted_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    
    # Results
    employer_notes: Optional[str] = None
    workforce_notes: Optional[str] = None

class JobOffer(BaseModel):
    """Direct job offer from employer to workforce"""
    offer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    employer_id: str
    workforce_id: str
    
    # Offer Details
    position_title: str
    company_name: str
    workplace_id: str
    workplace_address: str
    
    # Compensation & Terms
    pay_per_hour: float
    shift_duration: str
    employment_duration: str
    start_date: date
    expected_hours_per_week: Optional[float] = None
    
    # Job Details
    key_tasks: str
    distance_km: float
    
    # Benefits/Perks (optional)
    benefits: Optional[List[str]] = None
    
    # Offer Terms
    expires_date: datetime
    expires_in_hours: Optional[int] = None
    
    # Status
    status: str = "pending"  # pending, accepted, rejected, expired, withdrawn
    
    # Timestamps
    sent_date: datetime = Field(default_factory=datetime.utcnow)
    responded_date: Optional[datetime] = None
    
    # Response
    workforce_response: Optional[str] = None  # accept, reject
    workforce_message: Optional[str] = None
    
    # If accepted, link to created booking/shift
    booking_id: Optional[str] = None

class JobApplication(BaseModel):
    """Workforce application to a matched job"""
    application_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    workforce_id: str
    match_id: Optional[str] = None
    
    # Application Content
    cover_message: Optional[str] = None
    availability_notes: Optional[str] = None
    
    # Status
    status: str = "submitted"  # submitted, under_review, interview_scheduled, rejected, offer_sent
    
    # Timestamps
    submitted_date: datetime = Field(default_factory=datetime.utcnow)
    reviewed_date: Optional[datetime] = None
    
    # Employer Response
    employer_viewed: bool = False
    employer_notes: Optional[str] = None

# Request/Response Models
class JobPostingCreate(BaseModel):
    workplace_id: str
    shift_id: Optional[str] = None
    position_title: str
    occupation_template_id: Optional[str] = None
    required_skills: List[str] = []
    required_certifications: List[str] = []
    pay_per_hour: float
    shift_duration: str
    employment_duration: str
    start_date: Optional[date] = None
    key_tasks: str
    additional_requirements: Optional[str] = None
    max_distance_km: float = 25.0
    positions_available: int = 1

class InterviewInvitationCreate(BaseModel):
    workforce_id: str
    job_id: str
    scheduled_date: date
    scheduled_time: time
    duration_minutes: int = 30
    notes: Optional[str] = None

class JobOfferCreate(BaseModel):
    workforce_id: str
    job_id: str
    pay_per_hour: float
    shift_duration: str
    employment_duration: str
    start_date: date
    expected_hours_per_week: Optional[float] = None
    key_tasks: str
    benefits: Optional[List[str]] = None
    expires_in_hours: int = 48

class JobApplicationCreate(BaseModel):
    job_id: str
    cover_message: Optional[str] = None
    availability_notes: Optional[str] = None
