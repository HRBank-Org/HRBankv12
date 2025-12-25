from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, time
import uuid

class UnavailableBlock(BaseModel):
    """Worker's unavailable time blocks (college, personal time, sleep)"""
    block_id: str = Field(default_factory=lambda: f"block_{uuid.uuid4().hex[:12]}")
    worker_id: str
    type: str  # college, personal, sleep, other
    title: str
    start_time: str  # ISO format datetime
    end_time: str  # ISO format datetime
    recurring: bool = False
    recurring_pattern: Optional[str] = None  # daily, weekly, weekdays, weekends
    recurring_days: Optional[List[str]] = None  # ["monday", "tuesday", ...]
    created_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AvailableSlot(BaseModel):
    """Calculated available time slot for worker"""
    start_time: str
    end_time: str
    duration_hours: float

class ShiftRequest(BaseModel):
    """Employer's shift request (like Uber ride request)"""
    shift_request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    employer_id: str
    workplace_id: str
    
    # Shift details
    title: str
    description: Optional[str] = None
    start_time: str  # ISO format datetime
    end_time: str  # ISO format datetime
    duration_hours: float
    
    # Requirements
    skills_required: List[str] = []
    min_rating: Optional[float] = None
    max_distance_km: Optional[float] = 10  # Geographic radius
    positions_needed: int = 1
    
    # Compensation
    hourly_rate: float
    
    # Status
    status: str = 'open'  # open, filled, cancelled, expired
    matched_workers: List[str] = []  # List of worker_ids who match
    selected_worker_id: Optional[str] = None
    
    # Metadata
    created_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None

class WorkerMatch(BaseModel):
    """Matched worker for a shift request"""
    worker_id: str
    full_name: str
    profile_photo: Optional[str] = None
    rating: float
    total_shifts: int
    distance_km: float
    skills: List[str]
    available: bool
    conflict_reason: Optional[str] = None
    match_score: float  # 0-100, based on rating, proximity, experience

class ScheduleConflict(BaseModel):
    """Detected schedule conflict"""
    conflict_type: str  # locked_shift, unavailable_block
    conflicting_event_id: str
    conflicting_event_title: str
    conflict_start: str
    conflict_end: str
    overlap_duration_hours: float
