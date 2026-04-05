from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class WorkforceRating(BaseModel):
    """Employer rates workforce after shift completion"""
    model_config = ConfigDict(extra="ignore")
    
    rating_id: str = Field(default_factory=lambda: f"wfrt_{uuid.uuid4().hex[:12]}")
    booking_id: str
    shift_id: str
    from_employer_id: str
    to_workforce_id: str
    occupation_id: str  # Which occupation this rating is for
    
    # Technical/Skill Ratings (6 categories)
    technical_skills: int  # 1-5
    communication: int  # 1-5
    quality_of_work: int  # 1-5
    timeliness: int  # 1-5
    professionalism: int  # 1-5
    teamwork: int  # 1-5
    
    # Calculated
    overall_rating: float  # Average of above 6
    
    # Comments
    comments: Optional[str] = None
    
    # Metadata
    review_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployerRating(BaseModel):
    """Workforce rates employer after shift completion"""
    model_config = ConfigDict(extra="ignore")
    
    rating_id: str = Field(default_factory=lambda: f"emprt_{uuid.uuid4().hex[:12]}")
    booking_id: str
    shift_id: str
    from_workforce_id: str
    to_employer_id: str
    
    # Employer Experience Ratings (6 categories)
    communication: int  # 1-5
    management_support: int  # 1-5
    work_environment: int  # 1-5
    respect_and_inclusivity: int  # 1-5
    pay_and_benefits: int  # 1-5
    workplace_safety: int  # 1-5
    
    # Calculated
    overall_rating: float  # Average of above 6
    
    # Comments
    comments: Optional[str] = None
    
    # Metadata
    review_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
