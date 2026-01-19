from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
import uuid

class WorkplaceRole(BaseModel):
    """Role created by employer for their workplace"""
    model_config = ConfigDict(extra="ignore")
    
    role_id: str = Field(default_factory=lambda: f"role_{uuid.uuid4().hex[:12]}")
    employer_id: str
    workplace_id: Optional[str] = None  # Can be None for general roles
    
    # Role Details
    role_name: str  # e.g., "Head Chef", "Night Security Guard"
    occupation_template: str  # Links to admin occupation template (e.g., "Chef")
    occupation_category: str  # e.g., "Hospitality", "Security"
    
    # Work Type - Defines how shifts are created and attendance is tracked
    # on_site: Standard GPS clock-in at workplace location (Chef, Server, Manager)
    # route_based: Multi-stop tasks with GPS at each location (Delivery Driver, Cleaner)
    # continental: 12-hour rotating shifts with GPS at workplace (Security Guard)
    work_type: str = "on_site"  # on_site, route_based, continental
    
    # Continental Shift Config (only for work_type=continental)
    continental_config: Optional[Dict] = None  # {pattern, day_shift, night_shift, rotation_groups}
    
    # Route Config (only for work_type=route_based)
    route_config: Optional[Dict] = None  # {default_duration_hours, allow_recurring_routes}
    
    # Co-op/Volunteer Program - For high school students
    coop_volunteer_eligible: bool = False  # If True, students can apply for co-op/volunteer hours
    
    # Requirements
    required_skills: List[str] = []
    required_certifications: List[str] = []  # Includes both occupation-linked and employer-added
    occupation_required_certifications: List[str] = []  # Certifications from occupation template
    
    # Generic Tasks (inherited by shifts)
    generic_tasks: List[Dict] = []  # [{task_name, estimated_minutes, is_mandatory}]
    
    # Compensation
    hourly_rate: Optional[float] = None
    
    # Status
    status: str = "unfilled"  # unfilled, filled, posted_to_match
    filled_by_workforce_id: Optional[str] = None
    filled_date: Optional[datetime] = None
    posted_as_job_id: Optional[str] = None  # If posted to match engine
    
    # Assigned Workers (workers assigned to this role get all shifts automatically)
    assigned_workers: List[str] = []  # List of worker_ids
    
    # Metadata
    description: Optional[str] = None
    positions_available: int = 1
    positions_filled: int = 0
    
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)

class WorkplaceRoleCreate(BaseModel):
    """Request model for creating a workplace role"""
    workplace_id: Optional[str] = None
    role_name: str
    occupation_template: str
    shift_type: str = "on_site"  # on_site, route_based, continental
    continental_config: Optional[Dict] = None  # For continental roles
    route_config: Optional[Dict] = None  # For route_based roles
    required_skills: List[str] = []
    additional_certifications: List[str] = []  # Employer can add extra certs
    generic_tasks: List[Dict] = []  # [{task_name, estimated_minutes, is_mandatory}]
    hourly_rate: Optional[float] = None
    description: Optional[str] = None
    positions_available: int = 1

class WorkplaceRoleUpdate(BaseModel):
    """Request model for updating a workplace role"""
    role_name: Optional[str] = None
    shift_type: Optional[str] = None
    continental_config: Optional[Dict] = None
    route_config: Optional[Dict] = None
    required_skills: Optional[List[str]] = None
    additional_certifications: Optional[List[str]] = None
    generic_tasks: Optional[List[Dict]] = None
    hourly_rate: Optional[float] = None
    description: Optional[str] = None
    positions_available: Optional[int] = None

class RoleWorkerAssignment(BaseModel):
    """Request model for assigning/unassigning workers to roles"""
    worker_ids: List[str]  # Workers to assign/unassign
