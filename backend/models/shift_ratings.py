from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime

class WorkerRatingCategories(BaseModel):
    """Rating categories for workers"""
    technical_skills: int = Field(..., ge=1, le=5, description="Technical skills rating (1-5)")
    communication: int = Field(..., ge=1, le=5, description="Communication rating (1-5)")
    quality_of_work: int = Field(..., ge=1, le=5, description="Quality of work rating (1-5)")
    timeliness: int = Field(..., ge=1, le=5, description="Timeliness rating (1-5)")
    professionalism: int = Field(..., ge=1, le=5, description="Professionalism rating (1-5)")
    teamwork: int = Field(..., ge=1, le=5, description="Teamwork rating (1-5)")

class EmployerRatingCategories(BaseModel):
    """Rating categories for employers (two-way feedback)"""
    communication: int = Field(..., ge=1, le=5, description="Communication rating (1-5)")
    management_support: int = Field(..., ge=1, le=5, description="Management support rating (1-5)")
    work_environment: int = Field(..., ge=1, le=5, description="Work environment rating (1-5)")
    respect_and_inclusivity: int = Field(..., ge=1, le=5, description="Respect and inclusivity rating (1-5)")
    pay_and_benefits: int = Field(..., ge=1, le=5, description="Pay and benefits rating (1-5)")
    workplace_safety: int = Field(..., ge=1, le=5, description="Workplace safety rating (1-5)")

class ShiftRatingRequest(BaseModel):
    """Request to submit shift rating"""
    model_config = ConfigDict(extra="ignore")
    
    shift_id: str
    worker_id: str
    worker_ratings: WorkerRatingCategories
    employer_ratings: Optional[EmployerRatingCategories] = None  # Optional two-way feedback
    worker_comments: Optional[str] = None
    employer_comments: Optional[str] = None

class ShiftRating(BaseModel):
    """Shift rating document"""
    model_config = ConfigDict(extra="ignore")
    
    rating_id: str
    shift_id: str
    employer_id: str
    worker_id: str
    workplace_id: str
    position_title: str
    shift_date: str
    
    # Worker ratings (by employer)
    worker_ratings: Dict[str, int]
    worker_overall_rating: float
    worker_comments: Optional[str] = None
    
    # Employer ratings (by worker - two-way feedback)
    employer_ratings: Optional[Dict[str, int]] = None
    employer_overall_rating: Optional[float] = None
    employer_comments: Optional[str] = None
    
    # Metadata
    rated_by_employer_at: str
    rated_by_worker_at: Optional[str] = None
    created_date: str
