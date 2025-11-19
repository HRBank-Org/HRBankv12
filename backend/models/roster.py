from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
import uuid

class Role(BaseModel):
    """Job position/role within a roster"""
    role_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role_name: str  # e.g., "Server", "Cashier", "Manager"
    description: Optional[str] = None
    positions_needed: int = 1  # How many people needed for this role
    positions_filled: int = 0  # How many currently assigned
    hourly_rate: Optional[float] = None
    requirements: Optional[List[str]] = []  # Skills, certifications required
    status: str = "open"  # open, filled, closed
    created_date: datetime = Field(default_factory=datetime.utcnow)

class Shift(BaseModel):
    """Individual shift within a role"""
    shift_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role_id: str  # Parent role
    shift_date: date
    start_time: str  # 24-hour format: "09:00", "14:30", "22:00"
    end_time: str  # 24-hour format
    workforce_id: Optional[str] = None  # Assigned workforce member
    workforce_name: Optional[str] = None
    workforce_photo: Optional[str] = None
    status: str = "open"  # open, assigned, confirmed, completed
    notes: Optional[str] = None
    color: Optional[str] = "#3B82F6"  # Color for calendar display
    created_date: datetime = Field(default_factory=datetime.utcnow)

class Roster(BaseModel):
    """Weekly roster for a workplace"""
    roster_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employer_id: str
    workplace_id: str
    workplace_name: str
    week_start_date: date  # Monday of the week
    week_end_date: date  # Sunday of the week
    title: str  # e.g., "Week of Jan 15 @ Downtown Office"
    status: str = "draft"  # draft, published, completed, archived
    roles: List[Role] = []  # List of roles/positions for this week
    shifts: List[Shift] = []  # All shifts across all roles
    total_positions: int = 0
    total_filled: int = 0
    notes: Optional[str] = None
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class CreateRosterRequest(BaseModel):
    workplace_id: str
    week_start_date: date
    notes: Optional[str] = None

class CreateRoleRequest(BaseModel):
    roster_id: str
    role_name: str
    description: Optional[str] = None
    positions_needed: int = 1
    hourly_rate: Optional[float] = None
    requirements: Optional[List[str]] = []

class CreateShiftRequest(BaseModel):
    roster_id: str
    role_id: str
    shift_date: date
    start_time: str  # "09:00"
    end_time: str  # "17:00"
    recurring: Optional[bool] = False
    recurring_days: Optional[List[int]] = []  # [0,1,2,3,4] for Mon-Fri
    recurring_end_date: Optional[date] = None
    color: Optional[str] = "#3B82F6"

class AssignWorkforceRequest(BaseModel):
    shift_id: str
    workforce_id: str

class BulkAssignRequest(BaseModel):
    """Assign workforce to multiple shifts at once"""
    shift_ids: List[str]
    workforce_id: str
