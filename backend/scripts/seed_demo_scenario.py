"""
HR Bank Demo Scenario Seeder
============================
Creates a complete Swan Pizza demo scenario with:
- Employer account (Swan Pizza franchise owner)
- 2 Workplace locations
- Multiple roles (Delivery Driver, Kitchen Staff, Cashier)
- Shifts (Morning, Afternoon, Evening)
- 5 Workforce accounts (staff members)
- Job postings on job board
- Some assignments and completed shifts for ratings demo

Run this script to seed demo data into any HR Bank database.
Usage: python seed_demo_scenario.py
"""

import asyncio
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"

async def seed_demo_scenario():
    """Seed complete Swan Pizza demo scenario"""
    
    # Connect to database
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'hrbank_db')]
    
    print("🍕 HR Bank Demo Scenario Seeder")
    print("=" * 50)
    print(f"Database: {db.name}")
    print("=" * 50)
    
    # ==========================================
    # 1. CREATE EMPLOYER (Swan Pizza Owner)
    # ==========================================
    print("\n📋 Creating Employer Account...")
    
    employer_user_id = generate_id("emp")
    employer_email = "demo@swanpizza.ca"
    
    # Check if already exists
    existing = await db.users.find_one({"email": employer_email})
    if existing:
        print(f"  ⚠️  Employer {employer_email} already exists, updating...")
        employer_user_id = existing.get("user_id")
        await db.users.update_one(
            {"email": employer_email},
            {"$set": {"password_hash": hash_password("Demo123!"), "profile_status": "active"}}
        )
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.employer_profiles.update_one(
        {"employer_id": employer_user_id},
        {"$set": employer_profile},
        upsert=True
    )
    print(f"  ✅ Employer: {employer_email} / Demo123!")
    
    # ==========================================
    # 2. CREATE WORKPLACES (2 Locations)
    # ==========================================
    print("\n🏢 Creating Workplaces...")
    
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
            {"workplace_id": wp["workplace_id"]},
            {"$set": wp},
            upsert=True
        )
        print(f"  ✅ {wp['workplace_name']}")
    
    # ==========================================
    # 3. CREATE ROLES
    # ==========================================
    print("\n👔 Creating Roles...")
    
    roles = [
        {
            "role_id": generate_id("role"),
            "employer_id": employer_user_id,
            "workplace_id": workplaces[0]["workplace_id"],
            "role_title": "Delivery Driver",
            "description": "Deliver pizzas to customers in a timely manner. Must have valid driver's license and reliable vehicle.",
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
            {"role_id": role["role_id"]},
            {"$set": role},
            upsert=True
        )
        print(f"  ✅ {role['role_title']} - ${role['hourly_rate']}/hr")
    
    # ==========================================
    # 4. CREATE WORKFORCE ACCOUNTS (5 Staff)
    # ==========================================
    print("\n👥 Creating Workforce Accounts...")
    
    workers = [
        {
            "email": "alex.johnson@email.com",
            "first_name": "Alex",
            "last_name": "Johnson",
            "phone": "+1 (519) 555-1001",
            "position": "Delivery Driver",
            "rating": 4.8,
            "language": "en",
            "certifications": ["G License", "Food Handler Certificate"],
            "availability": {"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "times": ["afternoon", "evening"]}
        },
        {
            "email": "maria.santos@email.com",
            "first_name": "Maria",
            "last_name": "Santos",
            "phone": "+1 (519) 555-1002",
            "position": "Kitchen Staff",
            "rating": 4.6,
            "language": "es",
            "certifications": ["Food Handler Certificate"],
            "availability": {"days": ["monday", "wednesday", "friday", "saturday"], "times": ["morning", "afternoon"]}
        },
        {
            "email": "james.wilson@email.com",
            "first_name": "James",
            "last_name": "Wilson",
            "phone": "+1 (519) 555-1003",
            "position": "Cashier",
            "rating": 4.9,
            "language": "en",
            "certifications": [],
            "availability": {"days": ["tuesday", "thursday", "saturday", "sunday"], "times": ["afternoon", "evening"]}
        },
        {
            "email": "priya.sharma@email.com",
            "first_name": "Priya",
            "last_name": "Sharma",
            "phone": "+1 (519) 555-1004",
            "position": "Shift Supervisor",
            "rating": 4.7,
            "language": "hi",
            "certifications": ["Food Handler Certificate", "First Aid"],
            "availability": {"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "times": ["morning", "afternoon"]}
        },
        {
            "email": "omar.hassan@email.com",
            "first_name": "Omar",
            "last_name": "Hassan",
            "phone": "+1 (519) 555-1005",
            "position": "Delivery Driver",
            "rating": 4.5,
            "language": "ar",
            "certifications": ["G License", "Food Handler Certificate"],
            "availability": {"days": ["wednesday", "thursday", "friday", "saturday", "sunday"], "times": ["evening"]}
        }
    ]
    
    worker_ids = []
    for worker in workers:
        worker_user_id = generate_id("wkr")
        worker_ids.append(worker_user_id)
        
        # Check if exists
        existing = await db.users.find_one({"email": worker["email"]})
        if existing:
            worker_user_id = existing.get("user_id")
            worker_ids[-1] = worker_user_id
            print(f"  ⚠️  {worker['email']} exists, updating...")
        else:
            # Create user
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
        
        # Create/update profile
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
            "certifications": worker["certifications"],
            "availability_simple": worker["availability"],
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
        print(f"  ✅ {worker['first_name']} {worker['last_name']} ({worker['email']}) - {worker['position']}")
    
    # ==========================================
    # 5. CREATE TEAM ASSIGNMENTS
    # ==========================================
    print("\n🤝 Creating Team Assignments...")
    
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
    print(f"  ✅ {len(worker_ids)} team members assigned")
    
    # ==========================================
    # 6. CREATE JOB POSTINGS
    # ==========================================
    print("\n📢 Creating Job Postings...")
    
    job_postings = [
        {
            "posting_id": generate_id("job"),
            "employer_id": employer_user_id,
            "role_id": roles[0]["role_id"],
            "workplace_id": workplaces[0]["workplace_id"],
            "title": "Delivery Driver - Immediate Start",
            "description": "Join the Swan Pizza team! We're looking for reliable delivery drivers with their own vehicle. Competitive hourly rate plus tips. Flexible scheduling available.",
            "hourly_rate": 17.50,
            "work_type": "route_based",
            "employment_type": "part_time",
            "positions_available": 3,
            "workplace_city": "Windsor",
            "posted_date": datetime.now(timezone.utc).isoformat(),
            "status": "active",
            "requirements": ["G License", "Own Vehicle", "Food Handler Certificate"],
            "benefits": ["Flexible Hours", "Tips", "Free Meals on Shift"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "posting_id": generate_id("job"),
            "employer_id": employer_user_id,
            "role_id": roles[1]["role_id"],
            "workplace_id": workplaces[0]["workplace_id"],
            "title": "Kitchen Staff - Pizza Maker",
            "description": "Love making pizza? Join our kitchen team! No experience necessary - we'll train you. Must be able to work in a fast-paced environment.",
            "hourly_rate": 16.75,
            "work_type": "on_site",
            "employment_type": "full_time",
            "positions_available": 2,
            "workplace_city": "Windsor",
            "posted_date": datetime.now(timezone.utc).isoformat(),
            "status": "active",
            "requirements": ["Food Handler Certificate"],
            "benefits": ["Training Provided", "Free Meals", "Growth Opportunities"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "posting_id": generate_id("job"),
            "employer_id": employer_user_id,
            "role_id": roles[3]["role_id"],
            "workplace_id": workplaces[1]["workplace_id"],
            "title": "Shift Supervisor - South Windsor",
            "description": "Leadership opportunity at our South Windsor location. Looking for an experienced supervisor to manage evening shifts. Great pay and benefits!",
            "hourly_rate": 21.00,
            "work_type": "on_site",
            "employment_type": "full_time",
            "positions_available": 1,
            "workplace_city": "Windsor",
            "posted_date": datetime.now(timezone.utc).isoformat(),
            "status": "active",
            "requirements": ["Food Handler Certificate", "First Aid", "2+ Years Supervisory Experience"],
            "benefits": ["Health Benefits", "Paid Vacation", "Performance Bonuses"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for posting in job_postings:
        await db.job_postings.update_one(
            {"posting_id": posting["posting_id"]},
            {"$set": posting},
            upsert=True
        )
        print(f"  ✅ {posting['title']} - ${posting['hourly_rate']}/hr ({posting['positions_available']} positions)")
    
    # ==========================================
    # 7. CREATE SHIFTS FOR CALENDAR
    # ==========================================
    print("\n📅 Creating Shifts...")
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    shifts = []
    for day_offset in range(7):  # Next 7 days
        shift_date = today + timedelta(days=day_offset)
        
        # Morning shift
        shifts.append({
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
        
        # Evening shift
        shifts.append({
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
    
    for shift in shifts:
        await db.calendar_shifts.insert_one(shift)
    print(f"  ✅ {len(shifts)} shifts created for next 7 days")
    
    # ==========================================
    # 8. CREATE SAMPLE RATINGS
    # ==========================================
    print("\n⭐ Creating Sample Ratings...")
    
    # Employer rating (from workers)
    await db.employer_ratings.insert_one({
        "rating_id": generate_id("rat"),
        "to_employer_id": employer_user_id,
        "from_workforce_id": worker_ids[0],
        "overall_rating": 5,
        "communication": 5,
        "management_support": 4,
        "work_environment": 5,
        "respect_and_inclusivity": 5,
        "pay_and_benefits": 4,
        "workplace_safety": 5,
        "comments": "Great place to work! Management is supportive and the team is fantastic.",
        "created_date": datetime.now(timezone.utc).isoformat()
    })
    
    # Worker ratings (from employer)
    for i, worker_id in enumerate(worker_ids[:3]):
        await db.workforce_ratings.insert_one({
            "rating_id": generate_id("rat"),
            "to_workforce_id": worker_id,
            "from_employer_id": employer_user_id,
            "overall_rating": workers[i]["rating"],
            "reliability": 5,
            "quality_of_work": 4,
            "professionalism": 5,
            "communication": 4,
            "teamwork": 5,
            "comments": f"{workers[i]['first_name']} is a valuable team member!",
            "created_date": datetime.now(timezone.utc).isoformat()
        })
    print(f"  ✅ Sample ratings created")
    
    # ==========================================
    # SUMMARY
    # ==========================================
    print("\n" + "=" * 50)
    print("🎉 DEMO SCENARIO CREATED SUCCESSFULLY!")
    print("=" * 50)
    print("\n📋 LOGIN CREDENTIALS:")
    print("-" * 50)
    print(f"{'Type':<15} {'Email':<30} {'Password':<15}")
    print("-" * 50)
    print(f"{'Employer':<15} {'demo@swanpizza.ca':<30} {'Demo123!':<15}")
    print(f"{'Worker 1':<15} {'alex.johnson@email.com':<30} {'Demo123!':<15}")
    print(f"{'Worker 2':<15} {'maria.santos@email.com':<30} {'Demo123!':<15}")
    print(f"{'Worker 3':<15} {'james.wilson@email.com':<30} {'Demo123!':<15}")
    print(f"{'Worker 4':<15} {'priya.sharma@email.com':<30} {'Demo123!':<15}")
    print(f"{'Worker 5':<15} {'omar.hassan@email.com':<30} {'Demo123!':<15}")
    print("-" * 50)
    print("\n📊 CREATED DATA:")
    print(f"  • 1 Employer (Swan Pizza)")
    print(f"  • 2 Workplace locations")
    print(f"  • 4 Roles (Driver, Kitchen, Cashier, Supervisor)")
    print(f"  • 5 Workforce accounts")
    print(f"  • 3 Job postings on job board")
    print(f"  • 14 Shifts (7 days x 2 shifts)")
    print(f"  • Sample ratings")
    print("\n✅ Ready for demonstration!")
    
    return True


if __name__ == "__main__":
    asyncio.run(seed_demo_scenario())
