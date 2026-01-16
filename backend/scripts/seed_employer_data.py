"""
Seed script to populate employer account with:
- 10+ active staff members
- Various December 2025 shifts of different types
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import uuid
import random

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'hrbank_db')]

# Staff names for seeding
STAFF_NAMES = [
    {"first": "Sarah", "last": "Mitchell", "email": "sarah.mitchell@email.com"},
    {"first": "Michael", "last": "Chen", "email": "michael.chen@email.com"},
    {"first": "Emily", "last": "Rodriguez", "email": "emily.rodriguez@email.com"},
    {"first": "James", "last": "Thompson", "email": "james.thompson@email.com"},
    {"first": "Jessica", "last": "Williams", "email": "jessica.williams@email.com"},
    {"first": "David", "last": "Brown", "email": "david.brown@email.com"},
    {"first": "Amanda", "last": "Davis", "email": "amanda.davis@email.com"},
    {"first": "Christopher", "last": "Miller", "email": "chris.miller@email.com"},
    {"first": "Ashley", "last": "Garcia", "email": "ashley.garcia@email.com"},
    {"first": "Matthew", "last": "Martinez", "email": "matt.martinez@email.com"},
    {"first": "Nicole", "last": "Anderson", "email": "nicole.anderson@email.com"},
    {"first": "Ryan", "last": "Taylor", "email": "ryan.taylor@email.com"},
]

# Shift types
SHIFT_TYPES = [
    {"name": "Morning Shift", "start": "06:00", "end": "14:00", "color": "#3B82F6"},
    {"name": "Day Shift", "start": "09:00", "end": "17:00", "color": "#10B981"},
    {"name": "Afternoon Shift", "start": "14:00", "end": "22:00", "color": "#F59E0B"},
    {"name": "Night Shift", "start": "22:00", "end": "06:00", "color": "#6366F1"},
    {"name": "Split Shift", "start": "08:00", "end": "12:00", "color": "#EC4899"},
    {"name": "Weekend Special", "start": "10:00", "end": "18:00", "color": "#8B5CF6"},
]

# Occupations/Roles
OCCUPATIONS = [
    "Server", "Bartender", "Host/Hostess", "Line Cook", "Kitchen Helper", 
    "Cashier", "Floor Manager", "Security", "Cleaner", "Delivery Driver"
]

async def get_or_create_employer():
    """Get the test employer or create if not exists"""
    employer = await db.users.find_one({"email": "test@employer.com"})
    if not employer:
        print("Error: test@employer.com not found. Please ensure test users exist.")
        return None, None
    
    employer_profile = await db.employer_profiles.find_one({"user_id": employer["user_id"]})
    return employer, employer_profile

async def get_or_create_workplace(employer_id):
    """Get existing workplace or create one"""
    workplace = await db.workplaces.find_one({"employer_id": employer_id})
    
    if not workplace:
        workplace_id = f"wp_{uuid.uuid4().hex[:12]}"
        workplace = {
            "workplace_id": workplace_id,
            "employer_id": employer_id,
            "name": "Downtown Restaurant & Bar",
            "address": "123 Main Street",
            "city": "Toronto",
            "province": "Ontario",
            "postal_code": "M5V 1A1",
            "phone": "+1 416-555-0123",
            "type": "Restaurant",
            "status": "active",
            "capacity": 50,
            "created_date": datetime.now(timezone.utc).isoformat(),
            "coordinates": {"lat": 43.6532, "lng": -79.3832}
        }
        await db.workplaces.insert_one(workplace)
        print(f"Created workplace: {workplace['name']}")
    else:
        workplace_id = workplace["workplace_id"]
        print(f"Using existing workplace: {workplace.get('name', workplace_id)}")
    
    return workplace

async def create_staff_member(employer_id, staff_info, index):
    """Create a staff member (workforce user + profile + roster assignment)"""
    
    # Check if user already exists
    existing = await db.users.find_one({"email": staff_info["email"]})
    if existing:
        print(f"  Staff {staff_info['first']} {staff_info['last']} already exists")
        return existing["user_id"]
    
    user_id = f"usr_staff_{uuid.uuid4().hex[:8]}"
    workforce_id = f"wf_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Create user
    user = {
        "user_id": user_id,
        "email": staff_info["email"],
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.EHI/prZmT6b6Zy",  # TestPass123!
        "user_type": "workforce",
        "profile_status": "active",
        "email_verified": True,
        "phone_verified": True,
        "created_date": now,
        "last_login": now
    }
    await db.users.insert_one(user)
    
    # Create workforce profile
    occupation = OCCUPATIONS[index % len(OCCUPATIONS)]
    profile = {
        "workforce_id": workforce_id,
        "user_id": user_id,
        "email": staff_info["email"],
        "full_name": f"{staff_info['first']} {staff_info['last']}",
        "first_name": staff_info["first"],
        "last_name": staff_info["last"],
        "phone": f"+1 416-555-{1000 + index:04d}",
        "city": "Toronto",
        "province": "Ontario",
        "profile_status": "active",
        "primary_occupation": occupation,
        "hourly_rate": random.randint(18, 35),
        "availability_status": "available",
        "total_shifts_completed": random.randint(10, 100),
        "rating": round(random.uniform(4.0, 5.0), 1),
        "created_date": now,
        "profile_code": f"WP{uuid.uuid4().hex[:6].upper()}"
    }
    await db.workforce_profiles.insert_one(profile)
    
    print(f"  Created staff: {staff_info['first']} {staff_info['last']} ({occupation})")
    return user_id

async def assign_to_roster(employer_id, workplace_id, worker_user_id, staff_info, index):
    """Assign worker to employer's roster"""
    
    # Check if already assigned
    existing = await db.roster_assignments.find_one({
        "employer_id": employer_id,
        "worker_user_id": worker_user_id
    })
    
    if existing:
        return existing["assignment_id"]
    
    assignment_id = f"roster_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    
    occupation = OCCUPATIONS[index % len(OCCUPATIONS)]
    
    assignment = {
        "assignment_id": assignment_id,
        "employer_id": employer_id,
        "workplace_id": workplace_id,
        "worker_user_id": worker_user_id,
        "worker_name": f"{staff_info['first']} {staff_info['last']}",
        "worker_email": staff_info["email"],
        "role": occupation,
        "status": "active",
        "hourly_rate": random.randint(18, 35),
        "start_date": now,
        "created_date": now
    }
    await db.roster_assignments.insert_one(assignment)
    return assignment_id

async def create_shifts(employer_id, workplace, staff_user_ids, staff_infos):
    """Create December 2025 shifts of various types"""
    
    # December 2025 dates (from Dec 1 to Dec 31)
    year = 2025
    month = 12
    
    shifts_created = 0
    
    # Create shifts for each day of December
    for day in range(1, 32):
        try:
            date = datetime(year, month, day)
        except ValueError:
            continue  # Skip invalid dates
        
        date_str = date.strftime("%Y-%m-%d")
        
        # Create 2-4 shifts per day
        num_shifts = random.randint(2, 4)
        
        for _ in range(num_shifts):
            shift_type = random.choice(SHIFT_TYPES)
            
            # Parse shift times
            start_hour, start_min = map(int, shift_type["start"].split(":"))
            end_hour, end_min = map(int, shift_type["end"].split(":"))
            
            # Create datetime objects
            shift_start = datetime(year, month, day, start_hour, start_min, tzinfo=timezone.utc)
            
            # Handle overnight shifts
            if end_hour < start_hour:
                shift_end = datetime(year, month, day + 1 if day < 31 else 1, end_hour, end_min, tzinfo=timezone.utc)
            else:
                shift_end = datetime(year, month, day, end_hour, end_min, tzinfo=timezone.utc)
            
            # Assign 1-3 workers to this shift
            num_workers = random.randint(1, min(3, len(staff_user_ids)))
            assigned_workers = random.sample(list(zip(staff_user_ids, staff_infos)), num_workers)
            
            shift_id = f"shift_{uuid.uuid4().hex[:8]}"
            now = datetime.now(timezone.utc).isoformat()
            
            # Determine shift status based on date
            today = datetime.now(timezone.utc).date()
            shift_date = date.date()
            
            if shift_date < today:
                status = "completed"
            elif shift_date == today:
                status = "in_progress"
            else:
                status = "scheduled"
            
            shift = {
                "shift_id": shift_id,
                "employer_id": employer_id,
                "workplace_id": workplace["workplace_id"],
                "workplace_name": workplace.get("name", "Downtown Restaurant & Bar"),
                "title": shift_type["name"],
                "shift_type": shift_type["name"].lower().replace(" ", "_"),
                "date": date_str,
                "start_time": shift_start.isoformat(),
                "end_time": shift_end.isoformat(),
                "duration_hours": (end_hour - start_hour) if end_hour > start_hour else (24 - start_hour + end_hour),
                "status": status,
                "color": shift_type["color"],
                "required_workers": num_workers,
                "assigned_workers": [
                    {
                        "user_id": w[0],
                        "name": f"{w[1]['first']} {w[1]['last']}",
                        "email": w[1]["email"],
                        "status": "confirmed" if status != "completed" else "completed",
                        "clock_in": shift_start.isoformat() if status == "completed" else None,
                        "clock_out": shift_end.isoformat() if status == "completed" else None
                    }
                    for w in assigned_workers
                ],
                "notes": f"Regular {shift_type['name']} - December {day}",
                "created_date": now,
                "created_by": employer_id
            }
            
            # Check if similar shift already exists
            existing = await db.shifts.find_one({
                "employer_id": employer_id,
                "date": date_str,
                "title": shift_type["name"]
            })
            
            if not existing:
                await db.shifts.insert_one(shift)
                shifts_created += 1
    
    print(f"Created {shifts_created} shifts for December 2025")
    return shifts_created

async def main():
    print("=" * 60)
    print("Seeding Employer Data: Staff & December Shifts")
    print("=" * 60)
    
    # Get employer
    employer, employer_profile = await get_or_create_employer()
    if not employer:
        return
    
    employer_id = employer["user_id"]
    print(f"\nEmployer: {employer.get('email')} (ID: {employer_id})")
    
    # Get/Create workplace
    workplace = await get_or_create_workplace(employer_id)
    
    # Create staff members
    print(f"\nCreating {len(STAFF_NAMES)} staff members...")
    staff_user_ids = []
    for i, staff_info in enumerate(STAFF_NAMES):
        user_id = await create_staff_member(employer_id, staff_info, i)
        staff_user_ids.append(user_id)
        
        # Assign to roster
        await assign_to_roster(employer_id, workplace["workplace_id"], user_id, staff_info, i)
    
    # Create December shifts
    print(f"\nCreating December 2025 shifts...")
    await create_shifts(employer_id, workplace, staff_user_ids, STAFF_NAMES)
    
    print("\n" + "=" * 60)
    print("SEEDING COMPLETE!")
    print("=" * 60)
    
    # Print summary
    staff_count = await db.roster_assignments.count_documents({"employer_id": employer_id, "status": "active"})
    shift_count = await db.shifts.count_documents({"employer_id": employer_id})
    
    print(f"\nSummary:")
    print(f"  - Active Staff: {staff_count}")
    print(f"  - Total Shifts: {shift_count}")
    print(f"  - Workplace: {workplace.get('name', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(main())
