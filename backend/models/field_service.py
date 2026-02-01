"""
Field Service Route Models
Supports: Delivery, Security Patrol, Cleaning, Home Healthcare, Field Sales, Maintenance
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class RouteType(str, Enum):
    DELIVERY = "delivery"
    SECURITY_PATROL = "security_patrol"
    CLEANING = "cleaning"
    HEALTHCARE = "healthcare"
    FIELD_SALES = "field_sales"
    MAINTENANCE = "maintenance"
    CUSTOM = "custom"


class RouteStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class StopStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    ARRIVED = "arrived"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class TaskType(str, Enum):
    CHECKLIST = "checklist"
    PHOTO = "photo"
    SIGNATURE = "signature"
    BARCODE_SCAN = "barcode_scan"
    FORM = "form"
    NOTES = "notes"
    QUANTITY = "quantity"


class GeoLocation(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None
    name: Optional[str] = None  # e.g., "Customer: John Smith" or "Checkpoint Alpha"


class GPSBreadcrumb(BaseModel):
    lat: float
    lng: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now())
    accuracy_meters: Optional[float] = None
    speed_kmh: Optional[float] = None


class RouteTask(BaseModel):
    """Task that can be assigned at any point in route (beginning, stop, ending)"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.CHECKLIST
    required: bool = True
    sequence_order: int = 0
    
    # Completion tracking
    completed: bool = False
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None  # worker_id
    
    # Proof/data collected
    proof: Optional[Dict[str, Any]] = None  # {type: "photo", url: "..."} or {type: "signature", data: "base64..."}
    form_data: Optional[Dict[str, Any]] = None  # For form-type tasks
    notes: Optional[str] = None


class StopVerification(BaseModel):
    """Proof that worker actually visited the stop"""
    gps_confirmed: bool = False
    gps_location: Optional[GeoLocation] = None
    arrival_distance_meters: Optional[float] = None  # Distance from stop when marked arrived
    photo_proof: List[str] = []  # URLs to photos
    signature: Optional[str] = None  # URL or base64
    customer_name: Optional[str] = None  # Who signed
    notes: Optional[str] = None
    verified_at: Optional[datetime] = None


class RouteStop(BaseModel):
    """A stop along the route"""
    stop_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sequence_order: int
    
    # Location
    location: GeoLocation
    geofence_radius_meters: int = 100  # How close worker must be to auto-detect arrival
    
    # Timing
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    estimated_departure: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    estimated_duration_minutes: int = 15  # Expected time at stop
    
    # Stop details
    stop_name: Optional[str] = None
    stop_type: Optional[str] = None  # "delivery", "pickup", "checkpoint", "service_call"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_notes: Optional[str] = None
    
    # Tasks at this stop
    tasks: List[RouteTask] = []
    
    # Verification
    verification: StopVerification = Field(default_factory=StopVerification)
    
    # Status
    status: StopStatus = StopStatus.PENDING
    skip_reason: Optional[str] = None
    
    # Metadata for specific use cases
    metadata: Dict[str, Any] = {}  # e.g., {"package_count": 3, "package_ids": ["PKG001"]}


class FieldServiceRoute(BaseModel):
    """Main route model for field service operations"""
    route_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Assignment
    employer_id: str
    workplace_id: Optional[str] = None
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    
    # Route metadata
    route_name: str
    route_type: RouteType = RouteType.CUSTOM
    route_description: Optional[str] = None
    
    # Scheduling
    scheduled_date: str  # YYYY-MM-DD
    scheduled_start_time: datetime
    scheduled_end_time: Optional[datetime] = None
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    
    # Duration and distance
    estimated_duration_minutes: Optional[int] = None
    actual_duration_minutes: Optional[int] = None
    estimated_distance_km: Optional[float] = None
    actual_distance_km: Optional[float] = None
    
    # Nested task structure
    beginning_tasks: List[RouteTask] = []  # Tasks before leaving (load vehicle, check equipment)
    stops: List[RouteStop] = []  # Main route stops
    ending_tasks: List[RouteTask] = []  # Tasks after returning (return vehicle, submit report)
    
    # GPS tracking
    gps_breadcrumbs: List[GPSBreadcrumb] = []
    last_known_location: Optional[GeoLocation] = None
    tracking_enabled: bool = True
    
    # Progress
    current_stop_index: int = 0
    status: RouteStatus = RouteStatus.SCHEDULED
    completion_percentage: float = 0.0
    
    # Notes and issues
    route_notes: Optional[str] = None
    issues_reported: List[Dict[str, Any]] = []  # [{type: "delay", description: "...", timestamp: ...}]
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())
    
    def calculate_completion(self) -> float:
        """Calculate overall route completion percentage"""
        total_items = len(self.beginning_tasks) + len(self.stops) + len(self.ending_tasks)
        if total_items == 0:
            return 0.0
        
        completed = 0
        completed += len([t for t in self.beginning_tasks if t.completed])
        completed += len([s for s in self.stops if s.status == StopStatus.COMPLETED])
        completed += len([t for t in self.ending_tasks if t.completed])
        
        return (completed / total_items) * 100


class RouteTemplate(BaseModel):
    """Reusable route template"""
    template_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employer_id: str
    
    template_name: str
    route_type: RouteType
    description: Optional[str] = None
    
    # Default tasks
    default_beginning_tasks: List[RouteTask] = []
    default_ending_tasks: List[RouteTask] = []
    
    # Default stop template
    default_stop_tasks: List[RouteTask] = []
    default_stop_duration_minutes: int = 15
    
    # Settings
    geofence_radius_meters: int = 100
    tracking_enabled: bool = True
    require_photo_proof: bool = False
    require_signature: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    is_active: bool = True


# ============== Request/Response Models ==============

class CreateRouteRequest(BaseModel):
    route_name: str
    route_type: RouteType = RouteType.CUSTOM
    route_description: Optional[str] = None
    workplace_id: Optional[str] = None
    worker_id: Optional[str] = None
    
    scheduled_date: str  # YYYY-MM-DD
    scheduled_start_time: str  # ISO datetime
    scheduled_end_time: Optional[str] = None
    
    beginning_tasks: List[Dict[str, Any]] = []
    stops: List[Dict[str, Any]] = []
    ending_tasks: List[Dict[str, Any]] = []
    
    tracking_enabled: bool = True


class AddStopRequest(BaseModel):
    location: Dict[str, Any]  # {lat, lng, address, name}
    stop_name: Optional[str] = None
    stop_type: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_notes: Optional[str] = None
    tasks: List[Dict[str, Any]] = []
    estimated_duration_minutes: int = 15
    sequence_order: Optional[int] = None  # If not provided, append to end
    metadata: Dict[str, Any] = {}


class UpdateStopStatusRequest(BaseModel):
    status: StopStatus
    skip_reason: Optional[str] = None
    verification: Optional[Dict[str, Any]] = None


class CompleteTaskRequest(BaseModel):
    proof: Optional[Dict[str, Any]] = None
    form_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class GPSUpdateRequest(BaseModel):
    lat: float
    lng: float
    accuracy_meters: Optional[float] = None
    speed_kmh: Optional[float] = None


class RouteOptimizeRequest(BaseModel):
    """Request to optimize stop order"""
    start_location: Optional[Dict[str, Any]] = None  # If not provided, use first stop
    end_location: Optional[Dict[str, Any]] = None  # If not provided, return to start
    optimize_for: str = "distance"  # "distance" or "time"
