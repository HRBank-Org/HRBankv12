"""
Clean Calendar-Based Scheduling Models
Simple, intuitive scheduling system
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class WorkerAssignment(BaseModel):
    """A worker assigned to a scheduled shift"""
    worker_id: str
    worker_name: str
    worker_photo: Optional[str] = None
    position: str
    status: str = "confirmed"  # confirmed, pending, declined
    assigned_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ScheduledShift(BaseModel):
    """A shift on the calendar"""
    shift_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employer_id: str
    
    # Location
    workplace_id: str
    workplace_name: str
    
    # Timing
    start_time: str  # ISO datetime
    end_time: str
    duration_hours: float
    
    # Position
    position_title: str
    positions_needed: int
    
    # Workers
    assigned_workers: List[WorkerAssignment] = []
    
    # Requirements
    required_skills: List[str] = []
    required_certifications: List[str] = []
    
    # Details
    notes: Optional[str] = None
    hourly_rate: Optional[float] = None
    
    # Recurring
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None  # daily, weekly, monthly
    recurrence_end_date: Optional[str] = None
    parent_shift_id: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: str
    
    # Display
    color: Optional[str] = None  # For calendar display

class WorkerAvailability(BaseModel):
    """Worker availability for calendar display"""
    worker_id: str
    worker_name: str
    worker_photo: Optional[str] = None
    
    # Qualifications
    positions: List[str] = []
    skills: List[str] = []
    certifications: List[str] = []
    
    # Availability
    is_available: bool = True
    current_shifts_count: int = 0
    
    # Match info
    match_score: Optional[float] = None
    distance_km: Optional[float] = None
