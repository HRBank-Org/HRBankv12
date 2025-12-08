"""
Time-Off Request Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class TimeOffType(str, Enum):
    VACATION = "vacation"
    SICK = "sick"
    PERSONAL = "personal"
    UNPAID = "unpaid"
    EMERGENCY = "emergency"
    BEREAVEMENT = "bereavement"
    OTHER = "other"


class TimeOffStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class TimeOffRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: f"timeoff_{datetime.utcnow().timestamp()}")
    worker_id: str
    employer_id: str
    
    # Request details
    type: TimeOffType
    start_date: date
    end_date: date
    reason: Optional[str] = None
    notes: Optional[str] = None
    
    # Status
    status: TimeOffStatus = TimeOffStatus.PENDING
    
    # Approval details
    reviewed_by: Optional[str] = None  # employer user_id
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Impact
    affected_shifts: List[str] = []  # List of shift_ids that will be affected
    total_days: int = 1
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TimeOffResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    message: str


class AttendanceStatus(str, Enum):
    SCHEDULED = "scheduled"  # Shift scheduled, not yet time
    CLOCKED_IN = "clocked_in"  # Worker clocked in
    CLOCKED_OUT = "clocked_out"  # Worker clocked out
    LATE = "late"  # Clocked in late
    MISSED = "missed"  # Didn't show up (15+ min past start)
    ON_TIME_OFF = "on_time_off"  # Approved time off


class LiveAttendanceRecord(BaseModel):
    """Live attendance status for a shift"""
    shift_id: str
    worker_id: str
    worker_name: str
    worker_photo: Optional[str] = None
    
    # Shift details
    position: str
    workplace_name: str
    scheduled_start: datetime
    scheduled_end: datetime
    
    # Attendance status
    status: AttendanceStatus
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None
    minutes_late: int = 0
    
    # Location
    is_within_geofence: Optional[bool] = None
    last_location_check: Optional[datetime] = None
    
    # Time off
    time_off_request_id: Optional[str] = None
