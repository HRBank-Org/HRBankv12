from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, date
import uuid
import hashlib
import json

class CredentialTemplate(BaseModel):
    """Template for credential types that institutions can issue"""
    model_config = ConfigDict(extra="ignore")
    
    template_id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    institution_id: str
    credential_type: str  # certificate, diploma, degree, license, micro_credential, badge
    credential_name: str  # e.g., "Personal Support Worker Certificate"
    program_name: str
    issuing_body: str
    description: str
    duration_months: Optional[int] = None
    expiry_enabled: bool = False
    expiry_period_months: Optional[int] = None
    requires_renewal: bool = False
    skills_covered: List[str] = []
    competencies: List[str] = []
    accreditation_body: Optional[str] = None
    template_design_url: Optional[str] = None
    status: str = 'active'  # active, archived
    created_date: datetime = Field(default_factory=datetime.utcnow)

class BlockchainCredential(BaseModel):
    """Blockchain-verified credential issued to worker"""
    model_config = ConfigDict(extra="ignore")
    
    credential_id: str = Field(default_factory=lambda: f"HRBANK-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}")
    worker_id: str = ""
    institution_id: str
    credential_template_id: str = ""  # Optional - not always from template
    
    # Credential info
    credential_name: str
    program_name: str
    issue_date: str  # ISO format string for MongoDB compatibility
    expiry_date: Optional[str] = None  # ISO format string
    
    # Student info
    student_name: str
    student_id: Optional[str] = None
    grade_gpa: Optional[str] = None
    additional_details: Dict = Field(default_factory=dict)
    
    # Blockchain data
    credential_hash: str = ""  # SHA-256 hash - generated after creation
    blockchain_transaction_hash: Optional[str] = None
    blockchain_token_id: Optional[str] = None
    ipfs_url: Optional[str] = None
    verification_url: str = ""
    qr_code_url: str = ""
    
    # Status
    status: str = 'pending'  # pending, issued, verified, revoked, expired
    issued_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    
    # Metrics
    verification_count: int = 0
    last_verified_at: Optional[datetime] = None
    
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    
    def generate_credential_hash(self) -> str:
        """Generate SHA-256 hash of credential data"""
        data = {
            "credential_id": self.credential_id,
            "worker_id": self.worker_id,
            "institution_id": self.institution_id,
            "credential_name": self.credential_name,
            "student_name": self.student_name,
            "issue_date": self.issue_date,
            "expiry_date": self.expiry_date if self.expiry_date else None
        }
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()

class CredentialVerification(BaseModel):
    """Log of credential verifications"""
    model_config = ConfigDict(extra="ignore")
    
    verification_id: str = Field(default_factory=lambda: f"verif_{uuid.uuid4().hex[:12]}")
    credential_id: str
    verified_by_user_id: Optional[str] = None
    verified_by_type: str  # employer, institution, worker, public
    verification_method: str  # qr_scan, url_link, platform_search, api
    verification_result: str  # valid, expired, revoked, not_found, invalid
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    verified_date: datetime = Field(default_factory=datetime.utcnow)

class CredentialSharing(BaseModel):
    """Track when workers share credentials"""
    model_config = ConfigDict(extra="ignore")
    
    share_id: str = Field(default_factory=lambda: f"share_{uuid.uuid4().hex[:12]}")
    credential_id: str
    worker_id: str
    shared_with_user_id: str
    shared_with_type: str  # employer, institution, public
    share_method: str  # direct_link, qr_code, email, platform_share
    access_expires_at: Optional[datetime] = None
    view_count: int = 0
    shared_date: datetime = Field(default_factory=datetime.utcnow)
    last_viewed_at: Optional[datetime] = None
