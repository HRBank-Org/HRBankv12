from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class EULAAcceptance(BaseModel):
    """Track EULA acceptance by users"""
    model_config = ConfigDict(extra="ignore")
    
    acceptance_id: str = Field(default_factory=lambda: f"eula_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_type: str  # workforce, employer, institution
    
    # EULA details
    eula_version: str = "1.0"  # Can be updated when EULA changes
    eula_type: str = "worker"  # worker, employer, institution (different EULAs for each)
    
    # Acceptance details
    accepted: bool = True
    accepted_date: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)


class EULADocument(BaseModel):
    """Store EULA document content"""
    model_config = ConfigDict(extra="ignore")
    
    eula_id: str = Field(default_factory=lambda: f"eulad_{uuid.uuid4().hex[:12]}")
    eula_type: str  # worker, employer, institution
    version: str = "1.0"
    
    # Content
    title: str
    content: str  # Full EULA text
    effective_date: str
    
    # Status
    active: bool = True
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
