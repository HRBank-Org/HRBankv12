from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, time, date
import uuid

class EmployerProfile(BaseModel):
    """Employer profile"""
    model_config = ConfigDict(extra="ignore")
    
    employer_id: str  # Same as user_id
    
    # Contact person details - collected during signup/onboarding
    first_name: str
    last_name: str
    title: Optional[str] = None  # Job title (e.g., "HR Manager", "Owner")
    
    # Company details
    company_name: str
    company_logo_url: Optional[str] = None  # Company logo for header display
    
    address: str
    city: Optional[str] = None  # For Canada-wide expansion
    province: Optional[str] = None  # ON, BC, AB, QC, etc.
    postal_code: str
    industry: str
    
    # Legacy fields for backward compatibility
    contact_person: Optional[str] = None  # Deprecated - use first_name + last_name
    contact_name: Optional[str] = None  # Deprecated - use first_name + last_name
    full_name: Optional[str] = None  # Auto-generated from first_name + last_name
    
    verified_status: str = 'pending'  # active, pending, suspended
    rating_avg: float = 0.0
    rating_count: int = 0
    total_workers_hired: int = 0
    onboarding_completed: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class Workplace(BaseModel):
    """Workplace/Location for employer"""
    model_config = ConfigDict(extra="ignore")
    
    workplace_id: str = Field(default_factory=lambda: f"wp_{uuid.uuid4().hex[:12]}")
    employer_id: str
    workplace_name: str
    address: str
    city: Optional[str] = None  # For Canada-wide expansion
    province: Optional[str] = None  # ON, BC, AB, QC, etc.
    postal_code: str
    lat: Optional[float] = None
    long: Optional[float] = None
    attendance_geofence_radius_m: int = 100  # Fixed 100m for attendance
    job_matching_radius_km: int = 20  # 5-50km for job discovery
    timezone: str = 'America/Toronto'
    break_rules: Dict = Field(
        default_factory=lambda: {
            'mid_shift_break_minutes': 30,
            'break_every_hours': 2,
            'break_duration_minutes': 10
        }
    )
    max_hours_per_day: int = 8
    auto_scheduling_enabled: bool = False
    notification_preferences: Dict = Field(default_factory=dict)
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class ShiftTemplate(BaseModel):
    """Reusable shift template"""
    model_config = ConfigDict(extra="ignore")
    
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    employer_id: str
    template_name: str
    shift_type: str  # morning, evening, night
    start_time: time
    end_time: time
    recurring_days: Dict = Field(
        default_factory=lambda: {
            'monday': False,
            'tuesday': False,
            'wednesday': False,
            'thursday': False,
            'friday': False,
            'saturday': False,
            'sunday': False
        }
    )
    roles_template: List[Dict] = []  # [{role_title, required_skills, hourly_rate}]
    created_date: datetime = Field(default_factory=datetime.utcnow)

class Shift(BaseModel):
    """Work shift"""
    model_config = ConfigDict(extra="ignore")
    
    shift_id: str = Field(default_factory=lambda: f"sh_{uuid.uuid4().hex[:12]}")
    workplace_id: str
    shift_date: date
    start_time: time
    end_time: time
    shift_type: str = 'regular'  # regular, overtime
    parent_shift_id: Optional[str] = None  # For overtime shifts
    max_duration_hours: int = 8
    break_rules: Dict = Field(
        default_factory=lambda: {
            'mid_shift_break_minutes': 30,
            'break_every_hours': 2,
            'break_duration_minutes': 10
        }
    )
    status: str = 'open'  # open, filled, completed
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class Role(BaseModel):
    """Role within a shift"""
    model_config = ConfigDict(extra="ignore")
    
    role_id: str = Field(default_factory=lambda: f"role_{uuid.uuid4().hex[:12]}")
    shift_id: str
    role_title: str
    required_skills: List[str] = []
    required_certifications: List[str] = []  # credential_type_ids
    hourly_rate: float
    overtime_rate: Optional[float] = None  # 1.5x regular rate
    estimated_regular_hours: Optional[float] = None
    estimated_overtime_hours: Optional[float] = None
    tasks: List[str] = []  # task_ids
    status: str = 'open'  # open, filled, completed
    created_date: datetime = Field(default_factory=datetime.utcnow)

class Booking(BaseModel):
    """Worker booking for a role"""
    model_config = ConfigDict(extra="ignore")
    
    booking_id: str = Field(default_factory=lambda: f"bk_{uuid.uuid4().hex[:12]}")
    role_id: str
    workforce_id: str
    occupation_id: str  # Which occupation profile was matched
    status: str = 'pending'  # pending, accepted, declined, completed
    accepted_date: Optional[datetime] = None
    auto_scheduled: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
