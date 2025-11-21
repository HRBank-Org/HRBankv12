"""
Enhanced Shift Management Models
Connecteam-style shift scheduling with worker assignments
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import uuid

class AssignedWorker(BaseModel):
    """Worker assigned to a shift"""
    workforce_id: str
    full_name: str
    profile_photo_url: Optional[str] = None
    position_title: str
    status: str = "confirmed"  # confirmed, pending, declined, no_show
    assigned_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    assigned_by: str  # employer_id who assigned
    notes: Optional[str] = None

class ShiftTemplate(BaseModel):
    """Reusable shift template for quick scheduling"""
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    employer_id: str
    template_name: str
    workplace_id: str
    workplace_name: str
    
    # Shift details
    position_title: str
    shift_duration_hours: float
    positions_needed: int
    description: Optional[str] = None
    
    # Default times (time only, no date)
    default_start_time: str  # e.g., "09:00"
    default_end_time: str    # e.g., "17:00"
    
    # Requirements
    required_skills: List[str] = []
    required_certifications: List[str] = []
    
    # Recurring pattern
    recurring_pattern: Optional[str] = None  # daily, weekly, biweekly, monthly
    recurring_days: List[str] = []  # ["monday", "friday"]
    
    # Metadata
    created_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_used_date: Optional[str] = None
    use_count: int = 0

class EnhancedShift(BaseModel):
    """Enhanced shift model with worker assignments"""
    shift_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employer_id: str
    workplace_id: str
    workplace_name: str
    
    # Shift details
    shift_name: str
    position_title: str
    start_time: str  # ISO format datetime
    end_time: str    # ISO format datetime
    shift_duration_hours: float
    
    # Staffing
    positions_needed: int
    positions_filled: int = 0
    assigned_workers: List[AssignedWorker] = []
    open_positions: int  # Auto-calculated: positions_needed - confirmed workers
    
    # Requirements
    required_skills: List[str] = []
    required_certifications: List[str] = []
    
    # Matching strategy
    match_status: str = "auto"  # "auto" (use algorithm) or "manual" (employer picks)
    auto_match_enabled: bool = True
    
    # Additional details
    description: Optional[str] = None
    notes: Optional[str] = None
    hourly_rate: Optional[float] = None
    
    # Status
    status: str = "open"  # open, partially_filled, fully_staffed, in_progress, completed, cancelled
    
    # Recurring
    recurring: bool = False
    recurring_pattern: Optional[str] = None  # daily, weekly, biweekly, monthly
    parent_shift_id: Optional[str] = None  # If created from recurring pattern
    
    # Template
    is_template: bool = False
    template_id: Optional[str] = None  # If created from template
    template_name: Optional[str] = None
    
    # Metadata
    created_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: str  # employer_id
    
    # Color coding for UI
    color_code: Optional[str] = None  # hex color for calendar display

class AvailableWorkforce(BaseModel):
    """Available workforce member for shift assignment"""
    workforce_id: str
    full_name: str
    profile_photo_url: Optional[str] = None
    
    # Matching info
    match_score: Optional[float] = None
    distance_km: Optional[float] = None
    
    # Qualifications
    occupation_titles: List[str] = []
    skills: List[str] = []
    certifications: List[str] = []
    
    # Performance
    rating_avg: Optional[float] = None
    total_shifts_completed: int = 0
    total_hours_worked: float = 0
    
    # Availability
    is_available: bool = True
    conflict_reason: Optional[str] = None
    current_employment_status: str = "available"  # available, employed
    
    # Match breakdown
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    matched_certifications: List[str] = []
    missing_certifications: List[str] = []

class ShiftCloneRequest(BaseModel):
    """Request to clone a shift"""
    source_shift_id: str
    new_start_time: str
    new_end_time: str
    copy_assigned_workers: bool = False
    workplace_id: Optional[str] = None  # If changing workplace

class BulkShiftCreate(BaseModel):
    """Create multiple shifts at once"""
    template_id: Optional[str] = None
    workplace_id: str
    position_title: str
    shift_duration_hours: float
    positions_needed: int
    
    # Date range for bulk creation
    date_range_start: str
    date_range_end: str
    
    # Time
    start_time: str  # e.g., "09:00"
    end_time: str
    
    # Recurring pattern
    recurring_days: List[str]  # ["monday", "wednesday", "friday"]
    
    # Details
    description: Optional[str] = None
    required_skills: List[str] = []
    required_certifications: List[str] = []
    hourly_rate: Optional[float] = None
