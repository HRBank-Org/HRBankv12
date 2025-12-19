"""
Occupational Template Model
Super-admin managed templates for standardized occupations
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal
from datetime import datetime

# Valid work types
WorkType = Literal["on_site", "route_based", "continental"]

class OccupationTemplate(BaseModel):
    """
    Super-admin managed occupation template
    Used to standardize position titles and rates across the platform
    """
    template_id: str
    occupation_title: str  # e.g., "Server", "Bartender", "Line Cook"
    occupation_category: str  # e.g., "Food Service", "Healthcare", "Retail"
    description: Optional[str] = None
    
    # Default work type - inherited by roles but can be overridden by employer
    # on_site: Standard GPS clock-in at workplace (Server, Chef, Cashier)
    # route_based: Multi-stop tasks with GPS at each location (Delivery Driver, Cleaner)
    # continental: 12-hour rotating shifts (Security Guard, Factory Worker)
    default_work_type: str = "on_site"  # on_site, route_based, continental
    
    # Rate suggestions by province
    suggested_rates: Dict[str, float] = Field(default_factory=dict)  # {"ON": 18.50, "BC": 19.00}
    
    # Requirements
    required_certifications: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    min_experience_years: Optional[float] = 0
    
    # Additional metadata
    typical_duties: List[str] = Field(default_factory=list)
    working_conditions: Optional[str] = None
    
    # System fields
    is_active: bool = True
    created_at: str
    updated_at: str
    created_by: str  # admin user_id

class OccupationTemplateCreate(BaseModel):
    """Request model for creating occupation template"""
    occupation_title: str
    occupation_category: str
    description: Optional[str] = None
    default_work_type: str = "on_site"  # on_site, route_based, continental
    suggested_rates: Dict[str, float] = Field(default_factory=dict)
    required_certifications: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    min_experience_years: Optional[float] = 0
    typical_duties: List[str] = Field(default_factory=list)
    working_conditions: Optional[str] = None

class OccupationTemplateUpdate(BaseModel):
    """Request model for updating occupation template"""
    occupation_title: Optional[str] = None
    occupation_category: Optional[str] = None
    description: Optional[str] = None
    default_work_type: Optional[str] = None  # on_site, route_based, continental
    suggested_rates: Optional[Dict[str, float]] = None
    required_certifications: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    min_experience_years: Optional[float] = None
    typical_duties: Optional[List[str]] = None
    working_conditions: Optional[str] = None
    is_active: Optional[bool] = None
