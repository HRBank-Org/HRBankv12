"""
Setup realistic data for Loose Goose Bar & Bistro
- 3 workplaces with real Windsor addresses
- 40 workforce profiles with proper occupational profiles and home addresses
- Shifts for week starting Dec 14, 2025
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.append('/app/backend')
from auth.password import hash_password

# MongoDB setup
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client['hrbank_db']

EMPLOYER_ID = "usr_e8e29382551e"

# Real workplace addresses in Windsor/Tecumseh area
WORKPLACES = [
    {
        "workplace_name": "Loose Goose - Tecumseh",
        "workplace_address": "480 Advance Blvd Unit 230, Tecumseh, ON N8N 0B8",
        "coordinates": {"lat": 42.3251, "lng": -82.9107}  # Tecumseh
    },
    {
        "workplace_name": "Loose Goose - Chilver",
        "workplace_address": "624 Chilver Rd Unit 103, Windsor, ON N8Y 2K2",
        "coordinates": {"lat": 42.2891, "lng": -82.9761}  # South Windsor
    },
    {
        "workplace_name": "Loose Goose - Downtown",
        "workplace_address": "126 Ouellette Ave, Windsor, ON N9A 1A2",
        "coordinates": {"lat": 42.3175, "lng": -83.0364}  # Downtown Windsor
    }
]

# Realistic home addresses in Windsor area (within 10km of workplaces)
HOME_ADDRESSES = [
    {"address": "1234 Wyandotte St E, Windsor, ON N8Y 1E4", "lat": 42.3065, "lng": -82.9944},
    {"address": "5678 Tecumseh Rd E, Windsor, ON N8T 1C7", "lat": 42.3156, "lng": -82.9543},
    {"address": "910 Riverside Dr W, Windsor, ON N9A 5K4", "lat": 42.3189, "lng": -83.0445},
    {"address": "2345 Howard Ave, Windsor, ON N8X 3Y4", "lat": 42.2985, "lng": -83.0156},
    {"address": "3456 Walker Rd, Windsor, ON N8W 3R8", "lat": 42.2943, "lng": -82.9678},
    {"address": "4567 Dougall Ave, Windsor, ON N9E 1S4", "lat": 42.2776, "lng": -83.0189},
    {"address": "7890 Lauzon Rd, Windsor, ON N8S 1W5", "lat": 42.2854, "lng": -82.9234},
    {"address": "1122 Jefferson Blvd, Windsor, ON N8X 4S6", "lat": 42.2912, "lng": -83.0234},
    {"address": "3344 Sandwich St, Windsor, ON N9C 1B4", "lat": 42.3234, "lng": -83.0512},
    {"address": "5566 Grand Marais Rd W, Windsor, ON N9E 1E5", "lat": 42.2543, "lng": -82.9876},
]

# Occupation profiles for hospitality/food/janitorial
OCCUPATIONS = [
    {
        "occupation_title": "Bartender",
        "occupation_template": "Bartender",
        "skills": ["Mixology", "Customer Service", "Cash Handling", "Inventory Management", "POS Systems"],
        "certifications": ["Smart Serve Ontario", "Safe Food Handling Certificate"],
        "hourly_rate_preference": 22.0,
        "years_experience": 3
    },
    {
        "occupation_title": "Server",
        "occupation_template": "Server / Waiter / Waitress",
        "skills": ["Customer Service", "Order Taking", "Food Service", "Cash Handling", "Multitasking"],
        "certifications": ["Smart Serve Ontario", "Safe Food Handling Certificate"],
        "hourly_rate_preference": 18.0,
        "years_experience": 2
    },
    {
        "occupation_title": "Chef",
        "occupation_template": "Line Cook",
        "skills": ["Food Preparation", "Menu Planning", "Kitchen Management", "Sanitation", "Time Management"],
        "certifications": ["Safe Food Handling Certificate", "First Aid/CPR"],
        "hourly_rate_preference": 25.0,
        "years_experience": 5
    },
    {
        "occupation_title": "Janitor",
        "occupation_template": "Custodian / Janitor",
        "skills": ["Cleaning", "Sanitation", "Equipment Maintenance", "Chemical Handling", "Floor Care"],
        "certifications": ["WHMIS Certification"],
        "hourly_rate_preference": 17.0,
        "years_experience": 2
    }
]

# First and last names for realistic profiles
FIRST_NAMES = [
    "James", "Maria", "David", "Sarah", "Michael", "Jennifer", "Robert", "Lisa",
    "William", "Emily", "Richard", "Jessica", "Joseph", "Amanda", "Thomas", "Ashley",
    "Christopher", "Melissa", "Daniel", "Michelle", "Matthew", "Stephanie", "Anthony", "Nicole",
    "Mark", "Rebecca", "Donald", "Laura", "Steven", "Karen", "Paul", "Nancy",
    "Andrew", "Betty", "Joshua", "Helen", "Kenneth", "Sandra", "Kevin", "Donna"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
    "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
    "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson"
]

async def update_workplaces():
    """Update the 3 workplaces with real addresses"""
    print("\n📍 Updating Workplaces...")
    
    # Get existing workplaces
    existing = await db.workplaces.find({"employer_id": EMPLOYER_ID}).to_list(100)
    
    for i, workplace_data in enumerate(WORKPLACES):
        if i < len(existing):
            # Update existing workplace
            workplace_id = existing[i]['workplace_id']
            await db.workplaces.update_one(
                {"workplace_id": workplace_id},
                {"$set": {
                    "workplace_name": workplace_data["workplace_name"],
                    "workplace_address": workplace_data["workplace_address"],
                    "coordinates": workplace_data["coordinates"],
                    "workplace_city": "Windsor",
                    "workplace_province": "ON",
                    "workplace_postal_code": workplace_data["workplace_address"].split()[-1]
                }}
            )
            print(f"  ✓ Updated: {workplace_data['workplace_name']}")
        else:
            # Create new workplace
            workplace_id = f"wp_{uuid4().hex[:12]}"
            await db.workplaces.insert_one({
                "workplace_id": workplace_id,
                "employer_id": EMPLOYER_ID,
                "workplace_name": workplace_data["workplace_name"],
                "workplace_address": workplace_data["workplace_address"],
                "coordinates": workplace_data["coordinates"],
                "workplace_city": "Windsor",
                "workplace_province": "ON",
                "workplace_postal_code": workplace_data["workplace_address"].split()[-1],
                "created_at": datetime.utcnow()
            })
            print(f"  ✓ Created: {workplace_data['workplace_name']}")
    
    # Get updated workplaces
    workplaces = await db.workplaces.find({"employer_id": EMPLOYER_ID}).to_list(10)
    return workplaces

async def update_existing_workforce(workplaces):
    """Update existing 20 workforce profiles with proper data"""
    print("\n👥 Updating Existing 20 Workforce Profiles...")
    
    # Get existing workforce profiles
    existing_workforce = await db.workforce_profiles.find({}).limit(20).to_list(20)
    
    for i, worker in enumerate(existing_workforce):
        # Assign occupation (rotate through occupations)
        occupation = OCCUPATIONS[i % len(OCCUPATIONS)]
        
        # Assign home address
        home = HOME_ADDRESSES[i % len(HOME_ADDRESSES)]
        
        # Update user record
        await db.users.update_one(
            {"user_id": worker.get('workforce_id')},
            {"$set": {
                "first_name": worker.get('first_name', FIRST_NAMES[i]),
                "last_name": worker.get('last_name', LAST_NAMES[i]),
                "email": f"{FIRST_NAMES[i].lower()}.{LAST_NAMES[i].lower()}{i}@worker.com"
            }}
        )
        
        # Update workforce profile
        await db.workforce_profiles.update_one(
            {"workforce_id": worker.get('workforce_id')},
            {"$set": {
                "first_name": worker.get('first_name', FIRST_NAMES[i]),
                "last_name": worker.get('last_name', LAST_NAMES[i]),
                "home_address": home["address"],
                "coordinates": {"lat": home["lat"], "lng": home["lng"]},
                "address_locked": True,
                "id_verification_status": "verified",
                "occupation_titles": [occupation["occupation_title"]],
                "employment_status": "available",
                "status": "active"
            }}
        )
        
        # Create/update occupation profile
        occ_profile = {
            "occupation_profile_id": f"occ_{uuid4().hex[:12]}",
            "workforce_id": worker.get('workforce_id'),
            "occupation_title": occupation["occupation_title"],
            "occupation_template": occupation["occupation_template"],
            "occupation_template_id": occupation["occupation_template"],
            "skills": occupation["skills"],
            "certifications": occupation["certifications"],
            "hourly_rate_preference": occupation["hourly_rate_preference"],
            "years_experience": occupation["years_experience"],
            "is_primary": True,
            "status": "active",
            "created_at": datetime.utcnow()
        }
        
        # Delete old occupation profile
        await db.occupation_profiles.delete_many({"workforce_id": worker.get('workforce_id')})
        
        # Insert new one
        await db.occupation_profiles.insert_one(occ_profile)
        
        print(f"  ✓ Updated: {FIRST_NAMES[i]} {LAST_NAMES[i]} - {occupation['occupation_title']}")
    
    return existing_workforce

async def create_new_workforce(workplaces):
    """Create 20 NEW workforce accounts"""
    print("\n✨ Creating 20 New Workforce Accounts...")
    
    created_count = 0
    
    for i in range(20, 40):  # 20-39 for new accounts
        first_name = FIRST_NAMES[i % len(FIRST_NAMES)]
        last_name = LAST_NAMES[i % len(LAST_NAMES)]
        email = f"{first_name.lower()}.{last_name.lower()}{i}@worker.com"
        
        # Check if already exists
        existing = await db.users.find_one({"email": email})
        if existing:
            continue
        
        # Create user account
        user_id = f"wkf_{uuid4().hex[:12]}"
        password_hash = hash_password("Test123!")
        
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": password_hash,
            "user_type": "workforce",
            "first_name": first_name,
            "last_name": last_name,
            "phone": f"+1-519-555-{1000+i:04d}",
            "email_verified": True,
            "profile_status": "active",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(user)
        
        # Assign occupation and home address
        occupation = OCCUPATIONS[i % len(OCCUPATIONS)]
        home = HOME_ADDRESSES[i % len(HOME_ADDRESSES)]
        
        # Create workforce profile
        workforce_profile = {
            "workforce_id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": f"+1-519-555-{1000+i:04d}",
            "home_address": home["address"],
            "coordinates": {"lat": home["lat"], "lng": home["lng"]},
            "address_locked": True,
            "id_verification_status": "verified",
            "occupation_titles": [occupation["occupation_title"]],
            "employment_status": "available",
            "behavior_rating": 4.0 + (i % 10) / 10,  # Random rating 4.0-4.9
            "behavior_rating_count": 5 + (i % 20),
            "profile_photo_url": None,
            "status": "active",
            "created_at": datetime.utcnow()
        }
        await db.workforce_profiles.insert_one(workforce_profile)
        
        # Create occupation profile
        occ_profile = {
            "occupation_profile_id": f"occ_{uuid4().hex[:12]}",
            "workforce_id": user_id,
            "occupation_title": occupation["occupation_title"],
            "occupation_template": occupation["occupation_template"],
            "occupation_template_id": occupation["occupation_template"],
            "skills": occupation["skills"],
            "certifications": occupation["certifications"],
            "hourly_rate_preference": occupation["hourly_rate_preference"],
            "years_experience": occupation["years_experience"],
            "is_primary": True,
            "status": "active",
            "created_at": datetime.utcnow()
        }
        await db.occupation_profiles.insert_one(occ_profile)
        
        created_count += 1
        print(f"  ✓ Created: {first_name} {last_name} - {occupation['occupation_title']}")
    
    print(f"\n✅ Created {created_count} new workforce accounts")

async def delete_old_shifts():
    """Delete all current shifts"""
    print("\n🗑️  Deleting Old Shifts...")
    
    result = await db.shifts.delete_many({"employer_id": EMPLOYER_ID})
    print(f"  ✓ Deleted {result.deleted_count} shifts")

async def create_new_shifts(workplaces):
    """Create shifts for week starting Dec 14, 2025 based on schedule"""
    print("\n📅 Creating New Shifts for Week of Dec 14...")
    
    # Schedule from image:
    # Friday: 11am-1am (14 hours)
    # Saturday: 11am-1am (14 hours)
    # Sunday: 11am-12am (13 hours)
    # Monday: 11am-12am (13 hours)
    # Tuesday: 11am-12am (13 hours)
    # Wednesday: 11am-12am (13 hours)
    # Thursday: 11am-12am (13 hours)
    
    schedule = [
        # Dec 15-21, 2025 (Sunday-Saturday)
        {"day": "Sunday", "date": "2025-12-14", "start": "11:00", "end": "23:00", "hours": 12},  # 11am-11pm for Sunday
        {"day": "Monday", "date": "2025-12-15", "start": "11:00", "end": "00:00", "hours": 13},
        {"day": "Tuesday", "date": "2025-12-16", "start": "11:00", "end": "00:00", "hours": 13},
        {"day": "Wednesday", "date": "2025-12-17", "start": "11:00", "end": "00:00", "hours": 13},
        {"day": "Thursday", "date": "2025-12-18", "start": "11:00", "end": "00:00", "hours": 13},
        {"day": "Friday", "date": "2025-12-19", "start": "11:00", "end": "01:00", "hours": 14},
        {"day": "Saturday", "date": "2025-12-20", "start": "11:00", "end": "01:00", "hours": 14},
    ]
    
    # Position types needed per shift
    positions = [
        {"title": "Bartender", "count": 2, "rate": 22.0},
        {"title": "Server", "count": 3, "rate": 18.0},
        {"title": "Chef", "count": 2, "rate": 25.0},
        {"title": "Janitor", "count": 1, "rate": 17.0}
    ]
    
    created_count = 0
    
    for workplace in workplaces:
        for day_schedule in schedule:
            for position in positions:
                # Parse date and time
                date_str = day_schedule["date"]
                start_time = day_schedule["start"]
                end_time = day_schedule["end"]
                
                # Create datetime objects
                start_dt = datetime.strptime(f"{date_str} {start_time}", "%Y-%m-%d %H:%M")
                
                # Handle end time past midnight
                if end_time == "00:00" or end_time == "01:00":
                    end_dt = datetime.strptime(f"{date_str} {end_time}", "%Y-%m-%d %H:%M")
                    if end_time == "00:00":
                        end_dt += timedelta(days=1)
                    elif end_time == "01:00":
                        end_dt += timedelta(days=1)
                else:
                    end_dt = datetime.strptime(f"{date_str} {end_time}", "%Y-%m-%d %H:%M")
                
                shift = {
                    "shift_id": f"shift_{uuid4().hex[:12]}",
                    "employer_id": EMPLOYER_ID,
                    "workplace_id": workplace["workplace_id"],
                    "workplace_name": workplace["workplace_name"],
                    "position_title": position["title"],
                    "hourly_rate": position["rate"],
                    "positions_needed": position["count"],
                    "start_time": start_dt,
                    "end_time": end_dt,
                    "shift_date": start_dt.date().isoformat(),
                    "status": "open",
                    "assigned_workers": [],
                    "created_at": datetime.utcnow(),
                    "notes": f"{day_schedule['day']} {position['title']} shift"
                }
                
                await db.shifts.insert_one(shift)
                created_count += 1
    
    print(f"  ✓ Created {created_count} shifts across 3 locations for week of Dec 14")

async def main():
    print("=" * 60)
    print("🎯 Setting Up Realistic Data for Loose Goose Bar & Bistro")
    print("=" * 60)
    
    # Step 1: Update workplaces
    workplaces = await update_workplaces()
    
    # Step 2: Update existing 20 workforce
    await update_existing_workforce(workplaces)
    
    # Step 3: Create 20 new workforce
    await create_new_workforce(workplaces)
    
    # Step 4: Delete old shifts
    await delete_old_shifts()
    
    # Step 5: Create new shifts
    await create_new_shifts(workplaces)
    
    print("\n" + "=" * 60)
    print("✅ DATA SETUP COMPLETE!")
    print("=" * 60)
    print("\n📊 Summary:")
    print(f"  • 3 Workplaces with real Windsor addresses")
    print(f"  • 40 Workforce profiles (20 updated + 20 new)")
    print(f"  • Occupations: Bartender, Server, Chef, Janitor")
    print(f"  • All with verified Windsor-area home addresses")
    print(f"  • New shifts for week of Dec 14-20, 2025")
    print(f"  • Ready for job matching engine testing!")
    print("\nTest credentials:")
    print(f"  Employer: employer@hrbank.ca / password123")
    print(f"  Worker example: james.smith20@worker.com / Test123!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
