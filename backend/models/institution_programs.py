"""
Institution Programs Models
===========================
Hierarchical structure: Faculty → SubFaculty → Program → Cohort (formerly Class)

This mirrors the Employer structure:
- Employer: Workplace → Role → Shift → Worker
- Institution: Faculty → Program → Cohort → Student → Credential
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# ==================== CREDENTIAL & DELIVERY TYPES ====================

CREDENTIAL_TYPES = [
    "Diploma",
    "Certificate",
    "Certificate - Vocational",
    "Advanced Diploma",
    "Graduate Certificate",
    "Degree",
    "Micro-credential",
    "Badge",
    "License"
]

DELIVERY_MODES = [
    "In-Class",
    "Online",
    "Hybrid",
    "Remote",
    "Self-Paced"
]

PROGRAM_STATUS = [
    "active",
    "inactive",
    "draft",
    "archived"
]


# ==================== FACULTY MODEL ====================

class Faculty(BaseModel):
    """
    Top-level grouping for programs (e.g., Healthcare, Business, Technology)
    """
    faculty_id: str = Field(default_factory=lambda: f"fac_{uuid.uuid4().hex[:12]}")
    institution_id: str
    faculty_name: str
    description: Optional[str] = None
    icon: Optional[str] = None  # Emoji or icon name
    color: Optional[str] = None  # Hex color for UI
    display_order: int = 0
    is_active: bool = True
    programs_count: int = 0
    created_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_date: Optional[str] = None


class FacultyCreate(BaseModel):
    faculty_name: str
    description: Optional[str] = None
    icon: Optional[str] = "📚"
    color: Optional[str] = "#3B82F6"


class FacultyUpdate(BaseModel):
    faculty_name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


# ==================== PROGRAM MODEL ====================

class Program(BaseModel):
    """
    Academic program within a faculty
    Programs have cohorts (formerly classes) which are scheduled intakes
    """
    program_id: str = Field(default_factory=lambda: f"prg_{uuid.uuid4().hex[:12]}")
    institution_id: str
    faculty_id: str
    
    # Program Details
    program_name: str
    program_code: Optional[str] = None  # e.g., "ACC-101"
    sub_faculty: Optional[str] = None  # Sub-category (e.g., "Traditional Chinese Medicine")
    description: Optional[str] = None
    marketing_name: Optional[str] = None  # For public display
    
    # Credential Info
    credential_type: str  # Diploma, Certificate, etc.
    duration_weeks: Optional[int] = None
    duration_display: Optional[str] = None  # e.g., "73 Weeks", "2 Years"
    validity_period_months: Optional[int] = None  # How long credential is valid
    
    # Delivery
    delivery_mode: str = "In-Class"
    
    # Documents
    outline_url: Optional[str] = None  # Link to program outline PDF
    
    # Status & Metrics
    status: str = "active"
    total_cohorts: int = 0
    total_students: int = 0
    total_credentials_issued: int = 0
    
    # Metadata
    is_active: bool = True
    display_order: int = 0
    created_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_date: Optional[str] = None


class ProgramCreate(BaseModel):
    faculty_id: str
    program_name: str
    program_code: Optional[str] = None
    sub_faculty: Optional[str] = None
    description: Optional[str] = None
    marketing_name: Optional[str] = None
    credential_type: str
    duration_weeks: Optional[int] = None
    duration_display: Optional[str] = None
    validity_period_months: Optional[int] = None
    delivery_mode: str = "In-Class"
    outline_url: Optional[str] = None
    status: str = "active"


class ProgramUpdate(BaseModel):
    faculty_id: Optional[str] = None
    program_name: Optional[str] = None
    program_code: Optional[str] = None
    sub_faculty: Optional[str] = None
    description: Optional[str] = None
    marketing_name: Optional[str] = None
    credential_type: Optional[str] = None
    duration_weeks: Optional[int] = None
    duration_display: Optional[str] = None
    validity_period_months: Optional[int] = None
    delivery_mode: Optional[str] = None
    outline_url: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


# ==================== CSV IMPORT MODEL ====================

class ProgramCSVRow(BaseModel):
    """Model for CSV/Excel import row"""
    name: str
    main_faculty: str
    sub_faculty: Optional[str] = None
    type: str  # Credential type
    delivery_mode: Optional[str] = "In-Class"
    outline_link: Optional[str] = None
    status: Optional[str] = "active"
    marketing_name: Optional[str] = None
