"""
Admin Seeding API - Protected endpoint to seed demo data
=========================================================
This endpoint allows seeding demo data via a secure API call.
Usage: GET /api/admin/seed-demo?key=YOUR_SECRET_KEY

The secret key is set via environment variable: ADMIN_SEED_KEY
Default key for initial setup: HRBank2024Demo!
"""

from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from passlib.context import CryptContext
import os

router = APIRouter(prefix="/admin", tags=["Admin Seeding"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"

def get_db():
    from server import db
    return db

# Secret key for seeding - change this in production!
SEED_SECRET_KEY = os.environ.get("ADMIN_SEED_KEY", "HRBank2024Demo!")


@router.get("/seed-demo")
async def seed_demo_data(
    key: str = Query(..., description="Secret key to authorize seeding")
):
    """
    Seed complete Swan Pizza demo scenario.
    Protected by secret key.
    
    Usage: GET /api/admin/seed-demo?key=HRBank2024Demo!
    """
    
    # Verify secret key
    if key != SEED_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    db = get_db()
    results = {"created": [], "errors": []}
    
    try:
        # ==========================================
        # 1. CREATE EMPLOYER (Swan Pizza Owner)
        # ==========================================
        employer_user_id = generate_id("emp")
        employer_email = "demo@swanpizza.ca"
        
        # Check if already exists
        existing = await db.users.find_one({"email": employer_email})
        if existing:
            employer_user_id = existing.get("user_id")
            await db.users.update_one(
                {"email": employer_email},
                {"$set": {"password_hash": hash_password("Demo123!"), "profile_status": "active", "eula_accepted": True}}
            )
            results["created"].append(f"Updated employer: {employer_email}")
        else:
            employer_user = {
                "user_id": employer_user_id,
                "email": employer_email,
                "password_hash": hash_password("Demo123!"),
                "user_type": "employer",
                "profile_status": "active",
                "email_verified": True,
                "created_date": datetime.now(timezone.utc).isoformat(),
                "last_login_date": None,
                "eula_accepted": True
            }
            await db.users.insert_one(employer_user)
            results["created"].append(f"Created employer: {employer_email}")
        
        # Employer profile
        employer_profile = {
            "employer_id": employer_user_id,
            "company_name": "Swan Pizza",
            "business_type": "Restaurant/Food Service",
            "contact_name": "Marco DiStefano",
            "first_name": "Marco",
            "last_name": "DiStefano",
            "title": "Franchise Owner",
            "email": employer_email,
            "phone": "+1 (519) 555-7890",
            "address": "1250 Tecumseh Road East",
            "city": "Windsor",
            "province": "ON",
            "postal_code": "N8W 1C2",
            "industry": "Food Service",
            "company_size": "11-50",
            "preferred_language": "en",
            "rating_avg": 4.5,
            "rating_count": 12,
            "onboarding_completed": True,
            "profile_completed": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.employer_profiles.update_one(
            {"employer_id": employer_user_id},
            {"$set": employer_profile},
            upsert=True
        )
        
        # ==========================================
        # 2. CREATE WORKPLACES
        # ==========================================
        workplaces = [
            {
                "workplace_id": generate_id("wpl"),
                "employer_id": employer_user_id,
                "workplace_name": "Swan Pizza - Downtown",
                "address": "1250 Tecumseh Road East",
                "city": "Windsor",
                "province": "ON",
                "postal_code": "N8W 1C2",
                "phone": "+1 (519) 555-7890",
                "is_primary": True,
                "status": "active",
                "fsa": "N8W",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "workplace_id": generate_id("wpl"),
                "employer_id": employer_user_id,
                "workplace_name": "Swan Pizza - South Windsor",
                "address": "3200 Dougall Avenue",
                "city": "Windsor",
                "province": "ON",
                "postal_code": "N9E 1S5",
                "phone": "+1 (519) 555-7891",
                "is_primary": False,
                "status": "active",
                "fsa": "N9E",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        for wp in workplaces:
            await db.workplaces.update_one(
                {"employer_id": employer_user_id, "workplace_name": wp["workplace_name"]},
                {"$set": wp},
                upsert=True
            )
        results["created"].append("Created 2 workplaces")
        
        # ==========================================
        # 3. CREATE ROLES
        # ==========================================
        roles = [
            {
                "role_id": generate_id("role"),
                "employer_id": employer_user_id,
                "workplace_id": workplaces[0]["workplace_id"],
                "role_title": "Delivery Driver",
                "description": "Deliver pizzas to customers. Must have valid driver's license and reliable vehicle.",
                "hourly_rate": 17.50,
                "required_certifications": ["G License", "Food Handler Certificate"],
                "skills_required": ["Customer Service", "Navigation", "Time Management"],
                "work_type": "route_based",
                "status": "active"
            },
            {
                "role_id": generate_id("role"),
                "employer_id": employer_user_id,
                "workplace_id": workplaces[0]["workplace_id"],
                "role_title": "Kitchen Staff",
                "description": "Prepare pizzas, manage food prep, maintain kitchen cleanliness.",
                "hourly_rate": 16.75,
                "required_certifications": ["Food Handler Certificate"],
                "skills_required": ["Food Preparation", "Kitchen Safety", "Teamwork"],
                "work_type": "on_site",
                "status": "active"
            },
            {
                "role_id": generate_id("role"),
                "employer_id": employer_user_id,
                "workplace_id": workplaces[0]["workplace_id"],
                "role_title": "Cashier",
                "description": "Handle customer orders, process payments, provide excellent customer service.",
                "hourly_rate": 16.55,
                "required_certifications": [],
                "skills_required": ["Cash Handling", "Customer Service", "POS Systems"],
                "work_type": "on_site",
                "status": "active"
            },
            {
                "role_id": generate_id("role"),
                "employer_id": employer_user_id,
                "workplace_id": workplaces[1]["workplace_id"],
                "role_title": "Shift Supervisor",
                "description": "Oversee daily operations, manage staff, ensure quality standards.",
                "hourly_rate": 21.00,
                "required_certifications": ["Food Handler Certificate", "First Aid"],
                "skills_required": ["Leadership", "Problem Solving", "Communication"],
                "work_type": "on_site",
                "status": "active"
            }
        ]
        
        for role in roles:
            await db.workplace_roles.update_one(
                {"employer_id": employer_user_id, "role_title": role["role_title"]},
                {"$set": role},
                upsert=True
            )
        results["created"].append("Created 4 roles")
        
        # ==========================================
        # 4. CREATE WORKFORCE ACCOUNTS
        # ==========================================
        workers = [
            {"email": "alex.johnson@email.com", "first_name": "Alex", "last_name": "Johnson", "phone": "+1 (519) 555-1001", "position": "Delivery Driver", "rating": 4.8, "language": "en"},
            {"email": "maria.santos@email.com", "first_name": "Maria", "last_name": "Santos", "phone": "+1 (519) 555-1002", "position": "Kitchen Staff", "rating": 4.6, "language": "es"},
            {"email": "james.wilson@email.com", "first_name": "James", "last_name": "Wilson", "phone": "+1 (519) 555-1003", "position": "Cashier", "rating": 4.9, "language": "en"},
            {"email": "priya.sharma@email.com", "first_name": "Priya", "last_name": "Sharma", "phone": "+1 (519) 555-1004", "position": "Shift Supervisor", "rating": 4.7, "language": "hi"},
            {"email": "omar.hassan@email.com", "first_name": "Omar", "last_name": "Hassan", "phone": "+1 (519) 555-1005", "position": "Delivery Driver", "rating": 4.5, "language": "ar"},
        ]
        
        worker_ids = []
        for worker in workers:
            worker_user_id = generate_id("wkr")
            
            existing = await db.users.find_one({"email": worker["email"]})
            if existing:
                worker_user_id = existing.get("user_id")
                await db.users.update_one(
                    {"email": worker["email"]},
                    {"$set": {"password_hash": hash_password("Demo123!"), "profile_status": "active", "eula_accepted": True}}
                )
            else:
                worker_user = {
                    "user_id": worker_user_id,
                    "email": worker["email"],
                    "password_hash": hash_password("Demo123!"),
                    "user_type": "workforce",
                    "profile_status": "active",
                    "email_verified": True,
                    "created_date": datetime.now(timezone.utc).isoformat(),
                    "eula_accepted": True
                }
                await db.users.insert_one(worker_user)
            
            worker_ids.append(worker_user_id)
            
            # Worker profile
            worker_profile = {
                "workforce_id": worker_user_id,
                "user_id": worker_user_id,
                "full_name": f"{worker['first_name']} {worker['last_name']}",
                "first_name": worker["first_name"],
                "last_name": worker["last_name"],
                "email": worker["email"],
                "phone": worker["phone"],
                "address": "Windsor, ON",
                "city": "Windsor",
                "province": "ON",
                "postal_code": "N8W 1A1",
                "preferred_language": worker["language"],
                "general_rating_avg": worker["rating"],
                "general_rating_count": 5,
                "total_shifts_completed": 25,
                "total_hours_worked": 150,
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.workforce_profiles.update_one(
                {"workforce_id": worker_user_id},
                {"$set": worker_profile},
                upsert=True
            )
        
        results["created"].append(f"Created {len(workers)} workforce accounts")
        
        # ==========================================
        # 5. CREATE TEAM ASSIGNMENTS
        # ==========================================
        for i, worker_id in enumerate(worker_ids):
            assignment = {
                "assignment_id": generate_id("asn"),
                "employer_id": employer_user_id,
                "workforce_id": worker_id,
                "workplace_id": workplaces[0]["workplace_id"] if i < 3 else workplaces[1]["workplace_id"],
                "role_id": roles[i % len(roles)]["role_id"],
                "position_title": workers[i]["position"],
                "hourly_rate": roles[i % len(roles)]["hourly_rate"],
                "status": "active",
                "employment_start_date": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.team_assignments.update_one(
                {"employer_id": employer_user_id, "workforce_id": worker_id},
                {"$set": assignment},
                upsert=True
            )
        results["created"].append("Created team assignments")
        
        # ==========================================
        # 6. CREATE JOB POSTINGS
        # ==========================================
        job_postings = [
            {
                "posting_id": generate_id("job"),
                "employer_id": employer_user_id,
                "role_id": roles[0]["role_id"],
                "workplace_id": workplaces[0]["workplace_id"],
                "title": "Delivery Driver - Immediate Start",
                "description": "Join the Swan Pizza team! We're looking for reliable delivery drivers with their own vehicle. Competitive hourly rate plus tips.",
                "hourly_rate": 17.50,
                "work_type": "route_based",
                "employment_type": "part_time",
                "positions_available": 3,
                "workplace_city": "Windsor",
                "workplace_address": "1250 Tecumseh Road East, Windsor, ON",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "posting_id": generate_id("job"),
                "employer_id": employer_user_id,
                "role_id": roles[1]["role_id"],
                "workplace_id": workplaces[0]["workplace_id"],
                "title": "Kitchen Staff - Pizza Maker",
                "description": "Love making pizza? Join our kitchen team! No experience necessary - we'll train you.",
                "hourly_rate": 16.75,
                "work_type": "on_site",
                "employment_type": "full_time",
                "positions_available": 2,
                "workplace_city": "Windsor",
                "workplace_address": "1250 Tecumseh Road East, Windsor, ON",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "posting_id": generate_id("job"),
                "employer_id": employer_user_id,
                "role_id": roles[3]["role_id"],
                "workplace_id": workplaces[1]["workplace_id"],
                "title": "Shift Supervisor - South Windsor",
                "description": "Leadership opportunity at our South Windsor location. Great pay and benefits!",
                "hourly_rate": 21.00,
                "work_type": "on_site",
                "employment_type": "full_time",
                "positions_available": 1,
                "workplace_city": "Windsor",
                "workplace_address": "3200 Dougall Avenue, Windsor, ON",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        for posting in job_postings:
            await db.job_postings.update_one(
                {"employer_id": employer_user_id, "title": posting["title"]},
                {"$set": posting},
                upsert=True
            )
        results["created"].append("Created 3 job postings")
        
        # ==========================================
        # 7. CREATE SHIFTS
        # ==========================================
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        shift_count = 0
        
        for day_offset in range(7):
            shift_date = today + timedelta(days=day_offset)
            
            # Morning shift
            await db.shifts.insert_one({
                "shift_id": generate_id("shft"),
                "employer_id": employer_user_id,
                "workplace_id": workplaces[0]["workplace_id"],
                "shift_date": shift_date.isoformat(),
                "start_time": "09:00",
                "end_time": "15:00",
                "shift_type": "on_site",
                "work_type": "on_site",
                "positions_needed": 3,
                "positions_filled": 2,
                "status": "scheduled",
                "workplace_name": "Swan Pizza - Downtown"
            })
            shift_count += 1
            
            # Evening shift
            await db.shifts.insert_one({
                "shift_id": generate_id("shft"),
                "employer_id": employer_user_id,
                "workplace_id": workplaces[0]["workplace_id"],
                "shift_date": shift_date.isoformat(),
                "start_time": "16:00",
                "end_time": "23:00",
                "shift_type": "on_site",
                "work_type": "on_site",
                "positions_needed": 4,
                "positions_filled": 3,
                "status": "scheduled",
                "workplace_name": "Swan Pizza - Downtown"
            })
            shift_count += 1
        
        results["created"].append(f"Created {shift_count} shifts")
        
        # ==========================================
        # 8. CREATE SAMPLE RATINGS
        # ==========================================
        await db.employer_ratings.update_one(
            {"to_employer_id": employer_user_id},
            {"$set": {
                "rating_id": generate_id("rat"),
                "to_employer_id": employer_user_id,
                "from_workforce_id": worker_ids[0],
                "overall_rating": 5,
                "communication": 5,
                "work_environment": 5,
                "comments": "Great place to work!",
                "created_date": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        results["created"].append("Created sample ratings")
        
        # ==========================================
        # SUCCESS RESPONSE
        # ==========================================
        return {
            "success": True,
            "message": "🍕 Swan Pizza demo scenario seeded successfully!",
            "credentials": {
                "employer": {"email": "demo@swanpizza.ca", "password": "Demo123!"},
                "workers": [
                    {"email": "alex.johnson@email.com", "password": "Demo123!"},
                    {"email": "maria.santos@email.com", "password": "Demo123!"},
                    {"email": "james.wilson@email.com", "password": "Demo123!"},
                    {"email": "priya.sharma@email.com", "password": "Demo123!"},
                    {"email": "omar.hassan@email.com", "password": "Demo123!"}
                ]
            },
            "data_created": results["created"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")


@router.get("/seed-status")
async def check_seed_status(
    key: str = Query(..., description="Secret key to authorize")
):
    """Check if demo data has been seeded"""
    
    if key != SEED_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    db = get_db()
    
    # Check for demo employer
    employer = await db.users.find_one({"email": "demo@swanpizza.ca"})
    
    if employer:
        # Count related data
        workplaces = await db.workplaces.count_documents({"employer_id": employer["user_id"]})
        jobs = await db.job_postings.count_documents({"employer_id": employer["user_id"]})
        
        return {
            "seeded": True,
            "employer_email": "demo@swanpizza.ca",
            "workplaces": workplaces,
            "job_postings": jobs
        }
    
    return {"seeded": False}



@router.get("/seed-december-data")
async def seed_december_data(
    key: str = Query(..., description="Secret key to authorize seeding")
):
    """
    Seed comprehensive December operations data for Swan Pizza.
    Creates shifts, attendance, timesheets, payroll, notifications, and messages.
    """
    if key != SEED_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    try:
        from scripts.seed_december_data import seed_december_data as run_seeder
        result = await run_seeder()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"December data seeding failed: {str(e)}")
