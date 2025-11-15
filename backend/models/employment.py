from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class EmploymentRelationship(BaseModel):
    """Track employment relationship between employer and workforce"""
    model_config = ConfigDict(extra="ignore")
    
    relationship_id: str = Field(default_factory=lambda: f"rel_{uuid.uuid4().hex[:12]}")
    employer_id: str
    workforce_id: str
    workplace_id: Optional[str] = None  # Primary workplace if applicable
    
    # Employment details
    employment_type: str = 'contract'  # contract, part_time, full_time, temporary
    position_title: Optional[str] = None
    
    # Status tracking
    status: str = 'active'  # active, inactive, terminated, suspended
    employment_start_date: datetime = Field(default_factory=datetime.utcnow)
    employment_end_date: Optional[datetime] = None
    last_worked_date: Optional[datetime] = None
    
    # Termination details
    termination_reason: Optional[str] = None  # laid_off, contract_ended, terminated_cause, resigned, mutual_agreement
    termination_notes: Optional[str] = None
    terminated_by: Optional[str] = None  # user_id who initiated termination
    
    # Performance tracking
    total_shifts_completed: int = 0
    total_hours_worked: float = 0.0
    average_rating: Optional[float] = None
    
    # Rehire eligibility
    eligible_for_rehire: bool = True
    rehire_notes: Optional[str] = None
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)


class TerminationRequest(BaseModel):
    """Request to terminate employment"""
    model_config = ConfigDict(extra="ignore")
    
    termination_reason: str  # laid_off, contract_ended, terminated_cause, resigned, mutual_agreement
    termination_notes: Optional[str] = None
    last_working_day: Optional[str] = None  # ISO date string
    eligible_for_rehire: bool = True
    cancel_future_shifts: bool = True
    notify_worker: bool = True


class RehireRequest(BaseModel):
    """Request to rehire a past worker"""
    model_config = ConfigDict(extra="ignore")
    
    workplace_id: Optional[str] = None
    position_title: Optional[str] = None
    employment_type: str = 'contract'
    rehire_notes: Optional[str] = None
