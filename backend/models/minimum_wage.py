from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProvinceMinimumWage(BaseModel):
    """Provincial minimum wage settings"""
    province_code: str  # ON, BC, AB, QC, etc.
    province_name: str  # Ontario, British Columbia, etc.
    minimum_wage: float
    effective_date: datetime
    updated_by: str  # Admin user who updated it
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None  # e.g., "Updated per provincial legislation"

class MinimumWageUpdate(BaseModel):
    """Request model for updating minimum wage"""
    province_code: str
    minimum_wage: float
    effective_date: datetime
    notes: Optional[str] = None
