"""
Time-Off Request Models with Balance Tracking
==============================================
Enhanced models for comprehensive time-off management including:
- Multiple leave types with different policies
- Balance tracking and accrual
- Calendar integration
- Approval workflows
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, date, timezone, timedelta
from enum import Enum
import uuid


class TimeOffType(str, Enum):
    """Types of time off requests"""
    VACATION = "vacation"           # Paid vacation
    SICK = "sick"                   # Sick leave
    PERSONAL = "personal"           # Personal day
    UNPAID = "unpaid"               # Unpaid leave
    EMERGENCY = "emergency"         # Emergency leave
    BEREAVEMENT = "bereavement"     # Bereavement leave
    PARENTAL = "parental"           # Parental leave
    JURY_DUTY = "jury_duty"         # Jury duty
    MEDICAL = "medical"             # Medical appointments
    MENTAL_HEALTH = "mental_health" # Mental health day
    OTHER = "other"


class TimeOffStatus(str, Enum):
    """Status of time off requests"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"             # Request expired without action


class AccrualPeriod(str, Enum):
    """How time off is accrued"""
    ANNUAL = "annual"               # All at once per year
    MONTHLY = "monthly"             # Accrued monthly
    BIWEEKLY = "biweekly"           # Accrued every two weeks
    PER_HOURS_WORKED = "per_hours"  # Based on hours worked


class TimeOffPolicy(BaseModel):
    """Time-off policy configuration for an employer"""
    model_config = ConfigDict(extra="ignore")
    
    policy_id: str = Field(default_factory=lambda: f"policy_{uuid.uuid4().hex[:12]}")
    employer_id: str
    policy_name: str = "Standard Policy"
    
    # Leave entitlements (days per year)
    vacation_days_per_year: float = 10.0  # Ontario minimum: 2 weeks after 1 year
    sick_days_per_year: float = 3.0       # Ontario: 3 unpaid job-protected days
    personal_days_per_year: float = 2.0
    
    # Accrual settings
    accrual_period: AccrualPeriod = AccrualPeriod.ANNUAL
    accrual_start_date: Optional[str] = None  # When accrual year starts (e.g., "01-01" or hire date)
    
    # Carry-over rules
    allow_carryover: bool = True
    max_carryover_days: float = 5.0       # Max days that can carry to next year
    carryover_expiry_months: int = 3      # How long carried days are valid
    
    # Request rules
    min_advance_notice_days: int = 7      # Minimum days before request start
    max_consecutive_days: int = 15        # Maximum consecutive days off
    min_request_increment: float = 0.5    # Minimum request (half day)
    
    # Blackout dates (periods when time off is restricted)
    blackout_periods: List[Dict] = []     # [{"start": "12-20", "end": "01-05", "name": "Holiday Season"}]
    
    # Probation period
    probation_period_days: int = 90       # Days before eligible for paid leave
    
    # Approval requirements
    auto_approve_sick_days: bool = False
    require_doctor_note_after_days: int = 3
    
    # Active status
    is_default: bool = True
    active: bool = True
    
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: Optional[datetime] = None


class TimeOffBalance(BaseModel):
    """Worker's time-off balance for an employer"""
    model_config = ConfigDict(extra="ignore")
    
    balance_id: str = Field(default_factory=lambda: f"balance_{uuid.uuid4().hex[:12]}")
    worker_id: str
    employer_id: str
    policy_id: Optional[str] = None
    
    # Current year balances
    year: int = Field(default_factory=lambda: datetime.now(timezone.utc).year)
    
    # Vacation
    vacation_entitled: float = 10.0       # Total entitled for the year
    vacation_used: float = 0.0            # Used so far
    vacation_pending: float = 0.0         # Pending requests
    vacation_available: float = 10.0      # Available to use
    vacation_carried_over: float = 0.0    # From previous year
    
    # Sick leave
    sick_entitled: float = 3.0
    sick_used: float = 0.0
    sick_pending: float = 0.0
    sick_available: float = 3.0
    
    # Personal days
    personal_entitled: float = 2.0
    personal_used: float = 0.0
    personal_pending: float = 0.0
    personal_available: float = 2.0
    
    # Unpaid leave tracking
    unpaid_days_taken: float = 0.0
    
    # Employment info
    hire_date: Optional[str] = None
    is_probation: bool = False
    probation_end_date: Optional[str] = None
    
    # Metadata
    last_accrual_date: Optional[str] = None
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def get_balance(self, leave_type: TimeOffType) -> dict:
        """Get balance for a specific leave type"""
        if leave_type == TimeOffType.VACATION:
            return {
                "entitled": self.vacation_entitled,
                "used": self.vacation_used,
                "pending": self.vacation_pending,
                "available": self.vacation_available,
                "carried_over": self.vacation_carried_over
            }
        elif leave_type == TimeOffType.SICK:
            return {
                "entitled": self.sick_entitled,
                "used": self.sick_used,
                "pending": self.sick_pending,
                "available": self.sick_available
            }
        elif leave_type == TimeOffType.PERSONAL:
            return {
                "entitled": self.personal_entitled,
                "used": self.personal_used,
                "pending": self.personal_pending,
                "available": self.personal_available
            }
        else:
            return {"entitled": 0, "used": 0, "pending": 0, "available": 0}


class TimeOffRequest(BaseModel):
    """Enhanced time-off request with balance tracking"""
    model_config = ConfigDict(extra="ignore")
    
    request_id: str = Field(default_factory=lambda: f"timeoff_{uuid.uuid4().hex[:12]}")
    worker_id: str
    employer_id: str
    workplace_id: Optional[str] = None
    
    # Request details
    type: TimeOffType
    start_date: str  # ISO format YYYY-MM-DD for MongoDB compatibility
    end_date: str
    
    # Time details (for partial days)
    is_full_day: bool = True
    start_time: Optional[str] = None      # For partial days: "09:00"
    end_time: Optional[str] = None        # For partial days: "13:00"
    
    # Days calculation
    total_days: float = 1.0               # Supports half days
    business_days_only: bool = True       # Exclude weekends
    
    # Request info
    reason: Optional[str] = None
    notes: Optional[str] = None
    
    # Documentation
    doctor_note_required: bool = False
    doctor_note_uploaded: bool = False
    documentation_url: Optional[str] = None
    
    # Status
    status: TimeOffStatus = TimeOffStatus.PENDING
    
    # Approval workflow
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    approval_notes: Optional[str] = None
    
    # Impact tracking
    affected_shifts: List[str] = []
    requires_coverage: bool = False
    coverage_found: bool = False
    coverage_worker_id: Optional[str] = None
    
    # Balance snapshot at time of request
    balance_at_request: Optional[Dict] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TimeOffCalendarEntry(BaseModel):
    """Calendar view entry for time off"""
    model_config = ConfigDict(extra="ignore")
    
    entry_id: str
    request_id: str
    worker_id: str
    worker_name: str
    worker_photo: Optional[str] = None
    
    date: str  # YYYY-MM-DD
    type: TimeOffType
    status: TimeOffStatus
    
    is_full_day: bool = True
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    
    # For employer calendar view
    employer_id: str
    workplace_id: Optional[str] = None
    workplace_name: Optional[str] = None


class AttendanceStatus(str, Enum):
    """Status of worker attendance"""
    SCHEDULED = "scheduled"
    CLOCKED_IN = "clocked_in"
    CLOCKED_OUT = "clocked_out"
    LATE = "late"
    MISSED = "missed"
    ON_TIME_OFF = "on_time_off"
    ABSENT = "absent"


class LiveAttendanceRecord(BaseModel):
    """Live attendance status for a shift"""
    model_config = ConfigDict(extra="ignore")
    
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


class TimeOffSummary(BaseModel):
    """Summary statistics for time-off dashboard"""
    model_config = ConfigDict(extra="ignore")
    
    # Current period stats
    pending_requests: int = 0
    approved_this_month: int = 0
    rejected_this_month: int = 0
    
    # Upcoming time off
    upcoming_time_off: List[Dict] = []
    
    # Team availability (for employers)
    workers_off_today: int = 0
    workers_off_this_week: int = 0
    
    # Balance summary (for workforce)
    total_vacation_remaining: float = 0
    total_sick_remaining: float = 0
    total_personal_remaining: float = 0
