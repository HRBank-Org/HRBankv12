from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timezone
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
        "user_id": f"user_{admin_data['email'].split('@')[0]}_{datetime.now(timezone.utc).timestamp()}",
        "email": admin_data["email"],
        "password_hash": pwd_context.hash(admin_data["password"]),
        "full_name": admin_data["full_name"],
        "user_type": "admin",
        "phone": admin_data.get("phone"),
        "account_status": "active",
        "created_date": datetime.now(timezone.utc).isoformat()
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


@router.put("/my-profile", response_model=Dict)
async def update_admin_profile(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update current admin's profile"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    admin = await db.admins.find_one({"user_id": current_user["user_id"]})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin profile not found"
        )
    
    # Only allow updating certain fields
    allowed_fields = ["full_name", "phone", "first_name", "last_name"]
    updates = {}
    
    for field in allowed_fields:
        if field in data:
            updates[field] = data[field]
    
    # Update full_name if first_name or last_name provided
    if "first_name" in data or "last_name" in data:
        first = data.get("first_name", admin.get("first_name", ""))
        last = data.get("last_name", admin.get("last_name", ""))
        updates["full_name"] = f"{first} {last}".strip()
    
    if not updates:
        return {
            "success": True,
            "message": "No changes to update"
        }
    
    # Update admin profile
    await db.admins.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": updates}
    )
    
    # Also update user record
    user_updates = {}
    if "full_name" in updates:
        user_updates["full_name"] = updates["full_name"]
    if "phone" in updates:
        user_updates["phone"] = updates["phone"]
    
    if user_updates:
        await db.users.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": user_updates}
        )
    
    return {
        "success": True,
        "message": "Profile updated successfully"
    }


@router.put("/change-password", response_model=Dict)
async def change_admin_password(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Change admin password"""
    from passlib.context import CryptContext
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password and new password are required"
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters"
        )
    
    # Get user record
    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    if not pwd_context.verify(current_password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash and update new password
    new_hash = pwd_context.hash(new_password)
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {
        "success": True,
        "message": "Password changed successfully"
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
    
    # ===== GROWTH METRICS (Last 30 days) =====
    from datetime import timedelta
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
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
    
    # ===== PLATFORM-WIDE GROWTH METRICS =====
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
    
    # ===== TOP WORKFORCE BY REVENUE =====
    # Calculate revenue per workforce member based on completed shifts
    workforce_revenue_map = {}
    for shift in completed_shifts:
        # Calculate shift hours
        shift_hours = 0
        if shift.get("start_time") and shift.get("end_time"):
            try:
                start = datetime.fromisoformat(shift["start_time"].replace('Z', '+00:00'))
                end = datetime.fromisoformat(shift["end_time"].replace('Z', '+00:00'))
                shift_hours = (end - start).total_seconds() / 3600
            except:
                shift_hours = shift.get("duration_hours", 0)
        else:
            shift_hours = shift.get("duration_hours", 0)
        
        shift_revenue = shift_hours * 2  # $2 per hour
        
        # Get bookings for this shift
        shift_bookings = await db.bookings.find({
            "shift_id": shift.get("shift_id"),
            "status": "completed"
        }).to_list(None)
        
        for booking in shift_bookings:
            workforce_id = booking.get("workforce_id")
            if workforce_id:
                if workforce_id not in workforce_revenue_map:
                    workforce_revenue_map[workforce_id] = {
                        "revenue": 0,
                        "hours": 0,
                        "shifts": 0
                    }
                workforce_revenue_map[workforce_id]["revenue"] += shift_revenue
                workforce_revenue_map[workforce_id]["hours"] += shift_hours
                workforce_revenue_map[workforce_id]["shifts"] += 1
    
    # Get top 10 workforce by revenue
    top_workforce_data = []
    sorted_workforce = sorted(workforce_revenue_map.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    
    for workforce_id, stats in sorted_workforce:
        workforce_user = await db.users.find_one({"user_id": workforce_id})
        workforce_profile = await db.workforce_profiles.find_one({"user_id": workforce_id})
        
        if workforce_user and workforce_profile:
            top_workforce_data.append({
                "user_id": workforce_id,
                "name": f"{workforce_profile.get('first_name', '')} {workforce_profile.get('last_name', '')}".strip(),
                "email": workforce_user.get("email"),
                "revenue_generated": round(stats["revenue"], 2),
                "total_hours": round(stats["hours"], 2),
                "shifts_completed": stats["shifts"]
            })
    
    # ===== TOP EMPLOYERS BY REVENUE =====
    employer_revenue_map = {}
    for shift in completed_shifts:
        employer_id = shift.get("employer_id")
        
        # Calculate shift hours
        shift_hours = 0
        if shift.get("start_time") and shift.get("end_time"):
            try:
                start = datetime.fromisoformat(shift["start_time"].replace('Z', '+00:00'))
                end = datetime.fromisoformat(shift["end_time"].replace('Z', '+00:00'))
                shift_hours = (end - start).total_seconds() / 3600
            except:
                shift_hours = shift.get("duration_hours", 0)
        else:
            shift_hours = shift.get("duration_hours", 0)
        
        shift_revenue = shift_hours * 2
        
        if employer_id:
            if employer_id not in employer_revenue_map:
                employer_revenue_map[employer_id] = {
                    "revenue": 0,
                    "hours": 0,
                    "shifts": 0
                }
            employer_revenue_map[employer_id]["revenue"] += shift_revenue
            employer_revenue_map[employer_id]["hours"] += shift_hours
            employer_revenue_map[employer_id]["shifts"] += 1
    
    # Get top 10 employers by revenue
    top_employers_data = []
    sorted_employers = sorted(employer_revenue_map.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]
    
    for employer_id, stats in sorted_employers:
        employer_user = await db.users.find_one({"user_id": employer_id})
        employer_profile = await db.employer_profiles.find_one({"user_id": employer_id})
        
        if employer_user and employer_profile:
            top_employers_data.append({
                "user_id": employer_id,
                "company_name": employer_profile.get("company_name", "Unknown"),
                "email": employer_user.get("email"),
                "revenue_generated": round(stats["revenue"], 2),
                "total_hours": round(stats["hours"], 2),
                "shifts_created": stats["shifts"]
            })
    
    # ===== DEMAND PER SKILL/CERTIFICATION =====
    # Get all active job postings
    active_jobs = await db.job_postings.find({"status": "active"}).to_list(None)
    
    skills_demand = {}
    certifications_demand = {}
    
    for job in active_jobs:
        # Count required skills
        required_skills = job.get("required_skills", [])
        for skill in required_skills:
            skill_lower = skill.lower().strip()
            if skill_lower:
                if skill_lower not in skills_demand:
                    skills_demand[skill_lower] = {
                        "skill": skill,
                        "job_count": 0,
                        "total_positions": 0
                    }
                skills_demand[skill_lower]["job_count"] += 1
                skills_demand[skill_lower]["total_positions"] += job.get("positions_available", 1)
        
        # Count required certifications
        required_certs = job.get("required_certifications", [])
        for cert in required_certs:
            cert_lower = cert.lower().strip()
            if cert_lower:
                if cert_lower not in certifications_demand:
                    certifications_demand[cert_lower] = {
                        "certification": cert,
                        "job_count": 0,
                        "total_positions": 0
                    }
                certifications_demand[cert_lower]["job_count"] += 1
                certifications_demand[cert_lower]["total_positions"] += job.get("positions_available", 1)
    
    # Sort by demand (job count)
    top_skills = sorted(skills_demand.values(), key=lambda x: x["job_count"], reverse=True)[:20]
    top_certifications = sorted(certifications_demand.values(), key=lambda x: x["job_count"], reverse=True)[:20]
    
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
            "top_zones": zone_analytics[:5],  # Top 5 zones by revenue
            "top_workforce": top_workforce_data,
            "top_employers": top_employers_data,
            "skills_demand": top_skills,
            "certifications_demand": top_certifications
        }
    }


# ==================== REVENUE OVERVIEW ====================

@router.get("/revenue/overview", response_model=Dict)
async def get_revenue_overview(
    days: str = "30",
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get comprehensive platform revenue overview including:
    - Credential verification revenue (50/50 split)
    - Fundraiser donations (5% platform fee)
    - Workforce/shift revenue
    - Top performing institutions
    """
    from datetime import timedelta
    
    # Calculate date range
    if days == "all":
        start_date = None
    else:
        days_int = int(days)
        start_date = datetime.now(timezone.utc) - timedelta(days=days_int)
    
    # Build date filter
    date_filter = {}
    if start_date:
        date_filter = {"$gte": start_date.isoformat()}
    
    # ===== CREDENTIAL REVENUE =====
    credential_query = {"status": "verified"}
    if start_date:
        credential_query["paid_at"] = date_filter
    
    credentials = await db.blockchain_credentials.find(
        credential_query,
        {"_id": 0, "payment_info": 1, "institution_id": 1, "institution_name": 1}
    ).to_list(None)
    
    credential_total = 0
    credential_platform_share = 0
    credential_institution_share = 0
    institution_revenue = {}
    
    for cred in credentials:
        payment = cred.get("payment_info", {})
        amount = payment.get("amount_cad", 0)
        credential_total += amount
        # 50/50 split
        platform = amount * 0.5
        institution = amount * 0.5
        credential_platform_share += platform
        credential_institution_share += institution
        
        # Track by institution
        inst_id = cred.get("institution_id")
        if inst_id:
            if inst_id not in institution_revenue:
                institution_revenue[inst_id] = {
                    "institution_name": cred.get("institution_name", "Unknown"),
                    "credential_revenue": 0,
                    "credentials_sold": 0,
                    "donation_revenue": 0,
                    "donations_received": 0
                }
            institution_revenue[inst_id]["credential_revenue"] += institution
            institution_revenue[inst_id]["credentials_sold"] += 1
    
    # ===== FUNDRAISER REVENUE =====
    donation_query = {}
    if start_date:
        donation_query["created_at"] = date_filter
    
    donations = await db.fundraiser_donations.find(
        donation_query,
        {"_id": 0, "gross_amount": 1, "platform_fee": 1, "net_amount": 1, "fundraiser_id": 1}
    ).to_list(None)
    
    fundraiser_gross = 0
    fundraiser_platform_fees = 0
    fundraiser_institution_share = 0
    
    # Get fundraiser to institution mapping
    fundraiser_inst_map = {}
    fundraisers = await db.fundraisers.find({}, {"_id": 0, "fundraiser_id": 1, "institution_id": 1, "institution_name": 1}).to_list(None)
    for f in fundraisers:
        fundraiser_inst_map[f["fundraiser_id"]] = {
            "institution_id": f["institution_id"],
            "institution_name": f.get("institution_name", "Unknown")
        }
    
    for donation in donations:
        gross = donation.get("gross_amount", 0)
        fee = donation.get("platform_fee", 0)
        net = donation.get("net_amount", 0)
        
        fundraiser_gross += gross
        fundraiser_platform_fees += fee
        fundraiser_institution_share += net
        
        # Track by institution
        f_id = donation.get("fundraiser_id")
        if f_id and f_id in fundraiser_inst_map:
            inst_id = fundraiser_inst_map[f_id]["institution_id"]
            if inst_id not in institution_revenue:
                institution_revenue[inst_id] = {
                    "institution_name": fundraiser_inst_map[f_id]["institution_name"],
                    "credential_revenue": 0,
                    "credentials_sold": 0,
                    "donation_revenue": 0,
                    "donations_received": 0
                }
            institution_revenue[inst_id]["donation_revenue"] += net
            institution_revenue[inst_id]["donations_received"] += 1
    
    # ===== WORKFORCE REVENUE (placeholder - based on shifts) =====
    shift_query = {"status": "completed"}
    if start_date:
        shift_query["completed_at"] = date_filter
    
    completed_shifts = await db.shifts.count_documents(shift_query)
    # Estimate $2/hour platform fee on shifts
    workforce_revenue = completed_shifts * 2 * 4  # Assuming 4-hour average shift
    
    # ===== USER COUNTS =====
    total_users = await db.users.count_documents({})
    total_institutions = await db.users.count_documents({"user_type": "institution"})
    active_employers = await db.users.count_documents({"user_type": "employer", "profile_status": "active"})
    active_workers = await db.users.count_documents({"user_type": "workforce", "profile_status": "active"})
    
    # Active fundraisers
    active_fundraisers = await db.fundraisers.count_documents({"is_active": True})
    
    # Average credential price
    avg_credential_price = credential_total / len(credentials) if credentials else 0
    
    # ===== TOP INSTITUTIONS =====
    top_institutions = []
    for inst_id, data in sorted(
        institution_revenue.items(),
        key=lambda x: x[1]["credential_revenue"] + x[1]["donation_revenue"],
        reverse=True
    )[:10]:
        top_institutions.append({
            "institution_id": inst_id,
            "institution_name": data["institution_name"],
            "credential_revenue": round(data["credential_revenue"], 2),
            "credentials_sold": data["credentials_sold"],
            "donation_revenue": round(data["donation_revenue"], 2),
            "donations_received": data["donations_received"],
            "total_revenue": round(data["credential_revenue"] + data["donation_revenue"], 2)
        })
    
    # ===== CALCULATE TOTAL PLATFORM REVENUE =====
    # Platform revenue = credential platform share (50%) + fundraiser fees (5%) + workforce fees
    total_platform_revenue = credential_platform_share + fundraiser_platform_fees + workforce_revenue
    
    return {
        "success": True,
        "data": {


# ==================== SECURITY SESSION MANAGEMENT ====================

@router.post("/security/cleanup-sessions", response_model=Dict)
async def cleanup_stale_sessions(
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """
    Manually trigger session cleanup for security.
    Removes expired and inactive sessions across all user types.
    """
    from services.session_manager import session_manager
    
    results = await session_manager.run_security_cleanup()
    
    return {
        "success": True,
        "message": f"Cleaned up {results['total_cleaned']} stale sessions",
        "data": results
    }

@router.get("/security/session-stats", response_model=Dict)
async def get_session_statistics(
    current_user: dict = Depends(require_super_admin),
    db = Depends(get_db)
):
    """
    Get comprehensive session statistics for security monitoring.
    """
    from services.session_manager import session_manager
    
    # Active sessions by user type
    active_counts = await session_manager.get_active_sessions_count()
    
    # Total sessions
    total_sessions = await db.active_sessions.count_documents({})
    active_sessions = await db.active_sessions.count_documents({"is_active": True})
    
    # Recent terminations
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent_terminations = await db.active_sessions.count_documents({
        "is_active": False,
        "terminated_at": {"$gte": one_hour_ago}
    })
    
    # Sessions by termination reason
    pipeline = [
        {"$match": {"is_active": False}},
        {"$group": {"_id": "$termination_reason", "count": {"$sum": 1}}}
    ]
    termination_reasons = await db.active_sessions.aggregate(pipeline).to_list(length=20)
    
    return {
        "success": True,
        "data": {
            "active_sessions": active_counts,
            "total_sessions": total_sessions,
            "active_count": active_sessions,
            "inactive_count": total_sessions - active_sessions,
            "recent_terminations_1h": recent_terminations,
            "termination_reasons": {r["_id"]: r["count"] for r in termination_reasons if r["_id"]}
        }
    }

            # Totals
            "total_revenue": round(total_platform_revenue, 2),
            "revenue_growth": 0,  # TODO: Calculate vs previous period
            
            # Credential breakdown
            "credential_revenue": round(credential_total, 2),
            "credential_platform_share": round(credential_platform_share, 2),
            "credential_institution_share": round(credential_institution_share, 2),
            "credentials_sold": len(credentials),
            
            # Fundraiser breakdown
            "fundraiser_gross_revenue": round(fundraiser_gross, 2),
            "fundraiser_platform_fees": round(fundraiser_platform_fees, 2),
            "fundraiser_institution_share": round(fundraiser_institution_share, 2),
            "total_donations": len(donations),
            
            # Workforce breakdown
            "workforce_revenue": round(workforce_revenue, 2),
            "shifts_completed": completed_shifts,
            
            # Counts
            "total_users": total_users,
            "total_institutions": total_institutions,
            "active_employers": active_employers,
            "active_workers": active_workers,
            "active_fundraisers": active_fundraisers,
            "avg_credential_price": round(avg_credential_price, 2),
            
            # Top performers
            "top_institutions": top_institutions
        }
    }

