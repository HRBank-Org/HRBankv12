"""
Super Admin Routes for HR Bank
==============================
Comprehensive admin management with role-based access control,
franchise management, and regional assignments.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone
from auth.dependencies import get_current_user
from models.admin import (
    Admin, AdminRoleType, AdminPermissions, ROLE_PERMISSIONS,
    Zone, Franchise, SupportTicket
)
from passlib.context import CryptContext
import uuid

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    from server import db
    return db


async def get_admin_user(user_id: str, db) -> Optional[Admin]:
    """Get admin record for a user"""
    admin_data = await db.admins.find_one({"user_id": user_id}, {"_id": 0})
    if admin_data:
        return Admin(**admin_data)
    return None


async def require_permission(permission: str, current_user: dict, db):
    """Check if current user has a specific permission"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    admin = await get_admin_user(current_user["user_id"], db)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin profile not found"
        )
    
    if not admin.has_permission(permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission}"
        )
    
    return admin


def require_super_admin(current_user: dict = Depends(get_current_user)):
    """Middleware to require super admin"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ==================== ROLE MANAGEMENT ====================

@router.get("/roles", response_model=Dict)
async def get_available_roles(
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Get all available admin roles and their default permissions"""
    
    roles = []
    for role_type in AdminRoleType:
        permissions = ROLE_PERMISSIONS.get(role_type, AdminPermissions())
        roles.append({
            "role_type": role_type.value,
            "display_name": role_type.value.replace("_", " ").title(),
            "description": get_role_description(role_type),
            "default_permissions": permissions.model_dump()
        })
    
    return {
        "success": True,
        "data": {
            "roles": roles,
            "total": len(roles)
        }
    }


def get_role_description(role_type: AdminRoleType) -> str:
    """Get human-readable description for each role"""
    descriptions = {
        AdminRoleType.SUPER_ADMIN: "Full administrative access to all system features",
        AdminRoleType.REGIONAL_MANAGER: "Manages users and operations within assigned provinces/regions",
        AdminRoleType.ACCOUNT_ACTIVATOR: "Reviews and activates new user accounts",
        AdminRoleType.CREDENTIALS_REVIEWER: "Reviews and approves workforce credentials and certifications",
        AdminRoleType.CUSTOMER_SERVICE: "Handles customer support tickets and inquiries",
        AdminRoleType.COMPLIANCE_OFFICER: "Reviews compliance documents and ensures regulatory adherence",
        AdminRoleType.FRANCHISE_MANAGER: "Manages franchise operations and multi-location businesses"
    }
    return descriptions.get(role_type, "Admin role")


# ==================== ADMIN USER MANAGEMENT ====================

@router.get("/admins", response_model=Dict)
async def list_admins(
    role: Optional[str] = Query(None, description="Filter by role"),
    province: Optional[str] = Query(None, description="Filter by province"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """List all admin users with filtering and pagination"""
    
    # Check permission
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.is_super_admin and not admin.has_permission("can_edit_admins"):
        # Non-super admins can only see admins in their region
        query = {"assigned_provinces": {"$in": admin.assigned_provinces or []}}
    else:
        query = {}
    
    if role:
        query["role"] = role
    if province:
        query["assigned_provinces"] = province.upper()
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    admins = await db.admins.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.admins.count_documents(query)
    
    return {
        "success": True,
        "data": {
            "admins": admins,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    }


@router.post("/admins", response_model=Dict)
async def create_admin(
    admin_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Create a new admin user with role-based permissions"""
    
    # Verify permission
    creator_admin = await get_admin_user(current_user["user_id"], db)
    if creator_admin and not creator_admin.has_permission("can_create_admins"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot create admins"
        )
    
    # Validate required fields
    required_fields = ["email", "password", "first_name", "last_name", "role"]
    for field in required_fields:
        if field not in admin_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    # Check if email exists
    existing = await db.users.find_one({"email": admin_data["email"]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    role_type = admin_data.get("role", "customer_service")
    try:
        validated_role = AdminRoleType(role_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role_type}. Valid roles: {[r.value for r in AdminRoleType]}"
        )
    
    # Create user account
    user_id = f"admin_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": admin_data["email"],
        "password_hash": pwd_context.hash(admin_data["password"]),
        "first_name": admin_data["first_name"],
        "last_name": admin_data["last_name"],
        "full_name": f"{admin_data['first_name']} {admin_data['last_name']}",
        "user_type": "admin",
        "phone": admin_data.get("phone"),
        "account_status": "active",
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Create admin profile
    admin = Admin(
        user_id=user_id,
        first_name=admin_data["first_name"],
        last_name=admin_data["last_name"],
        full_name=f"{admin_data['first_name']} {admin_data['last_name']}",
        email=admin_data["email"],
        phone=admin_data.get("phone"),
        title=admin_data.get("title"),
        role=validated_role.value,
        role_type=validated_role,
        is_super_admin=admin_data.get("is_super_admin", False) and creator_admin and creator_admin.is_super_admin,
        assigned_provinces=admin_data.get("assigned_provinces", []),
        assigned_zones=admin_data.get("assigned_zones", []),
        assigned_cities=admin_data.get("assigned_cities", []),
        coverage_type=admin_data.get("coverage_type", "regional"),
        custom_permissions=admin_data.get("custom_permissions"),
        created_by=current_user["user_id"]
    )
    
    await db.admins.insert_one(admin.model_dump())
    
    return {
        "success": True,
        "data": {
            "admin_id": admin.admin_id,
            "user_id": user_id,
            "role": admin.role,
            "permissions": admin.get_permissions().model_dump()
        },
        "message": f"Admin created successfully with role: {admin.role}"
    }


@router.get("/admins/{admin_id}", response_model=Dict)
async def get_admin_details(
    admin_id: str,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Get detailed information about an admin"""
    
    admin_data = await db.admins.find_one({"admin_id": admin_id}, {"_id": 0})
    
    if not admin_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    admin = Admin(**admin_data)
    
    # Get activity stats
    actions_count = await db.admin_actions.count_documents({"admin_id": admin_id})
    
    return {
        "success": True,
        "data": {
            "admin": admin_data,
            "effective_permissions": admin.get_permissions().model_dump(),
            "activity_stats": {
                "total_actions": actions_count
            }
        }
    }


@router.put("/admins/{admin_id}/role", response_model=Dict)
async def update_admin_role(
    admin_id: str,
    role_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Update an admin's role and permissions"""
    
    # Verify permission
    updater_admin = await get_admin_user(current_user["user_id"], db)
    if updater_admin and not updater_admin.has_permission("can_assign_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot assign roles"
        )
    
    admin = await db.admins.find_one({"admin_id": admin_id}, {"_id": 0})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    # Validate new role
    new_role = role_data.get("role")
    if new_role:
        try:
            validated_role = AdminRoleType(new_role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {new_role}"
            )
    
    updates = {
        "updated_by": current_user["user_id"],
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    if new_role:
        updates["role"] = validated_role.value
        updates["role_type"] = validated_role.value
    
    if "assigned_provinces" in role_data:
        updates["assigned_provinces"] = [p.upper() for p in role_data["assigned_provinces"]]
    
    if "assigned_zones" in role_data:
        updates["assigned_zones"] = role_data["assigned_zones"]
    
    if "assigned_cities" in role_data:
        updates["assigned_cities"] = role_data["assigned_cities"]
    
    if "coverage_type" in role_data:
        updates["coverage_type"] = role_data["coverage_type"]
    
    if "custom_permissions" in role_data:
        updates["custom_permissions"] = role_data["custom_permissions"]
    
    await db.admins.update_one(
        {"admin_id": admin_id},
        {"$set": updates}
    )
    
    # Log the action
    await db.admin_actions.insert_one({
        "action_id": f"action_{uuid.uuid4().hex[:12]}",
        "admin_id": current_user["user_id"],
        "action_type": "role_update",
        "target_admin_id": admin_id,
        "changes": updates,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Admin role updated successfully"
    }


# ==================== FRANCHISE MANAGEMENT ====================

@router.get("/franchises", response_model=Dict)
async def list_franchises(
    status: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """List all franchises"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_view_franchise_analytics"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot view franchises"
        )
    
    query = {}
    if status:
        query["status"] = status
    if province:
        query["provinces"] = province.upper()
    
    skip = (page - 1) * limit
    
    franchises = await db.franchises.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.franchises.count_documents(query)
    
    return {
        "success": True,
        "data": {
            "franchises": franchises,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.post("/franchises", response_model=Dict)
async def create_franchise(
    franchise_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Create a new franchise"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_create_franchise"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot create franchises"
        )
    
    # Validate required fields
    required = ["franchise_name", "brand_name", "contact_email"]
    for field in required:
        if field not in franchise_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    franchise = Franchise(
        franchise_name=franchise_data["franchise_name"],
        brand_name=franchise_data["brand_name"],
        parent_company=franchise_data.get("parent_company"),
        contact_email=franchise_data["contact_email"],
        contact_phone=franchise_data.get("contact_phone"),
        headquarters_address=franchise_data.get("headquarters_address"),
        provinces=[p.upper() for p in franchise_data.get("provinces", [])],
        zones=franchise_data.get("zones", []),
        subscription_tier=franchise_data.get("subscription_tier", "standard"),
        billing_email=franchise_data.get("billing_email"),
        franchise_manager_id=franchise_data.get("franchise_manager_id"),
        created_by=current_user["user_id"]
    )
    
    await db.franchises.insert_one(franchise.model_dump())
    
    return {
        "success": True,
        "data": {
            "franchise_id": franchise.franchise_id,
            "franchise_name": franchise.franchise_name
        },
        "message": "Franchise created successfully"
    }


@router.post("/franchises/{franchise_id}/locations", response_model=Dict)
async def add_franchise_location(
    franchise_id: str,
    location_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Add an employer location to a franchise"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_edit_franchise"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot edit franchises"
        )
    
    franchise = await db.franchises.find_one({"franchise_id": franchise_id}, {"_id": 0})
    if not franchise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchise not found"
        )
    
    employer_id = location_data.get("employer_id")
    if not employer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="employer_id is required"
        )
    
    # Verify employer exists
    employer = await db.employer_profiles.find_one({"user_id": employer_id}, {"_id": 0})
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer not found"
        )
    
    # Add location to franchise
    location_entry = {
        "employer_id": employer_id,
        "company_name": employer.get("company_name"),
        "city": employer.get("city"),
        "province": employer.get("province"),
        "added_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.franchises.update_one(
        {"franchise_id": franchise_id},
        {
            "$push": {"locations": location_entry},
            "$inc": {"total_locations": 1},
            "$set": {"updated_date": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Link employer to franchise
    await db.employer_profiles.update_one(
        {"user_id": employer_id},
        {"$set": {"franchise_id": franchise_id, "franchise_name": franchise["franchise_name"]}}
    )
    
    return {
        "success": True,
        "data": {"location": location_entry},
        "message": "Location added to franchise"
    }


@router.get("/franchises/{franchise_id}/analytics", response_model=Dict)
async def get_franchise_analytics(
    franchise_id: str,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Get analytics for a franchise"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_view_franchise_analytics"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot view franchise analytics"
        )
    
    franchise = await db.franchises.find_one({"franchise_id": franchise_id}, {"_id": 0})
    if not franchise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchise not found"
        )
    
    # Get employer IDs
    employer_ids = [loc["employer_id"] for loc in franchise.get("locations", [])]
    
    # Calculate stats
    total_workforce = 0
    total_shifts = 0
    total_active_shifts = 0
    
    for employer_id in employer_ids:
        # Workforce count
        workforce_count = await db.employment_relationships.count_documents({
            "employer_id": employer_id,
            "status": "active"
        })
        total_workforce += workforce_count
        
        # Shift counts
        shifts = await db.calendar_shifts.count_documents({"employer_id": employer_id})
        active = await db.calendar_shifts.count_documents({
            "employer_id": employer_id,
            "status": {"$in": ["published", "assigned"]}
        })
        total_shifts += shifts
        total_active_shifts += active
    
    return {
        "success": True,
        "data": {
            "franchise": franchise,
            "analytics": {
                "total_locations": len(employer_ids),
                "total_workforce": total_workforce,
                "total_shifts": total_shifts,
                "total_active_shifts": total_active_shifts,
                "provinces_covered": len(franchise.get("provinces", []))
            }
        }
    }


# ==================== USER ACCOUNT ACTIVATION ====================

@router.get("/pending-activations", response_model=Dict)
async def get_pending_activations(
    user_type: Optional[str] = Query(None, description="workforce, employer, institution"),
    province: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Get users pending account activation"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_activate_users"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot view pending activations"
        )
    
    # Build query for pending users
    query = {"profile_status": {"$in": ["pending", "under_review"]}}
    
    if user_type:
        query["user_type"] = user_type
    
    # Regional filtering for non-super admins
    if admin and not admin.is_super_admin and admin.assigned_provinces:
        # Need to check province from profiles
        pass  # Would need to join with profile collections
    
    skip = (page - 1) * limit
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    # Enrich with profile data
    enriched_users = []
    for user in users:
        user_data = dict(user)
        
        # Get profile based on type
        profile_collection = {
            "workforce": "workforce_profiles",
            "employer": "employer_profiles",
            "institution": "institution_profiles"
        }.get(user.get("user_type"))
        
        if profile_collection:
            profile = await db[profile_collection].find_one(
                {"user_id": user["user_id"]},
                {"_id": 0}
            )
            if profile:
                user_data["profile"] = profile
                user_data["province"] = profile.get("province")
                user_data["city"] = profile.get("city")
        
        enriched_users.append(user_data)
    
    return {
        "success": True,
        "data": {
            "pending_users": enriched_users,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.post("/activate-user/{user_id}", response_model=Dict)
async def activate_user_account(
    user_id: str,
    activation_data: dict = None,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Activate a pending user account"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_activate_users"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot activate users"
        )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user status
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "profile_status": "active",
                "activated_by": current_user["user_id"],
                "activated_date": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update profile status
    profile_collection = {
        "workforce": "workforce_profiles",
        "employer": "employer_profiles",
        "institution": "institution_profiles"
    }.get(user.get("user_type"))
    
    if profile_collection:
        await db[profile_collection].update_one(
            {"user_id": user_id},
            {"$set": {"profile_status": "active"}}
        )
    
    # Log action
    await db.admin_actions.insert_one({
        "action_id": f"action_{uuid.uuid4().hex[:12]}",
        "admin_id": current_user["user_id"],
        "action_type": "user_activation",
        "target_user_id": user_id,
        "notes": activation_data.get("notes") if activation_data else None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Create notification for user
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "account_activated",
        "title": "Account Activated",
        "message": "Your HR Bank account has been activated. You can now access all features.",
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"User {user_id} activated successfully"
    }


# ==================== SUPPORT TICKETS ====================

@router.get("/support-tickets", response_model=Dict)
async def list_support_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """List customer support tickets"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_view_support_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot view support tickets"
        )
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if assigned_to_me:
        query["assigned_admin_id"] = current_user["user_id"]
    
    # Regional filtering
    if admin and not admin.is_super_admin and admin.assigned_provinces:
        query["province"] = {"$in": admin.assigned_provinces}
    
    skip = (page - 1) * limit
    
    tickets = await db.support_tickets.find(
        query, {"_id": 0}
    ).sort("created_date", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.support_tickets.count_documents(query)
    
    return {
        "success": True,
        "data": {
            "tickets": tickets,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    }


@router.post("/support-tickets/{ticket_id}/respond", response_model=Dict)
async def respond_to_ticket(
    ticket_id: str,
    response_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Respond to a support ticket"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    if admin and not admin.has_permission("can_respond_to_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: cannot respond to tickets"
        )
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    message = response_data.get("message")
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required"
        )
    
    # Add message to ticket
    new_message = {
        "sender_id": current_user["user_id"],
        "sender_type": "admin",
        "sender_name": f"{admin.first_name} {admin.last_name}" if admin else "Admin",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    updates = {
        "updated_date": datetime.now(timezone.utc).isoformat()
    }
    
    # Update status if provided
    if response_data.get("status"):
        updates["status"] = response_data["status"]
    
    # Assign to self if not assigned
    if not ticket.get("assigned_admin_id"):
        updates["assigned_admin_id"] = current_user["user_id"]
        updates["assigned_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": updates
        }
    )
    
    # Notify user
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": ticket["user_id"],
        "type": "ticket_response",
        "title": f"Response to Ticket #{ticket_id[:8]}",
        "message": f"You have a new response to your support ticket: {ticket['subject'][:50]}...",
        "data": {"ticket_id": ticket_id},
        "read": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Response added successfully"
    }


# ==================== ANALYTICS & DASHBOARD ====================

@router.get("/dashboard", response_model=Dict)
async def get_admin_dashboard(
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Get super admin dashboard data"""
    
    admin = await get_admin_user(current_user["user_id"], db)
    
    # Build regional filter
    regional_filter = {}
    if admin and not admin.is_super_admin and admin.assigned_provinces:
        regional_filter = {"province": {"$in": admin.assigned_provinces}}
    
    # Get counts
    pending_activations = await db.users.count_documents({
        "profile_status": {"$in": ["pending", "under_review"]}
    })
    
    pending_credentials = await db.blockchain_credentials.count_documents({
        "status": "pending_review"
    })
    
    open_tickets = await db.support_tickets.count_documents({
        "status": {"$in": ["open", "in_progress"]}
    })
    
    total_workforce = await db.workforce_profiles.count_documents({"profile_status": "active"})
    total_employers = await db.employer_profiles.count_documents({"profile_status": "active"})
    total_institutions = await db.institution_profiles.count_documents({"verified_status": {"$in": ["verified", "pending"]}})
    
    total_admins = await db.admins.count_documents({"status": "active"})
    total_franchises = await db.franchises.count_documents({"status": "active"})
    
    return {
        "success": True,
        "data": {
            "admin": {
                "admin_id": admin.admin_id if admin else None,
                "role": admin.role if admin else "admin",
                "is_super_admin": admin.is_super_admin if admin else False,
                "assigned_provinces": admin.assigned_provinces if admin else []
            },
            "action_items": {
                "pending_activations": pending_activations,
                "pending_credentials": pending_credentials,
                "open_tickets": open_tickets
            },
            "platform_stats": {
                "total_workforce": total_workforce,
                "total_employers": total_employers,
                "total_institutions": total_institutions,
                "total_admins": total_admins,
                "total_franchises": total_franchises
            }
        }
    }
