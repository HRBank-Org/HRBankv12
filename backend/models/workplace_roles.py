from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
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
    
    # Requirements
    required_skills: List[str] = []
    required_certifications: List[str] = []  # Includes both occupation-linked and employer-added
    occupation_required_certifications: List[str] = []  # Certifications from occupation template
    
    # Compensation
    hourly_rate: Optional[float] = None
    
    # Status
    status: str = "unfilled"  # unfilled, filled, posted_to_match
    filled_by_workforce_id: Optional[str] = None
    filled_date: Optional[datetime] = None
    posted_as_job_id: Optional[str] = None  # If posted to match engine
    
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
    required_skills: List[str] = []
    additional_certifications: List[str] = []  # Employer can add extra certs
    hourly_rate: Optional[float] = None
    description: Optional[str] = None
    positions_available: int = 1

class WorkplaceRoleUpdate(BaseModel):
    """Request model for updating a workplace role"""
    role_name: Optional[str] = None
    required_skills: Optional[List[str]] = None
    additional_certifications: Optional[List[str]] = None
    hourly_rate: Optional[float] = None
    description: Optional[str] = None
    positions_available: Optional[int] = None
