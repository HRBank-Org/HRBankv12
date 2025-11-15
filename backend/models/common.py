from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
import uuid

class Task(BaseModel):
    """Task within a shift/role"""
    model_config = ConfigDict(extra="ignore")
    
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    role_id: str
    task_title: str
    description: Optional[str] = None
    priority: str = 'medium'  # high, medium, low
    estimated_duration_minutes: Optional[int] = None
    assigned_to_workforce_id: Optional[str] = None
    status: str = 'pending'  # pending, in_progress, completed
    subtasks: List[Dict] = []  # [{title, completed: boolean}]
    completion_notes: Optional[str] = None
    completion_photos: List[Dict] = []  # [{url, uploaded_at}]
    created_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    actual_duration_minutes: Optional[int] = None

class Attendance(BaseModel):
    """Attendance record for clock-in/out"""
    model_config = ConfigDict(extra="ignore")
    
    attendance_id: str = Field(default_factory=lambda: f"att_{uuid.uuid4().hex[:12]}")
    booking_id: str
    attendance_method: str = 'geofence_auto'  # geofence_auto, qr_code, manual_override
    
    # Automatic geofence flow
    geofence_entry_detected_at: Optional[datetime] = None
    worker_clock_in_requested_at: Optional[datetime] = None
    employer_notified_at: Optional[datetime] = None
    employer_reminder_1_at: Optional[datetime] = None
    employer_reminder_2_at: Optional[datetime] = None
    employer_confirmed_at: Optional[datetime] = None
    employer_confirmed_by: Optional[str] = None
    
    # QR code backup
    qr_code_scanned_at: Optional[datetime] = None
    qr_code_id: Optional[str] = None
    
    # Shared fields
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None
    clock_out_trigger: Optional[str] = None  # geofence_exit, shift_end, manual, qr_code
    geofence_exit_detected_at: Optional[datetime] = None
    
    # Location verification
    worker_location_at_clock_in: Optional[Dict] = None  # {lat, long, accuracy_meters}
    worker_location_at_clock_out: Optional[Dict] = None
    geofence_verified: bool = False
    geofence_checks: List[Dict] = []  # [{timestamp, lat, long, distance_m, inside_geofence}]
    
    # Manual override
    manual_override: bool = False
    manual_override_by: Optional[str] = None
    manual_override_reason: Optional[str] = None
    
    # Break tracking
    break_times: List[Dict] = []  # [{break_start, break_end, duration_minutes}]
    
    # Hours calculation
    duration_hours: Optional[float] = None
    regular_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    overtime_triggered: bool = False
    
    # Disputes
    disputed: bool = False
    dispute_reason: Optional[str] = None
    dispute_notes: Optional[str] = None
    dispute_status: Optional[str] = None
    
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class Timesheet(BaseModel):
    """Weekly timesheet"""
    model_config = ConfigDict(extra="ignore")
    
    timesheet_id: str = Field(default_factory=lambda: f"ts_{uuid.uuid4().hex[:12]}")
    booking_id: str
    workforce_id: str
    employer_id: str
    week_ending_date: str  # ISO date string
    regular_hours: float = 0.0
    overtime_hours: float = 0.0
    regular_rate: float
    overtime_rate: float
    regular_pay: float
    overtime_pay: float
    gross_pay: float
    deductions: List[Dict] = []  # [{type, amount, percentage}]
    net_pay: float
    status: str = 'draft'  # draft, submitted, approved
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class Rating(BaseModel):
    """Rating between users"""
    model_config = ConfigDict(extra="ignore")
    
    rating_id: str = Field(default_factory=lambda: f"rt_{uuid.uuid4().hex[:12]}")
    from_user_id: str
    to_user_id: str
    from_user_type: str  # workforce, employer
    booking_id: str
    rating_overall: float  # 1-5, calculated from categories
    category_scores: Dict  # {work_quality: 4.5, timeliness: 5.0, etc.}
    comment: Optional[str] = None
    private_notes: Optional[str] = None  # Employer only
    anonymous: bool = False  # Worker only
    status: str = 'active'  # active, hidden, deleted
    reported: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: Optional[datetime] = None
