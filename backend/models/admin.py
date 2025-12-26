from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
from enum import Enum
import uuid


class AdminRoleType(str, Enum):
    """Admin role types with specific responsibilities"""
    SUPER_ADMIN = "super_admin"           # Full access to everything
    REGIONAL_MANAGER = "regional_manager"  # Manages specific provinces/regions
    ACCOUNT_ACTIVATOR = "account_activator"  # Activates user accounts
    CREDENTIALS_REVIEWER = "credentials_reviewer"  # Reviews and approves credentials
    CUSTOMER_SERVICE = "customer_service"  # Handles customer inquiries
    COMPLIANCE_OFFICER = "compliance_officer"  # Reviews compliance documents
    FRANCHISE_MANAGER = "franchise_manager"  # Manages franchise operations


class AdminPermissions(BaseModel):
    """Detailed permissions for admin roles"""
    model_config = ConfigDict(extra="ignore")
    
    # User Management
    can_activate_users: bool = False
    can_deactivate_users: bool = False
    can_delete_users: bool = False
    can_view_user_profiles: bool = True
    can_edit_user_profiles: bool = False
    
    # Credential Management
    can_review_credentials: bool = False
    can_approve_credentials: bool = False
    can_reject_credentials: bool = False
    can_revoke_credentials: bool = False
    
    # Document Management
    can_review_documents: bool = False
    can_approve_documents: bool = False
    can_request_resubmission: bool = False
    
    # Admin Management
    can_create_admins: bool = False
    can_edit_admins: bool = False
    can_delete_admins: bool = False
    can_assign_roles: bool = False
    
    # Franchise Management
    can_create_franchise: bool = False
    can_edit_franchise: bool = False
    can_view_franchise_analytics: bool = False
    
    # Customer Service
    can_view_support_tickets: bool = False
    can_respond_to_tickets: bool = False
    can_escalate_tickets: bool = False
    
    # Analytics & Reporting
    can_view_analytics: bool = True
    can_export_reports: bool = False
    can_view_financial_data: bool = False
    
    # System Settings
    can_manage_system_settings: bool = False
    can_manage_zones: bool = False
    can_manage_occupations: bool = False


# Default permissions for each role
ROLE_PERMISSIONS = {
    AdminRoleType.SUPER_ADMIN: AdminPermissions(
        can_activate_users=True, can_deactivate_users=True, can_delete_users=True,
        can_view_user_profiles=True, can_edit_user_profiles=True,
        can_review_credentials=True, can_approve_credentials=True, 
        can_reject_credentials=True, can_revoke_credentials=True,
        can_review_documents=True, can_approve_documents=True, can_request_resubmission=True,
        can_create_admins=True, can_edit_admins=True, can_delete_admins=True, can_assign_roles=True,
        can_create_franchise=True, can_edit_franchise=True, can_view_franchise_analytics=True,
        can_view_support_tickets=True, can_respond_to_tickets=True, can_escalate_tickets=True,
        can_view_analytics=True, can_export_reports=True, can_view_financial_data=True,
        can_manage_system_settings=True, can_manage_zones=True, can_manage_occupations=True
    ),
    AdminRoleType.REGIONAL_MANAGER: AdminPermissions(
        can_activate_users=True, can_deactivate_users=True,
        can_view_user_profiles=True, can_edit_user_profiles=True,
        can_review_credentials=True, can_approve_credentials=True, can_reject_credentials=True,
        can_review_documents=True, can_approve_documents=True, can_request_resubmission=True,
        can_view_support_tickets=True, can_respond_to_tickets=True, can_escalate_tickets=True,
        can_view_analytics=True, can_export_reports=True,
        can_view_franchise_analytics=True
    ),
    AdminRoleType.ACCOUNT_ACTIVATOR: AdminPermissions(
        can_activate_users=True,
        can_view_user_profiles=True,
        can_review_documents=True, can_approve_documents=True, can_request_resubmission=True,
        can_view_analytics=True
    ),
    AdminRoleType.CREDENTIALS_REVIEWER: AdminPermissions(
        can_view_user_profiles=True,
        can_review_credentials=True, can_approve_credentials=True, can_reject_credentials=True,
        can_review_documents=True, can_approve_documents=True, can_request_resubmission=True,
        can_view_analytics=True
    ),
    AdminRoleType.CUSTOMER_SERVICE: AdminPermissions(
        can_view_user_profiles=True,
        can_view_support_tickets=True, can_respond_to_tickets=True, can_escalate_tickets=True,
        can_view_analytics=True
    ),
    AdminRoleType.COMPLIANCE_OFFICER: AdminPermissions(
        can_view_user_profiles=True,
        can_review_documents=True, can_approve_documents=True, can_request_resubmission=True,
        can_review_credentials=True, can_approve_credentials=True, can_reject_credentials=True,
        can_view_analytics=True, can_export_reports=True
    ),
    AdminRoleType.FRANCHISE_MANAGER: AdminPermissions(
        can_view_user_profiles=True,
        can_create_franchise=True, can_edit_franchise=True, can_view_franchise_analytics=True,
        can_view_analytics=True, can_export_reports=True, can_view_financial_data=True
    )
}


class Admin(BaseModel):
    """Admin user model with enhanced role-based permissions"""
    model_config = ConfigDict(extra="ignore")
    
    admin_id: str = Field(default_factory=lambda: f"admin_{uuid.uuid4().hex[:12]}")
    user_id: str
    
    # Admin details
    first_name: str
    last_name: str
    title: Optional[str] = None  # Job title (e.g., "Regional Manager", "Customer Service Rep")
    email: str
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    
    # Legacy field for backward compatibility
    full_name: Optional[str] = None
    
    # Role and permissions
    role: str = AdminRoleType.CUSTOMER_SERVICE.value  # Default to customer service
    role_type: AdminRoleType = AdminRoleType.CUSTOMER_SERVICE
    is_super_admin: bool = False
    
    # Custom permissions (override defaults)
    custom_permissions: Optional[Dict] = None
    
    # Geographic assignment
    assigned_zones: List[str] = []
    assigned_provinces: List[str] = []  # e.g., ["ON", "BC", "AB"]
    assigned_cities: List[str] = []
    coverage_type: str = "national"  # national, provincial, regional, local
    
    # Legacy permission fields (kept for backward compatibility)
    can_approve_documents: bool = True
    can_manage_users: bool = False
    can_manage_admins: bool = False
    can_view_analytics: bool = True
    
    # Activity tracking
    status: str = 'active'  # active, inactive, suspended
    last_activity: Optional[str] = None
    actions_count: int = 0
    
    # Audit trail
    created_by: Optional[str] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None
    updated_date: Optional[datetime] = None
    last_login: Optional[str] = None
    
    def get_permissions(self) -> AdminPermissions:
        """Get effective permissions for this admin"""
        if self.is_super_admin:
            return ROLE_PERMISSIONS[AdminRoleType.SUPER_ADMIN]
        
        # Get default permissions for role
        base_permissions = ROLE_PERMISSIONS.get(
            self.role_type, 
            ROLE_PERMISSIONS[AdminRoleType.CUSTOMER_SERVICE]
        )
        
        # Apply custom overrides if any
        if self.custom_permissions:
            permissions_dict = base_permissions.model_dump()
            permissions_dict.update(self.custom_permissions)
            return AdminPermissions(**permissions_dict)
        
        return base_permissions
    
    def has_permission(self, permission: str) -> bool:
        """Check if admin has a specific permission"""
        permissions = self.get_permissions()
        return getattr(permissions, permission, False)
    
    def can_access_region(self, province: str = None, zone: str = None, city: str = None) -> bool:
        """Check if admin can access a specific geographic area"""
        if self.is_super_admin or self.coverage_type == "national":
            return True
        
        if province and province.upper() in [p.upper() for p in self.assigned_provinces]:
            return True
        
        if zone and zone in self.assigned_zones:
            return True
        
        if city and city.lower() in [c.lower() for c in self.assigned_cities]:
            return True
        
        return False


class Zone(BaseModel):
    """Geographic zone model"""
    model_config = ConfigDict(extra="ignore")
    
    zone_id: str = Field(default_factory=lambda: f"zone_{uuid.uuid4().hex[:12]}")
    
    zone_name: str
    zone_code: str
    province: str
    
    cities: List[str] = []
    postal_code_prefixes: List[str] = []
    
    # Statistics
    total_users: int = 0
    total_employers: int = 0
    total_workforce: int = 0
    
    # Assigned admins
    assigned_admin_ids: List[str] = []
    
    active: bool = True
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Franchise(BaseModel):
    """Franchise model for multi-location businesses"""
    model_config = ConfigDict(extra="ignore")
    
    franchise_id: str = Field(default_factory=lambda: f"fran_{uuid.uuid4().hex[:12]}")
    
    # Franchise details
    franchise_name: str
    brand_name: str
    parent_company: Optional[str] = None
    
    # Contact info
    contact_email: str
    contact_phone: Optional[str] = None
    headquarters_address: Optional[str] = None
    
    # Geographic coverage
    provinces: List[str] = []
    zones: List[str] = []
    
    # Locations
    locations: List[Dict] = []  # List of employer_ids
    total_locations: int = 0
    
    # Workforce
    total_workforce: int = 0
    total_active_shifts: int = 0
    
    # Financial
    subscription_tier: str = "standard"  # basic, standard, enterprise
    billing_email: Optional[str] = None
    
    # Management
    franchise_manager_id: Optional[str] = None  # Admin who manages this franchise
    
    # Status
    status: str = "active"  # active, suspended, terminated
    
    # Audit
    created_by: Optional[str] = None
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: Optional[datetime] = None


class SupportTicket(BaseModel):
    """Customer support ticket model"""
    model_config = ConfigDict(extra="ignore")
    
    ticket_id: str = Field(default_factory=lambda: f"ticket_{uuid.uuid4().hex[:12]}")
    
    # Ticket details
    subject: str
    description: str
    category: str  # account, billing, technical, compliance, other
    priority: str = "medium"  # low, medium, high, urgent
    
    # User info
    user_id: str
    user_type: str  # workforce, employer, institution
    user_email: str
    user_name: Optional[str] = None
    
    # Geographic info (for routing)
    province: Optional[str] = None
    zone: Optional[str] = None
    
    # Assignment
    assigned_admin_id: Optional[str] = None
    assigned_date: Optional[str] = None
    
    # Status tracking
    status: str = "open"  # open, in_progress, waiting_response, resolved, closed
    resolution: Optional[str] = None
    
    # Messages
    messages: List[Dict] = []  # {sender_id, sender_type, message, timestamp}
    
    # Timestamps
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_date: Optional[datetime] = None
    resolved_date: Optional[datetime] = None
    
    # SLA tracking
    first_response_time: Optional[int] = None  # minutes
    resolution_time: Optional[int] = None  # minutes


class Notification(BaseModel):
    """Notification model (for compatibility)"""
    model_config = ConfigDict(extra="ignore")
    
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    read: bool = False
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
