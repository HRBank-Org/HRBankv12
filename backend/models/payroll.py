from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
import uuid

class PayrollPeriod(BaseModel):
    """Weekly payroll period"""
    model_config = ConfigDict(extra="ignore")
    
    period_id: str = Field(default_factory=lambda: f"period_{uuid.uuid4().hex[:12]}")
    employer_id: str
    
    # Period dates (always weekly) - stored as ISO strings for MongoDB
    start_date: str  # YYYY-MM-DD format
    end_date: str    # YYYY-MM-DD format
    week_number: int  # Week number in year (1-52)
    year: int
    
    # Status
    status: str = 'draft'  # draft, finalized, exported, paid
    finalized_date: Optional[str] = None  # ISO datetime string
    exported_date: Optional[str] = None   # ISO datetime string
    
    # Totals
    total_gross_pay: float = 0
    total_vacation_pay: float = 0
    total_overtime_pay: float = 0
    total_public_holiday_pay: float = 0
    total_hours: float = 0
    total_workers: int = 0
    entries_count: int = 0
    generated_at: Optional[str] = None  # ISO datetime string
    
    # Metadata
    created_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class PayrollEntry(BaseModel):
    """Individual worker payroll entry for a period"""
    model_config = ConfigDict(extra="ignore")
    
    entry_id: str = Field(default_factory=lambda: f"entry_{uuid.uuid4().hex[:12]}")
    period_id: str
    employer_id: Optional[str] = None
    worker_id: str
    
    # Worker info
    worker_name: str
    worker_sin: Optional[str] = None
    worker_email: Optional[str] = None
    worker_phone: Optional[str] = None
    
    # Hours breakdown by work type (unified payroll)
    regular_hours: float = 0
    overtime_hours: float = 0
    total_hours: float = 0
    shift_hours: float = 0      # Hours from on-site + continental shifts
    task_hours: float = 0       # Hours from field service tasks
    days_worked: int = 0        # Number of days with work
    hourly_rate: float = 0
    
    # Pay breakdown
    regular_pay: float = 0
    overtime_pay: float = 0  # 1.5x rate
    vacation_pay: float = 0  # 4% of gross
    public_holiday_pay: float = 0
    gross_pay: float = 0
    
    # Year-to-date for tax calculations
    gross_pay_ytd: float = 0
    weeks_worked_ytd: int = 1
    
    # Tax deductions (calculated)
    employee_cpp: float = 0
    cpp_deduction: float = 0  # Alias for employee_cpp
    employee_ei: float = 0
    ei_deduction: float = 0   # Alias for employee_ei
    federal_tax: float = 0
    provincial_tax: float = 0
    total_deductions: float = 0
    net_pay: float = 0
    
    # Employer costs
    employer_cpp: float = 0
    employer_ei: float = 0
    employer_total_cost: float = 0
    
    # Tax options (from worker TD1 forms)
    federal_td1_claim: Optional[float] = None
    provincial_td1_claim: Optional[float] = None
    
    # Deduction options (employer can choose)
    calculate_cpp: bool = True
    calculate_ei: bool = True
    calculate_federal_tax: bool = True
    calculate_provincial_tax: bool = True
    
    # Metadata - work references
    shifts_included: List[str] = []  # shift_ids (standard + continental)
    shift_ids: List[str] = []        # Alias for shifts_included
    task_ids: List[str] = []         # service_task_ids (field service)
    created_date: datetime = Field(default_factory=datetime.utcnow)


class PayrollExport(BaseModel):
    """Payroll export record"""
    model_config = ConfigDict(extra="ignore")
    
    export_id: str = Field(default_factory=lambda: f"export_{uuid.uuid4().hex[:12]}")
    employer_id: str
    period_id: str
    
    # Export details
    export_format: str  # csv, excel, adp, ceridian, wagepoint
    file_url: Optional[str] = None
    file_name: str
    
    # API integration (for future)
    payroll_provider: Optional[str] = None  # ADP, Ceridian, Wagepoint
    api_batch_id: Optional[str] = None
    api_status: Optional[str] = None  # pending, success, failed
    api_response: Optional[dict] = None
    
    # Statistics
    total_entries: int
    total_gross_pay: float
    total_net_pay: float
    total_deductions: float
    
    # Metadata
    exported_by: str  # user_id
    exported_date: datetime = Field(default_factory=datetime.utcnow)


class WorkerTD1(BaseModel):
    """Worker TD1 tax form (federal and provincial)"""
    model_config = ConfigDict(extra="ignore")
    
    td1_id: str = Field(default_factory=lambda: f"td1_{uuid.uuid4().hex[:12]}")
    worker_id: str
    
    # Federal TD1 (2024)
    federal_basic_personal_amount: float = 15705.00
    federal_additional_claims: float = 0  # Spouse, dependents, etc.
    federal_total_claim: float = 15705.00
    
    # Provincial TD1 (Ontario 2024)
    provincial_basic_personal_amount: float = 11865.00
    provincial_additional_claims: float = 0
    provincial_total_claim: float = 11865.00
    
    # Options
    additional_tax_per_pay: float = 0  # Request extra tax withheld
    reduce_tax_at_source: bool = False  # Letter of authority from CRA
    
    # Metadata
    form_year: int = 2024
    submitted_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)


# Payroll export formats
EXPORT_FORMATS = [
    "csv",
    "excel",
    "adp_api",
    "ceridian_api",
    "wagepoint_api"
]

# Payroll status options
PAYROLL_STATUS = [
    "draft",        # Being prepared
    "finalized",    # Ready to export
    "exported",     # Exported to file or API
    "paid"          # Workers have been paid
]
