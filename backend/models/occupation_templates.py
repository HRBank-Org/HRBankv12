from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class CertificationRequirement(BaseModel):
    name: str
    required: bool
    expiry_tracked: bool

class SkillRequirement(BaseModel):
    name: str
    required: bool
    proficiency_level: str  # basic, intermediate, advanced

class ExperienceRequirement(BaseModel):
    minimum_months: int
    preferred_months: int

class PhysicalRequirement(BaseModel):
    name: str
    required: bool

class OtherRequirement(BaseModel):
    name: str
    required: bool

class MinimumRequirements(BaseModel):
    certifications: List[CertificationRequirement] = []
    skills: List[SkillRequirement] = []
    experience: ExperienceRequirement
    physical_requirements: List[PhysicalRequirement] = []
    other_requirements: List[OtherRequirement] = []

class OccupationTemplate(BaseModel):
    id: str = Field(alias="template_id")
    name: str
    category: str
    description: str
    minimum_requirements: MinimumRequirements
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = True

    class Config:
        populate_by_name = True

class CreateOccupationTemplateRequest(BaseModel):
    name: str
    category: str
    description: str
    minimum_requirements: MinimumRequirements

class UpdateOccupationTemplateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    minimum_requirements: Optional[MinimumRequirements] = None
    active: Optional[bool] = None


# Worker Qualification Models
class WorkerCertification(BaseModel):
    name: str
    has: bool
    document_url: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    verified: bool = False
    verified_by: Optional[str] = None
    verified_date: Optional[str] = None

class WorkerSkill(BaseModel):
    name: str
    has: bool
    proficiency_level: Optional[str] = None  # basic, intermediate, advanced
    verified: bool = False
    verified_by: Optional[str] = None
    verified_date: Optional[str] = None

class EmployerExperience(BaseModel):
    name: str
    months: int
    verified: bool = False

class WorkerExperience(BaseModel):
    total_months: int
    employers: List[EmployerExperience] = []

class WorkerPhysicalRequirement(BaseModel):
    name: str
    confirmed: bool

class WorkerOtherRequirement(BaseModel):
    name: str
    has: bool
    document_url: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None

class WorkerQualification(BaseModel):
    qualification_id: str
    worker_id: str
    occupation_template_id: str
    occupation_name: str
    certifications: List[WorkerCertification] = []
    skills: List[WorkerSkill] = []
    experience: WorkerExperience
    physical_requirements: List[WorkerPhysicalRequirement] = []
    other_requirements: List[WorkerOtherRequirement] = []
    match_score: float = 0.0
    last_calculated: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateWorkerQualificationRequest(BaseModel):
    occupation_template_id: str
    certifications: List[WorkerCertification] = []
    skills: List[WorkerSkill] = []
    experience: WorkerExperience
    physical_requirements: List[WorkerPhysicalRequirement] = []
    other_requirements: List[WorkerOtherRequirement] = []

class UpdateWorkerQualificationRequest(BaseModel):
    certifications: Optional[List[WorkerCertification]] = None
    skills: Optional[List[WorkerSkill]] = None
    experience: Optional[WorkerExperience] = None
    physical_requirements: Optional[List[WorkerPhysicalRequirement]] = None
    other_requirements: Optional[List[WorkerOtherRequirement]] = None


# Employer Role Models (Updated)
class CustomRequirement(BaseModel):
    certifications: List[CertificationRequirement] = []
    skills: List[SkillRequirement] = []

class EmployerRole(BaseModel):
    role_id: str
    employer_id: str
    workplace_id: str
    occupation_template_id: str
    occupation_name: str
    role_name: str
    custom_requirements: Optional[CustomRequirement] = None
    hourly_rate: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = True

class CreateEmployerRoleRequest(BaseModel):
    workplace_id: str
    occupation_template_id: str
    role_name: str
    custom_requirements: Optional[CustomRequirement] = None
    hourly_rate: float

class UpdateEmployerRoleRequest(BaseModel):
    role_name: Optional[str] = None
    custom_requirements: Optional[CustomRequirement] = None
    hourly_rate: Optional[float] = None
    active: Optional[bool] = None
