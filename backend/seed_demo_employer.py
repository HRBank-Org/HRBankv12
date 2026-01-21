#!/usr/bin/env python3
"""
Demo Data Seed Script for HR Bank Production
Run this on your Lightsail server:
  docker exec -it hrbank-backend python3 /app/seed_demo_employer.py

Creates: Windsor Pro Cleaning Services with workers, shifts, attendance, etc.
Login: demo@employer.com / Demo123!
"""

import asyncio
import os
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import random
import uuid

# MongoDB setup
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "hrbank_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo Data Constants
EMPLOYER_EMAIL = "demo@employer.com"
EMPLOYER_PASSWORD = "Demo123!"
COMPANY_NAME = "Windsor Pro Cleaning Services"

WORKPLACES = [
    {
        "name": "Downtown Windsor Office",
        "address": "100 Ouellette Avenue",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N9A 6T3",
        "lat": 42.3171,
        "lng": -83.0364
    },
    {
        "name": "Tecumseh Branch",
        "address": "1234 Tecumseh Rd E",
        "city": "Tecumseh",
        "province": "Ontario",
        "postal_code": "N8N 1L9",
        "lat": 42.3078,
        "lng": -82.9271
    },
    {
        "name": "LaSalle Operations",
        "address": "5950 Malden Road",
        "city": "LaSalle",
        "province": "Ontario",
        "postal_code": "N9H 1S4",
        "lat": 42.2167,
        "lng": -83.0667
    }
]

WORKERS = [
    {"name": "Maria Santos", "email": "maria.santos@email.com", "phone": "+15195551001", "role": "Team Lead", "rate": 24.50},
    {"name": "James Wilson", "email": "james.wilson@email.com", "phone": "+15195551002", "role": "Cleaner", "rate": 18.00},
    {"name": "Priya Patel", "email": "priya.patel@email.com", "phone": "+15195551003", "role": "Cleaner", "rate": 18.00},
    {"name": "Michael Chen", "email": "michael.chen@email.com", "phone": "+15195551004", "role": "Supervisor", "rate": 28.00},
    {"name": "Sarah Johnson", "email": "sarah.j@email.com", "phone": "+15195551005", "role": "Cleaner", "rate": 19.00},
    {"name": "Ahmed Hassan", "email": "ahmed.h@email.com", "phone": "+15195551006", "role": "Team Lead", "rate": 24.50},
    {"name": "Emily Brown", "email": "emily.brown@email.com", "phone": "+15195551007", "role": "Cleaner", "rate": 18.50},
    {"name": "David Kim", "email": "david.kim@email.com", "phone": "+15195551008", "role": "Cleaner", "rate": 18.00},
]

SHIFT_TYPES = ["residential_cleaning", "commercial_cleaning", "deep_clean", "move_in_out"]
CUSTOMERS = ["Smith Residence", "Johnson Family", "Tech Corp Office", "Medical Center", "Restaurant Group", "Retail Store", "Law Firm", "Bank Branch"]


def gen_id(prefix=""):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


async def seed_demo_data():
    print("🚀 Starting HR Bank Demo Data Seed...")
    
    # Check if demo employer already exists
    existing = await db.users.find_one({"email": EMPLOYER_EMAIL})
    if existing:
        print(f"⚠️  Demo employer {EMPLOYER_EMAIL} already exists. Skipping...")
        return
    
    now = datetime.now(timezone.utc)
    
    # 1. Create Employer User
    print("\n1️⃣  Creating employer account...")
    employer_id = gen_id("emp")
    employer_user = {
        "user_id": employer_id,
        "email": EMPLOYER_EMAIL,
        "password_hash": pwd_context.hash(EMPLOYER_PASSWORD),
        "user_type": "employer",
        "status": "active",
        "email_verified": True,
        "created_date": (now - timedelta(days=180)).isoformat(),
        "last_login": now.isoformat()
    }
    await db.users.insert_one(employer_user)
    
    # 2. Create Employer Profile
    print("2️⃣  Creating employer profile...")
    employer_profile = {
        "user_id": employer_id,
        "company_name": COMPANY_NAME,
        "email": EMPLOYER_EMAIL,
        "phone": "+15195550100",
        "industry": "Cleaning Services",
        "company_size": "11-50",
        "address": "100 Ouellette Avenue, Windsor, ON N9A 6T3",
        "city": "Windsor",
        "province": "Ontario",
        "postal_code": "N9A 6T3",
        "website": "https://windsorprocleaning.ca",
        "description": "Professional residential and commercial cleaning services in Windsor-Essex region.",
        "status": "active",
        "onboarding_completed": True,
        "subscription_plan": "professional",
        "created_date": (now - timedelta(days=180)).isoformat()
    }
    await db.employer_profiles.insert_one(employer_profile)
    print(f"   ✅ Created: {COMPANY_NAME}")
    
    # 3. Create Workplaces
    print("\n3️⃣  Creating workplaces...")
    workplace_ids = []
    for wp in WORKPLACES:
        wp_id = gen_id("wp")
        workplace_ids.append(wp_id)
        workplace = {
            "workplace_id": wp_id,
            "employer_id": employer_id,
            "name": wp["name"],
            "address": wp["address"],
            "city": wp["city"],
            "province": wp["province"],
            "postal_code": wp["postal_code"],
            "latitude": wp["lat"],
            "longitude": wp["lng"],
            "geofence_radius": 100,
            "status": "active",
            "created_date": (now - timedelta(days=150)).isoformat()
        }
        await db.workplaces.insert_one(workplace)
        print(f"   ✅ {wp['name']}")
    
    # 4. Create Workers
    print("\n4️⃣  Creating workers...")
    worker_ids = []
    for w in WORKERS:
        worker_id = gen_id("wf")
        worker_ids.append({"id": worker_id, **w})
        
        # User account
        worker_user = {
            "user_id": worker_id,
            "email": w["email"],
            "password_hash": pwd_context.hash("Worker123!"),
            "user_type": "workforce",
            "status": "active",
            "email_verified": True,
            "created_date": (now - timedelta(days=random.randint(30, 150))).isoformat()
        }
        await db.users.insert_one(worker_user)
        
        # Workforce profile
        profile = {
            "user_id": worker_id,
            "full_name": w["name"],
            "email": w["email"],
            "phone": w["phone"],
            "city": "Windsor",
            "province": "Ontario",
            "postal_code": f"N9A {random.randint(1,9)}{random.choice('ABCDEFGH')}{random.randint(1,9)}",
            "skills": ["Cleaning", "Sanitization", "Floor Care", "Window Cleaning"],
            "certifications": ["WHMIS", "First Aid"],
            "availability": {
                "monday": {"available": True, "start": "08:00", "end": "18:00"},
                "tuesday": {"available": True, "start": "08:00", "end": "18:00"},
                "wednesday": {"available": True, "start": "08:00", "end": "18:00"},
                "thursday": {"available": True, "start": "08:00", "end": "18:00"},
                "friday": {"available": True, "start": "08:00", "end": "18:00"},
                "saturday": {"available": random.choice([True, False]), "start": "09:00", "end": "14:00"},
                "sunday": {"available": False}
            },
            "average_rating": round(random.uniform(4.2, 5.0), 1),
            "total_shifts_completed": random.randint(20, 150),
            "status": "active",
            "created_date": (now - timedelta(days=random.randint(30, 150))).isoformat()
        }
        await db.workforce_profiles.insert_one(profile)
        
        # Employment record
        employment = {
            "employment_id": gen_id("emp_rec"),
            "employer_id": employer_id,
            "workforce_id": worker_id,
            "job_title": w["role"],
            "hourly_rate": w["rate"],
            "employment_type": "part_time" if w["role"] == "Cleaner" else "full_time",
            "start_date": (now - timedelta(days=random.randint(30, 150))).strftime("%Y-%m-%d"),
            "status": "active",
            "created_date": (now - timedelta(days=random.randint(30, 150))).isoformat()
        }
        await db.employment_records.insert_one(employment)
        print(f"   ✅ {w['name']} - {w['role']}")
    
    # 5. Create Shifts (past, current, future)
    print("\n5️⃣  Creating shifts...")
    shift_count = 0
    
    for days_offset in range(-30, 15):  # Past 30 days to next 15 days
        date = now + timedelta(days=days_offset)
        if date.weekday() >= 5:  # Skip weekends for simplicity
            continue
        
        # 2-4 shifts per day
        num_shifts = random.randint(2, 4)
        for _ in range(num_shifts):
            worker = random.choice(worker_ids)
            workplace = random.choice(WORKPLACES)
            wp_id = workplace_ids[WORKPLACES.index(workplace)]
            
            start_hour = random.choice([8, 9, 10, 13, 14])
            duration = random.choice([3, 4, 5, 6])
            
            shift_date = date.strftime("%Y-%m-%d")
            start_time = f"{shift_date}T{start_hour:02d}:00:00"
            end_time = f"{shift_date}T{start_hour + duration:02d}:00:00"
            
            # Determine status based on date
            if days_offset < -1:
                status = "completed"
            elif days_offset < 0:
                status = random.choice(["completed", "completed", "no_show"])
            elif days_offset == 0:
                status = random.choice(["scheduled", "in_progress", "completed"])
            else:
                status = "scheduled"
            
            shift_id = gen_id("shift")
            customer = random.choice(CUSTOMERS)
            shift_type = random.choice(SHIFT_TYPES)
            
            shift = {
                "shift_id": shift_id,
                "employer_id": employer_id,
                "workplace_id": wp_id,
                "workforce_id": worker["id"],
                "title": f"{shift_type.replace('_', ' ').title()} - {customer}",
                "description": f"Cleaning service at {customer}",
                "shift_type": "route_based",
                "service_type": shift_type,
                "customer_name": customer,
                "service_address": workplace["address"],
                "service_city": workplace["city"],
                "service_postal_code": workplace["postal_code"],
                "shift_date": shift_date,
                "start_time": start_time,
                "end_time": end_time,
                "duration_hours": duration,
                "hourly_rate": worker["rate"],
                "estimated_pay": round(duration * worker["rate"], 2),
                "status": status,
                "created_date": (date - timedelta(days=7)).isoformat(),
                "updated_date": now.isoformat()
            }
            await db.shifts.insert_one(shift)
            shift_count += 1
            
            # Create attendance for completed shifts
            if status == "completed":
                clock_in_time = date.replace(hour=start_hour, minute=random.randint(0, 5))
                clock_out_time = date.replace(hour=start_hour + duration, minute=random.randint(0, 10))
                
                attendance = {
                    "attendance_id": gen_id("att"),
                    "shift_id": shift_id,
                    "employer_id": employer_id,
                    "workforce_id": worker["id"],
                    "workplace_id": wp_id,
                    "shift_date": shift_date,
                    "clock_in_time": clock_in_time.isoformat(),
                    "clock_out_time": clock_out_time.isoformat(),
                    "clock_in_location": {"lat": workplace["lat"] + random.uniform(-0.0001, 0.0001), "lng": workplace["lng"] + random.uniform(-0.0001, 0.0001)},
                    "clock_out_location": {"lat": workplace["lat"] + random.uniform(-0.0001, 0.0001), "lng": workplace["lng"] + random.uniform(-0.0001, 0.0001)},
                    "total_hours": round((clock_out_time - clock_in_time).seconds / 3600, 2),
                    "regular_hours": round((clock_out_time - clock_in_time).seconds / 3600, 2),
                    "overtime_hours": 0,
                    "status": "approved",
                    "created_date": clock_in_time.isoformat()
                }
                await db.attendance.insert_one(attendance)
    
    print(f"   ✅ Created {shift_count} shifts with attendance records")
    
    # 6. Create Timesheets
    print("\n6️⃣  Creating timesheets...")
    for worker in worker_ids:
        # Last 4 weeks of timesheets
        for week_offset in range(4):
            week_start = now - timedelta(days=now.weekday() + 7 * week_offset)
            week_end = week_start + timedelta(days=6)
            
            total_hours = round(random.uniform(20, 40), 2)
            total_pay = round(total_hours * worker["rate"], 2)
            
            timesheet = {
                "timesheet_id": gen_id("ts"),
                "employer_id": employer_id,
                "workforce_id": worker["id"],
                "period_start": week_start.strftime("%Y-%m-%d"),
                "period_end": week_end.strftime("%Y-%m-%d"),
                "total_hours": total_hours,
                "regular_hours": min(total_hours, 40),
                "overtime_hours": max(0, total_hours - 40),
                "hourly_rate": worker["rate"],
                "gross_pay": total_pay,
                "status": "approved" if week_offset > 0 else "pending",
                "approved_by": employer_id if week_offset > 0 else None,
                "approved_date": (week_end + timedelta(days=2)).isoformat() if week_offset > 0 else None,
                "created_date": week_end.isoformat()
            }
            await db.timesheets.insert_one(timesheet)
    print(f"   ✅ Created timesheets for {len(worker_ids)} workers")
    
    # 7. Create some work orders (CleanGrid integration demo)
    print("\n7️⃣  Creating sample work orders...")
    for i in range(5):
        order_date = now + timedelta(days=i + 1)
        order = {
            "hrbank_order_id": gen_id("wo"),
            "partner_id": "partner_cleangrid",
            "partner_name": "CleanGrid",
            "external_order_id": f"CG-DEMO-{1000 + i}",
            "franchisee_id": employer_id,
            "franchisee_email": EMPLOYER_EMAIL,
            "franchisee_name": COMPANY_NAME,
            "service_type": random.choice(SHIFT_TYPES),
            "service_name": random.choice(["Deep House Cleaning", "Office Cleaning", "Move-out Clean", "Regular Maintenance"]),
            "scheduled_datetime": order_date.isoformat(),
            "scheduled_date": order_date.strftime("%Y-%m-%d"),
            "time_window_start": f"{random.choice([9, 10, 13, 14])}:00",
            "estimated_duration_minutes": random.choice([120, 180, 240]),
            "service_address": f"{random.randint(100, 9999)} {random.choice(['Main St', 'Oak Ave', 'Riverside Dr', 'University Ave'])}, Windsor, ON",
            "service_postal_code": f"N9A {random.randint(1,9)}{random.choice('ABCDEFGH')}{random.randint(1,9)}",
            "customer_name": f"{random.choice(['John', 'Jane', 'Mike', 'Sarah'])} {random.choice(['Smith', 'Johnson', 'Williams', 'Brown'])}",
            "customer_phone": f"+1519555{random.randint(1000, 9999)}",
            "total_price": round(random.uniform(150, 400), 2),
            "escrow_status": "held",
            "workers_needed": random.randint(1, 2),
            "priority": random.choice(["normal", "normal", "high"]),
            "status": "pending",
            "created_date": now.isoformat(),
            "updated_date": now.isoformat()
        }
        await db.work_orders.insert_one(order)
    print("   ✅ Created 5 pending work orders")
    
    print("\n" + "="*50)
    print("✅ DEMO DATA SEED COMPLETE!")
    print("="*50)
    print(f"\n📧 Employer Login: {EMPLOYER_EMAIL}")
    print(f"🔑 Password: {EMPLOYER_PASSWORD}")
    print(f"\n🏢 Company: {COMPANY_NAME}")
    print(f"📍 Workplaces: {len(WORKPLACES)}")
    print(f"👥 Workers: {len(WORKERS)}")
    print(f"📅 Shifts: {shift_count}")
    print(f"📦 Work Orders: 5 (CleanGrid)")
    print("\n" + "="*50)


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
