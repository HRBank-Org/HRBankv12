from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
import uuid

class QRCode(BaseModel):
    """QR code for shift attendance"""
    model_config = ConfigDict(extra="ignore")
    
    qr_code_id: str = Field(default_factory=lambda: f"qr_{uuid.uuid4().hex[:12]}")
    shift_id: str
    workplace_id: str
    security_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    valid_from: datetime
    valid_until: datetime
    scan_count: int = 0
    created_date: datetime = Field(default_factory=datetime.utcnow)

class Attendance(BaseModel):
    """Attendance record for clock-in/out"""
    model_config = ConfigDict(extra="ignore")
    
    attendance_id: str = Field(default_factory=lambda: f"att_{uuid.uuid4().hex[:12]}")
    booking_id: str
    shift_id: str
    workforce_id: str
    
    # Attendance method
    attendance_method: str = 'qr_code'  # qr_code, geofence_auto, manual_override
    
    # Clock times
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None
    
    # QR code verification
    qr_code_scanned: bool = False
    qr_code_id: Optional[str] = None
    
    # Geofence verification
    geofence_verified: bool = False
    worker_location_at_clock_in: Optional[Dict] = None  # {lat, long, accuracy}
    worker_location_at_clock_out: Optional[Dict] = None
    
    # Manual override
    manual_override: bool = False
    manual_override_by: Optional[str] = None
    manual_override_reason: Optional[str] = None
    
    # Hours calculation
    duration_hours: Optional[float] = None
    regular_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    
    # Break tracking
    break_times: List[Dict] = []  # [{break_start, break_end, duration_minutes}]
    
    # Status
    status: str = 'pending'  # pending, clocked_in, clocked_out, approved
    
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class Timesheet(BaseModel):
    """Weekly timesheet for payroll"""
    model_config = ConfigDict(extra="ignore")
    
    timesheet_id: str = Field(default_factory=lambda: f"ts_{uuid.uuid4().hex[:12]}")
    booking_id: str
    workforce_id: str
    employer_id: str
    shift_id: str
    week_ending_date: str  # ISO date
    
    # Hours
    regular_hours: float = 0.0
    overtime_hours: float = 0.0
    total_hours: float = 0.0
    
    # Pay
    regular_rate: float
    overtime_rate: float
    regular_pay: float
    overtime_pay: float
    gross_pay: float
    
    # Deductions
    platform_fee: float  # 5% of gross
    deductions: List[Dict] = []  # [{type, amount}]
    net_pay: float
    
    # Status
    status: str = 'draft'  # draft, submitted, approved, paid
    
    # Approval
    approved_by: Optional[str] = None
    approved_date: Optional[datetime] = None
    
    # Ratings
    employer_rated: bool = False
    workforce_rated: bool = False
    
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
