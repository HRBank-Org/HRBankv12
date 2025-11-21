from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime
from auth.dependencies import get_current_user
from models.admin import Admin, Zone
from passlib.context import CryptContext

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    from server import db
    return db

def require_super_admin(current_user: dict = Depends(get_current_user)):
    """Middleware to require super admin"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    # Check if super admin in admins collection
    # For now, simplified check
    return current_user

# ==================== ZONE MANAGEMENT ====================

@router.get("/zones", response_model=Dict)
async def get_all_zones(
    province: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all geographic zones"""
    query = {"active": True}
    if province:
        query["province"] = province.upper()
    
    zones = await db.zones.find(query, {"_id": 0}).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "zones": zones,
            "total_count": len(zones)
        }
    }

@router.post("/zones", response_model=Dict)
async def create_zone(
    zone_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Create new geographic zone (super admin only)"""
    zone = Zone(
        zone_name=zone_data["zone_name"],
        zone_code=zone_data["zone_code"],
        province=zone_data["province"].upper(),
        cities=zone_data.get("cities", []),
        postal_code_prefixes=zone_data.get("postal_code_prefixes", [])
    )
    
    await db.zones.insert_one(zone.model_dump())
    
    return {
        "success": True,
        "data": {"zone_id": zone.zone_id},
        "message": "Zone created successfully"
    }

@router.post("/zones/initialize-ontario", response_model=Dict)
async def initialize_ontario_zones(
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Initialize default Ontario zones"""
    default_zones = [
        {"zone_name": "Durham Region", "zone_code": "DUR", "province": "ON", 
         "cities": ["Oshawa", "Whitby", "Ajax", "Pickering"], 
         "postal_code_prefixes": ["L1A", "L1B", "L1C", "L1E", "L1G"]},
        {"zone_name": "York Region", "zone_code": "YRK", "province": "ON", 
         "cities": ["Vaughan", "Markham", "Richmond Hill", "Aurora"], 
         "postal_code_prefixes": ["L3P", "L3R", "L4A", "L4B", "L4C"]},
        {"zone_name": "Peel Region", "zone_code": "PEL", "province": "ON", 
         "cities": ["Mississauga", "Brampton", "Caledon"], 
         "postal_code_prefixes": ["L4T", "L4W", "L5A", "L5B", "L5C"]},
        {"zone_name": "Toronto", "zone_code": "TOR", "province": "ON", 
         "cities": ["Toronto"], 
         "postal_code_prefixes": ["M1B", "M1C", "M4A", "M4B", "M5A", "M6A"]},
        {"zone_name": "Halton Region", "zone_code": "HAL", "province": "ON", 
         "cities": ["Oakville", "Burlington", "Milton"], 
         "postal_code_prefixes": ["L6H", "L6J", "L7G", "L7L", "L7M"]}
    ]
    
    created_count = 0
    for zone_data in default_zones:
        # Check if exists
        existing = await db.zones.find_one({"zone_code": zone_data["zone_code"]})
        if not existing:
            zone = Zone(**zone_data)
            await db.zones.insert_one(zone.model_dump())
            created_count += 1
    
    return {
        "success": True,
        "message": f"Created {created_count} zones"
    }

# ==================== ADMIN MANAGEMENT ====================

@router.get("/admins", response_model=Dict)
async def get_all_admins(
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Get all admin users (super admin only)"""
    admins = await db.admins.find({}, {"_id": 0}).to_list(1000)
    
    # Enrich with zone names
    for admin in admins:
        if admin.get("assigned_zones"):
            zones = await db.zones.find(
                {"zone_id": {"$in": admin["assigned_zones"]}},
                {"_id": 0, "zone_name": 1, "zone_code": 1}
            ).to_list(100)
            admin["zone_details"] = zones
    
    return {
        "success": True,
        "data": {
            "admins": admins,
            "total_count": len(admins)
        }
    }

@router.post("/admins", response_model=Dict)
async def create_admin(
    admin_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Create new admin user (super admin only)"""
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": admin_data["email"]})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user account
    user = {
        "user_id": f"user_{admin_data['email'].split('@')[0]}_{datetime.utcnow().timestamp()}",
        "email": admin_data["email"],
        "password_hash": pwd_context.hash(admin_data["password"]),
        "full_name": admin_data["full_name"],
        "user_type": "admin",
        "phone": admin_data.get("phone"),
        "account_status": "active",
        "created_date": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Create admin profile
    admin = Admin(
        user_id=user["user_id"],
        full_name=admin_data["full_name"],
        email=admin_data["email"],
        phone=admin_data.get("phone"),
        role=admin_data.get("role", "admin"),
        is_super_admin=admin_data.get("is_super_admin", False),
        assigned_zones=admin_data.get("assigned_zones", []),
        assigned_provinces=admin_data.get("assigned_provinces", []),
        can_approve_documents=admin_data.get("can_approve_documents", True),
        can_manage_users=admin_data.get("can_manage_users", False),
        can_manage_admins=admin_data.get("can_manage_admins", False),
        can_view_analytics=admin_data.get("can_view_analytics", True),
        created_by=current_user["user_id"]
    )
    
    await db.admins.insert_one(admin.model_dump())
    
    return {
        "success": True,
        "data": {
            "admin_id": admin.admin_id,
            "user_id": user["user_id"]
        },
        "message": "Admin created successfully"
    }

@router.put("/admins/{admin_id}", response_model=Dict)
async def update_admin(
    admin_id: str,
    update_data: dict,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Update admin user (super admin only)"""
    admin = await db.admins.find_one({"admin_id": admin_id})
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    # Update allowed fields
    allowed_updates = {
        "assigned_zones": update_data.get("assigned_zones"),
        "assigned_provinces": update_data.get("assigned_provinces"),
        "can_approve_documents": update_data.get("can_approve_documents"),
        "can_manage_users": update_data.get("can_manage_users"),
        "can_view_analytics": update_data.get("can_view_analytics"),
        "status": update_data.get("status")
    }
    
    # Remove None values
    allowed_updates = {k: v for k, v in allowed_updates.items() if v is not None}
    
    await db.admins.update_one(
        {"admin_id": admin_id},
        {"$set": allowed_updates}
    )
    
    return {
        "success": True,
        "message": "Admin updated successfully"
    }

@router.delete("/admins/{admin_id}", response_model=Dict)
async def delete_admin(
    admin_id: str,
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """Delete/deactivate admin user (super admin only)"""
    admin = await db.admins.find_one({"admin_id": admin_id})
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    # Prevent deleting super admin
    if admin.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete super admin"
        )
    
    # Deactivate instead of delete
    await db.admins.update_one(
        {"admin_id": admin_id},
        {"$set": {"status": "inactive"}}
    )
    
    await db.users.update_one(
        {"user_id": admin["user_id"]},
        {"$set": {"account_status": "inactive"}}
    )
    
    return {
        "success": True,
        "message": "Admin deactivated successfully"
    }

@router.get("/my-profile", response_model=Dict)
async def get_admin_profile(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current admin's profile"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    admin = await db.admins.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin profile not found"
        )
    
    # Get zone details
    if admin.get("assigned_zones"):
        zones = await db.zones.find(
            {"zone_id": {"$in": admin["assigned_zones"]}},
            {"_id": 0}
        ).to_list(100)
        admin["zone_details"] = zones
    
    return {
        "success": True,
        "data": admin
    }

# ==================== ANALYTICS ====================

@router.get("/analytics/platform", response_model=Dict)
async def get_platform_analytics(
    start_date: str = None,
    end_date: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get comprehensive platform analytics for CEO dashboard
    Revenue Model: $1/hour from workforce + $1/hour from employer = $2/hour total
    """
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Parse date filters
    date_filter = {}
    if start_date:
        date_filter["$gte"] = start_date
    if end_date:
        date_filter["$lte"] = end_date
    
    # ===== USER COUNTS =====
    total_workforce = await db.users.count_documents({"user_type": "workforce"})
    total_employers = await db.users.count_documents({"user_type": "employer"})
    total_institutions = await db.users.count_documents({"user_type": "institution"})
    
    active_workforce = await db.users.count_documents({
        "user_type": "workforce",
        "account_status": "active"
    })
    active_employers = await db.users.count_documents({
        "user_type": "employer",
        "account_status": "active"
    })
    active_institutions = await db.users.count_documents({
        "user_type": "institution",
        "account_status": "active"
    })
    
    # ===== SHIFT & HOURS DATA =====
    # Get all completed shifts
    shift_query = {"status": "completed"}
    if date_filter:
        shift_query["end_time"] = date_filter
    
    completed_shifts = await db.shifts.find(shift_query).to_list(None)
    
    # Calculate total hours from completed shifts
    total_hours_worked = 0
    for shift in completed_shifts:
        # Calculate hours if start_time and end_time exist
        if shift.get("start_time") and shift.get("end_time"):
            try:
                start = datetime.fromisoformat(shift["start_time"].replace('Z', '+00:00'))
                end = datetime.fromisoformat(shift["end_time"].replace('Z', '+00:00'))
                duration_hours = (end - start).total_seconds() / 3600
                total_hours_worked += duration_hours
            except:
                # Fallback to shift duration if available
                total_hours_worked += shift.get("duration_hours", 0)
        else:
            total_hours_worked += shift.get("duration_hours", 0)
    
    # Revenue calculation: $2 per hour ($1 from workforce + $1 from employer)
    total_revenue = total_hours_worked * 2
    
    # ===== SHIFT COUNTS =====
    total_shifts_created = await db.shifts.count_documents({})
    total_shifts_completed = len(completed_shifts)
    pending_shifts = await db.shifts.count_documents({"status": "pending"})
    active_shifts = await db.shifts.count_documents({"status": "active"})
    
    # ===== ZONE-BASED ANALYTICS =====
    zones = await db.zones.find({"active": True}, {"_id": 0}).to_list(100)
    zone_analytics = []
    
    for zone in zones:
        zone_id = zone.get("zone_id")
        zone_name = zone.get("name")
        zone_provinces = zone.get("provinces", [])
        
        # Get users in this zone (based on admin assignments or workplace locations)
        # For now, we'll use workplace locations for employers
        zone_workplaces = await db.workplaces.find({
            "province": {"$in": zone_provinces}
        }).to_list(None)
        
        zone_employer_ids = list(set([wp.get("employer_id") for wp in zone_workplaces]))
        zone_employers_count = len(zone_employer_ids)
        
        # Get shifts for this zone
        zone_workplace_ids = [wp.get("workplace_id") for wp in zone_workplaces]
        zone_shifts = await db.shifts.find({
            "workplace_id": {"$in": zone_workplace_ids},
            "status": "completed"
        }).to_list(None)
        
        # Calculate zone hours and revenue
        zone_hours = 0
        for shift in zone_shifts:
            if shift.get("start_time") and shift.get("end_time"):
                try:
                    start = datetime.fromisoformat(shift["start_time"].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(shift["end_time"].replace('Z', '+00:00'))
                    duration_hours = (end - start).total_seconds() / 3600
                    zone_hours += duration_hours
                except:
                    zone_hours += shift.get("duration_hours", 0)
            else:
                zone_hours += shift.get("duration_hours", 0)
        
        zone_revenue = zone_hours * 2
        
        # Get bookings to find workforce in this zone
        zone_bookings = await db.bookings.find({
            "shift_id": {"$in": [s.get("shift_id") for s in zone_shifts]}
        }).to_list(None)
        
        zone_workforce_ids = list(set([b.get("workforce_id") for b in zone_bookings]))
        zone_workforce_count = len(zone_workforce_ids)
        
        # Get detailed user breakdowns for this zone
        # Workforce in zone (based on workplaces they've worked at)
        zone_workforce_active = await db.users.count_documents({
            "user_id": {"$in": zone_workforce_ids},
            "user_type": "workforce",
            "account_status": "active"
        })
        zone_workforce_total = len(zone_workforce_ids)
        
        # Employers in zone (based on workplaces)
        zone_employers_active = await db.users.count_documents({
            "user_id": {"$in": zone_employer_ids},
            "user_type": "employer",
            "account_status": "active"
        })
        
        # New users in last 30 days for this zone
        zone_workforce_new_30d = await db.users.count_documents({
            "user_id": {"$in": zone_workforce_ids},
            "user_type": "workforce",
            "created_date": {"$gte": thirty_days_ago}
        })
        zone_employers_new_30d = await db.users.count_documents({
            "user_id": {"$in": zone_employer_ids},
            "user_type": "employer",
            "created_date": {"$gte": thirty_days_ago}
        })
        
        zone_analytics.append({
            "zone_id": zone_id,
            "zone_name": zone_name,
            "provinces": zone_provinces,
            "revenue": round(zone_revenue, 2),
            "hours_worked": round(zone_hours, 2),
            "total_shifts": len(zone_shifts),
            "workforce": {
                "total": zone_workforce_total,
                "active": zone_workforce_active,
                "new_last_30d": zone_workforce_new_30d
            },
            "employers": {
                "total": zone_employers_count,
                "active": zone_employers_active,
                "new_last_30d": zone_employers_new_30d
            }
        })
    
    # Sort zones by revenue
    zone_analytics.sort(key=lambda x: x["revenue"], reverse=True)
    
    # ===== GROWTH METRICS (Last 30 days) =====
    from datetime import timedelta
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    new_workforce_30d = await db.users.count_documents({
        "user_type": "workforce",
        "created_date": {"$gte": thirty_days_ago}
    })
    new_employers_30d = await db.users.count_documents({
        "user_type": "employer",
        "created_date": {"$gte": thirty_days_ago}
    })
    
    # ===== ENGAGEMENT METRICS =====
    total_bookings = await db.bookings.count_documents({})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    
    completion_rate = (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0
    
    # Average shift duration
    avg_shift_duration = total_hours_worked / total_shifts_completed if total_shifts_completed > 0 else 0
    
    return {
        "success": True,
        "data": {
            "overview": {
                "total_revenue": round(total_revenue, 2),
                "total_hours_worked": round(total_hours_worked, 2),
                "total_shifts_completed": total_shifts_completed,
                "total_shifts_created": total_shifts_created,
                "completion_rate": round(completion_rate, 2)
            },
            "users": {
                "workforce": {
                    "total": total_workforce,
                    "active": active_workforce,
                    "new_last_30d": new_workforce_30d
                },
                "employers": {
                    "total": total_employers,
                    "active": active_employers,
                    "new_last_30d": new_employers_30d
                },
                "institutions": {
                    "total": total_institutions,
                    "active": active_institutions
                }
            },
            "shifts": {
                "total_created": total_shifts_created,
                "completed": total_shifts_completed,
                "pending": pending_shifts,
                "active": active_shifts,
                "avg_duration_hours": round(avg_shift_duration, 2)
            },
            "zones": zone_analytics,
            "top_zones": zone_analytics[:5]  # Top 5 zones by revenue
        }
    }
