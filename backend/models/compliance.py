from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class EmployerCompliance(BaseModel):
    """Employer legal compliance tracking"""
    model_config = ConfigDict(extra="ignore")
    
    compliance_id: str = Field(default_factory=lambda: f"comp_{uuid.uuid4().hex[:12]}")
    employer_id: str
    
    # Worker Classification (T4 vs T4A)
    payroll_type: str = "T4_employee"  # Only T4 allowed, no T4A option
    payroll_provider: Optional[str] = None  # ADP, Ceridian, Wagepoint, Manual_CRA
    classification_confirmed: bool = False  # Must be True to post shifts
    classification_confirmed_date: Optional[datetime] = None
    classification_acknowledgment_text: str = "I confirm workers are employees and I will comply with Employment Standards Act"
    
    # WSIB Coverage
    wsib_account_number: Optional[str] = None
    wsib_certificate_url: Optional[str] = None  # Uploaded document
    wsib_verified: bool = False
    wsib_verified_by: Optional[str] = None  # Admin user_id who verified
    wsib_verified_date: Optional[datetime] = None
    wsib_expiry_date: Optional[datetime] = None  # Annual renewal required
    wsib_industry_type: Optional[str] = None  # Construction, Healthcare, Office, etc.
    
    # Platform Liability Disclaimer
    terms_acknowledged: bool = False
    terms_acknowledged_date: Optional[datetime] = None
    terms_version: str = "1.0"
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Compliance status
    can_post_shifts: bool = False  # True only if all compliance requirements met


class WorkerCompliance(BaseModel):
    """Worker legal compliance tracking"""
    model_config = ConfigDict(extra="ignore")
    
    compliance_id: str = Field(default_factory=lambda: f"wcomp_{uuid.uuid4().hex[:12]}")
    worker_id: str
    
    # Casual Employment Disclosure
    casual_employment_acknowledged: bool = False
    casual_employment_acknowledged_date: Optional[datetime] = None
    casual_employment_ip_address: Optional[str] = None
    
    # Platform Liability Disclaimer
    terms_acknowledged: bool = False
    terms_acknowledged_date: Optional[datetime] = None
    terms_version: str = "1.0"
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)


class WSIBDocument(BaseModel):
    """WSIB Certificate tracking"""
    model_config = ConfigDict(extra="ignore")
    
    wsib_doc_id: str = Field(default_factory=lambda: f"wsib_{uuid.uuid4().hex[:12]}")
    employer_id: str
    
    # WSIB Details
    wsib_account_number: str
    certificate_url: str  # Uploaded PDF/image
    industry_type: str  # Construction, Healthcare, Office, etc.
    
    # Verification
    verification_status: str = 'pending'  # pending, approved, rejected
    verified_by: Optional[str] = None  # Admin user_id
    verified_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Expiry tracking
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None  # WSIB certificates expire annually
    is_expired: bool = False
    days_until_expiry: Optional[int] = None
    
    # Metadata
    uploaded_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


# Payroll provider options
PAYROLL_PROVIDERS = [
    "ADP",
    "Ceridian", 
    "Wagepoint",
    "Manual_CRA"
]

# WSIB industry types
WSIB_INDUSTRY_TYPES = [
    "Construction",
    "Healthcare",
    "Manufacturing",
    "Retail",
    "Food Service",
    "Office/Administrative",
    "Warehouse/Logistics",
    "Other"
]

# Legal text constants
EMPLOYER_CLASSIFICATION_DISCLOSURE = """
IMPORTANT: Worker Classification

Workers on HR Bank are YOUR EMPLOYEES (not independent contractors).

This means:
- You MUST use CRA T4 payroll (not T4A)
- You MUST deduct CPP, EI, and income tax
- You MUST remit to CRA
- You MUST comply with Employment Standards Act (ESA)
- You MUST provide WSIB coverage

CRA Classification Test:
1. CONTROL: You control when, where, and how work is done
2. TOOLS: You provide tools, equipment, or workspace
3. FINANCIAL RISK: Workers don't risk losing money
4. INTEGRATION: Workers are integrated into your business

Misclassification Consequences:
- CRA penalties and back taxes
- WSIB fines
- ESA violations
- Legal liability

By confirming, you acknowledge workers are employees and you will comply with all employment laws.
"""

EMPLOYER_TOS_TEXT = """
HR Bank Platform - Employer Terms of Service

1. EMPLOYER STATUS
You acknowledge and agree that:
- HR Bank is NOT the employer of any workers
- YOU are the employer of workers who accept your shifts
- YOU are solely responsible for all employment law compliance
- YOU must comply with Employment Standards Act (ESA)
- YOU must provide WSIB coverage
- YOU must use CRA T4 payroll (not T4A/contractor)

2. LEGAL COMPLIANCE
You agree to:
- Correctly classify workers as employees (T4)
- Pay all required payroll deductions (CPP, EI, income tax)
- Remit payroll deductions to CRA
- Provide WSIB coverage
- Pay vacation pay (4% of gross wages)
- Pay public holiday pay when entitled
- Pay overtime (1.5x after 44 hours/week)
- Pay at least minimum wage
- Provide breaks (30 min unpaid after 5 hours)
- Provide termination notice if required

3. PLATFORM LIABILITY
You acknowledge that:
- HR Bank is a technology platform only
- HR Bank is not liable for your employment law violations
- You indemnify HR Bank from any employment-related claims
- You are solely responsible for worker injuries, disputes, or claims

4. TERMINATION
HR Bank may suspend or terminate your account if you:
- Violate employment laws
- Fail to maintain WSIB coverage
- Misclassify workers
- Fail to pay workers correctly

By clicking "I Agree", you accept these terms and confirm you understand your obligations as an employer.
"""

WORKER_CASUAL_EMPLOYMENT_DISCLOSURE = """
IMPORTANT: Casual Employment Status

You are registering as a CASUAL EMPLOYEE on HR Bank.

This means:
- NO guaranteed hours or shifts
- NO expectation of ongoing work
- You CAN accept or reject any shift
- Employers CAN stop posting shifts without notice
- You are NOT entitled to termination notice (unless you become permanent)
- You MAY work for multiple employers simultaneously

Your Rights as a Casual Employee:
- Vacation pay (4% of gross wages)
- Public holiday pay (if eligible)
- Overtime pay (1.5x after 44 hours/week per employer)
- Minimum wage ($16.55/hour in Ontario)
- Breaks (30 min unpaid after 5 hours)
- WSIB coverage (employer provides)

When You Might Become Permanent:
If you work regularly for one employer for 3+ months (e.g., 2+ shifts/week for 12+ weeks), you may be considered a permanent employee and entitled to termination notice.

Multiple Employers:
You can work for multiple employers simultaneously. Each employer relationship is independent. Overtime is calculated per employer (not total hours across all employers).

By clicking "I Understand", you acknowledge you are a casual employee with no guaranteed hours.
"""

WORKER_TOS_TEXT = """
HR Bank Platform - Worker Terms of Service

1. CASUAL EMPLOYMENT
You acknowledge and agree that:
- You are a CASUAL EMPLOYEE (not permanent, not contractor)
- You have NO guaranteed hours or shifts
- Employers can stop posting shifts without notice
- You can work for multiple employers simultaneously

2. EMPLOYER RELATIONSHIP
You acknowledge that:
- HR Bank is NOT your employer
- The employer who posts the shift is YOUR employer
- Each employer relationship is independent
- You are an employee of each employer (T4, not T4A)

3. EMPLOYMENT RIGHTS
You are entitled to:
- Vacation pay (4% of gross wages)
- Public holiday pay (if eligible)
- Overtime pay (1.5x after 44 hours/week per employer)
- Minimum wage
- Breaks (30 min unpaid after 5 hours)
- WSIB coverage (employer provides)

4. PLATFORM LIABILITY
You acknowledge that:
- HR Bank is a technology platform only
- HR Bank is not liable for employer violations
- You must resolve disputes directly with employers
- HR Bank may assist with dispute resolution but is not liable

5. TERMINATION
HR Bank may suspend or terminate your account if you:
- Violate platform policies
- Provide false information
- Engage in misconduct

By clicking "I Agree", you accept these terms and understand your status as a casual employee.
"""
