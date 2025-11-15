from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class PartnerLogo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    institution_id: str
    logo_url: str
    institution_name: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class PartnerLogoCreate(BaseModel):
    institution_name: str
    logo_url: str

class PartnerLogoResponse(BaseModel):
    id: str
    institution_name: str
    logo_url: str
    uploaded_at: datetime
    is_active: bool