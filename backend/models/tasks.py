"""
Task/ServiceVisit Model for Field Service Work Mode

Tasks represent individual service visits at client locations within a work block.
Used for cleaning routes, PSW home care, field service, etc.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
from enum import Enum
import uuid


class TaskStatus(str, Enum):
    """Task status states"""
    PENDING = "pending"           # Created but not started
    ASSIGNED = "assigned"         # Assigned to a worker
    EN_ROUTE = "en_route"         # Worker is traveling to location
    IN_PROGRESS = "in_progress"   # Worker has checked in
    COMPLETED = "completed"       # Worker has checked out, task done
    CANCELLED = "cancelled"       # Task was cancelled
    NO_SHOW = "no_show"          # Worker didn't show up


class TaskType(str, Enum):
    """Type of service task"""
    CLEANING = "cleaning"
    HOME_CARE = "home_care"
    FIELD_SERVICE = "field_service"
    DELIVERY = "delivery"
    INSPECTION = "inspection"
    MAINTENANCE = "maintenance"
    OTHER = "other"


class TaskAddress(BaseModel):
    """Client/service location address"""
    street_address: str
    unit_number: Optional[str] = None
    city: str
    province: str
    postal_code: str
    fsa: Optional[str] = None  # Forward Sortation Area (first 3 chars of postal code)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Client info
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    access_notes: Optional[str] = None  # "Ring buzzer 202", "Key under mat", etc.


class TaskCheckIn(BaseModel):
    """GPS check-in record for task"""
    timestamp: datetime
    latitude: float
    longitude: float
    accuracy_m: Optional[float] = None
    distance_from_task_m: Optional[float] = None
    verified: bool = False
    verification_method: str = "gps"  # gps, manual, qr_code


class Task(BaseModel):
    """
    Service Task / Visit
    
    Represents a single service visit at a client location.
    Multiple tasks can be assigned to a single work block (shift).
    """
    model_config = ConfigDict(extra="ignore")
    
    # Identifiers
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    
    # Relationships
    employer_id: str                      # Owner employer
    workplace_id: str                     # Field service workplace
    work_block_id: Optional[str] = None   # Associated shift/work block (for payroll)
    worker_id: Optional[str] = None       # Assigned worker
    
    # External reference (for CleanGrid/Neatify integration)
    external_ref: Optional[str] = None    # External booking/order ID
    external_source: Optional[str] = None # "cleangrid", "neatify", "manual"
    
    # Task details
    task_type: TaskType = TaskType.OTHER
    title: str                            # "Clean 2BR Apartment", "PSW Morning Visit"
    description: Optional[str] = None
    
    # Location
    address: TaskAddress
    
    # Scheduling
    scheduled_date: str                   # YYYY-MM-DD
    scheduled_start_time: str             # HH:MM (24h format)
    scheduled_end_time: str               # HH:MM
    estimated_duration_minutes: int = 60
    
    # Actual times
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    actual_duration_minutes: Optional[int] = None
    
    # GPS Check-in/out
    check_in: Optional[TaskCheckIn] = None
    check_out: Optional[TaskCheckIn] = None
    geofence_radius_m: int = 100  # Must be within 100m to check in
    
    # Status
    status: TaskStatus = TaskStatus.PENDING
    
    # Proof of work
    photos: List[str] = Field(default_factory=list)  # URLs to uploaded photos
    notes: Optional[str] = None
    client_signature: Optional[str] = None  # Base64 signature image
    
    # Billing
    billable: bool = True
    billing_rate_type: str = "hourly"  # hourly, flat, per_task
    billing_amount: Optional[float] = None
    
    # Priority & routing
    priority: int = 5  # 1-10, higher = more urgent
    route_order: Optional[int] = None  # Order in worker's route for the day
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def calculate_duration(self) -> Optional[int]:
        """Calculate actual duration in minutes"""
        if self.actual_start_time and self.actual_end_time:
            delta = self.actual_end_time - self.actual_start_time
            return int(delta.total_seconds() / 60)
        return None


class WorkBlock(BaseModel):
    """
    Work Block (Field Service equivalent of a Shift)
    
    A work block is the payroll container for field service workers.
    It has a start/end time but the actual work happens at multiple task locations.
    """
    model_config = ConfigDict(extra="ignore")
    
    work_block_id: str = Field(default_factory=lambda: f"wb_{uuid.uuid4().hex[:12]}")
    
    # Relationships
    employer_id: str
    workplace_id: str
    worker_id: Optional[str] = None
    
    # Schedule
    date: str  # YYYY-MM-DD
    scheduled_start_time: str  # HH:MM - When worker should start their day
    scheduled_end_time: str    # HH:MM - When worker should end their day
    
    # Actual times
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    
    # Tasks in this work block
    task_ids: List[str] = Field(default_factory=list)
    
    # Calculated totals
    total_tasks: int = 0
    completed_tasks: int = 0
    total_task_minutes: int = 0  # Sum of actual task durations
    total_travel_minutes: int = 0  # Estimated travel time between tasks
    
    # Status
    status: str = "scheduled"  # scheduled, in_progress, completed, cancelled
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateTaskRequest(BaseModel):
    """Request model for creating a task"""
    workplace_id: str
    task_type: TaskType = TaskType.OTHER
    title: str
    description: Optional[str] = None
    
    # Address
    street_address: str
    unit_number: Optional[str] = None
    city: str
    province: str
    postal_code: str
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    access_notes: Optional[str] = None
    
    # Schedule
    scheduled_date: str
    scheduled_start_time: str
    scheduled_end_time: str
    estimated_duration_minutes: int = 60
    
    # Optional
    worker_id: Optional[str] = None
    work_block_id: Optional[str] = None
    external_ref: Optional[str] = None
    external_source: Optional[str] = None
    priority: int = 5
    billing_amount: Optional[float] = None


class TaskCheckInRequest(BaseModel):
    """Request model for task check-in/out"""
    latitude: float
    longitude: float
    accuracy_m: Optional[float] = None
    notes: Optional[str] = None


class TaskRouteResponse(BaseModel):
    """Response for worker's daily task route"""
    date: str
    work_block_id: Optional[str]
    total_tasks: int
    completed_tasks: int
    tasks: List[Task]
    estimated_total_duration_minutes: int
    estimated_travel_minutes: int
