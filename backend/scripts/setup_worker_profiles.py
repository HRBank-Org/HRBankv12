"""
Setup complete profiles for test workers
Adds occupation profiles, certifications, availability
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone, time

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'hrbank_db')

# Worker profiles with detailed info
WORKER_PROFILES = [
    {
        "email": "emily.t@hrbank.ca",
        "occupations": [
            {
                "title": "Server / Waiter / Waitress",
                "experience_years": 2,
                "certifications": ["Smart Serve Ontario"]
            }
        ],
        "address": "123 Main St, Windsor, ON N9A 1A1",
        "coordinates": {"lat": 42.3149, "lng": -83.0364}
    },
    {
        "email": "michael.s@hrbank.ca",
        "occupations": [
            {
                "title": "Bartender",
                "experience_years": 3,
                "certifications": ["Smart Serve Ontario", "Mixology Certificate"]
            }
        ],
        "address": "456 Oak Ave, Windsor, ON N9A 2B2",
        "coordinates": {"lat": 42.3168, "lng": -83.0348}
    },
    {
        "email": "jessica.c@hrbank.ca",
        "occupations": [
            {
                "title": "Server / Waiter / Waitress",
                "experience_years": 1.5,
                "certifications": ["Smart Serve Ontario"]
            },
            {
                "title": "Bartender",
                "experience_years": 1,
                "certifications": ["Smart Serve Ontario"]
            }
        ],
        "address": "789 Elm St, Windsor, ON N9A 3C3",
        "coordinates": {"lat": 42.3120, "lng": -83.0390}
    },
    {
        "email": "david.b@hrbank.ca",
        "occupations": [
            {
                "title": "Line Cook",
                "experience_years": 4,
                "certifications": ["Food Handler Certificate", "Safe Food Handling"]
            }
        ],
        "address": "321 Pine Rd, Windsor, ON N9A 4D4",
        "coordinates": {"lat": 42.3200, "lng": -83.0320}
    },
    {
        "email": "sarah.w@hrbank.ca",
        "occupations": [
            {
                "title": "Server / Waiter / Waitress",
                "experience_years": 3,
                "certifications": ["Smart Serve Ontario", "Food Safety"]
            }
        ],
        "address": "654 Maple Dr, Windsor, ON N9A 5E5",
        "coordinates": {"lat": 42.3180, "lng": -83.0300}
    },
    {
        "email": "alex.j@hrbank.ca",
        "occupations": [
            {
                "title": "Line Cook",
                "experience_years": 5,
                "certifications": ["Food Handler Certificate", "Safe Food Handling", "Chef Training"]
            },
            {
                "title": "Kitchen Manager",
                "experience_years": 2,
                "certifications": ["Food Handler Certificate", "Management Certificate"]
            }
        ],
        "address": "987 Birch Ln, Windsor, ON N9A 6F6",
        "coordinates": {"lat": 42.3250, "lng": -83.0280}
    },
    {
        "email": "maria.r@hrbank.ca",
        "occupations": [
            {
                "title": "Server / Waiter / Waitress",
                "experience_years": 4,
                "certifications": ["Smart Serve Ontario", "Customer Service Excellence"]
            },
            {
                "title": "Shift Supervisor",
                "experience_years": 1,
                "certifications": ["Leadership Certificate"]
            }
        ],
        "address": "147 Cedar St, Windsor, ON N9A 7G7",
        "coordinates": {"lat": 42.3100, "lng": -83.0420}
    },
    {
        "email": "james.l@hrbank.ca",
        "occupations": [
            {
                "title": "Dishwasher",
                "experience_years": 1,
                "certifications": ["Food Handler Certificate"]
            }
        ],
        "address": "258 Walnut Ave, Windsor, ON N9A 8H8",
        "coordinates": {"lat": 42.3130, "lng": -83.0380}
    },
    {
        "email": "worker@hrbank.ca",
        "occupations": [
            {
                "title": "Server / Waiter / Waitress",
                "experience_years": 2,
                "certifications": ["Smart Serve Ontario"]
            }
        ],
        "address": "369 Spruce Rd, Windsor, ON N9A 9I9",
        "coordinates": {"lat": 42.3160, "lng": -83.0360}
    }
]

# Standard availability (Monday-Sunday, flexible hours)
STANDARD_AVAILABILITY = [
    {"day": "Monday", "start": "09:00", "end": "22:00", "available": True},
    {"day": "Tuesday", "start": "09:00", "end": "22:00", "available": True},
    {"day": "Wednesday", "start": "09:00", "end": "22:00", "available": True},
    {"day": "Thursday", "start": "09:00", "end": "22:00", "available": True},
    {"day": "Friday", "start": "09:00", "end": "23:00", "available": True},
    {"day": "Saturday", "start": "10:00", "end": "23:00", "available": True},
    {"day": "Sunday", "start": "10:00", "end": "22:00", "available": True}
]


async def setup_profiles():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("🔧 SETTING UP TEST WORKER PROFILES")
    print("=" * 80)
    
    for profile_data in WORKER_PROFILES:
        email = profile_data["email"]
        
        # Get user
        user = await db.users.find_one({"email": email})
        if not user:
            print(f"❌ User not found: {email}")
            continue
        
        user_id = user["user_id"]
        workforce_profile = await db.workforce_profiles.find_one({"user_id": user_id})
        
        print(f"\n👤 {workforce_profile.get('first_name')} {workforce_profile.get('last_name')}")
        
        # Update workforce profile with address
        await db.workforce_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "address": profile_data["address"],
                "coordinates": profile_data["coordinates"],
                "profile_completeness": 100
            }}
        )
        print(f"   ✅ Updated address: {profile_data['address']}")
        
        # Create occupation profiles
        for occ in profile_data["occupations"]:
            occ_id = str(uuid4())
            occ_doc = {
                "occupation_profile_id": occ_id,
                "user_id": user_id,
                "occupation_title": occ["title"],
                "experience_years": occ["experience_years"],
                "certifications": occ["certifications"],
                "status": "active",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            # Check if already exists
            existing = await db.occupation_profiles.find_one({
                "user_id": user_id,
                "occupation_title": occ["title"]
            })
            
            if not existing:
                await db.occupation_profiles.insert_one(occ_doc)
                print(f"   ✅ Added occupation: {occ['title']} ({occ['experience_years']}y exp)")
            else:
                print(f"   ⏭️  Occupation exists: {occ['title']}")
        
        # Set availability
        for avail in STANDARD_AVAILABILITY:
            avail_id = str(uuid4())
            avail_doc = {
                "availability_id": avail_id,
                "user_id": user_id,
                "day_of_week": avail["day"],
                "start_time": avail["start"],
                "end_time": avail["end"],
                "is_available": avail["available"],
                "created_at": datetime.now(timezone.utc)
            }
            
            # Check if exists
            existing = await db.availability_events.find_one({
                "user_id": user_id,
                "day_of_week": avail["day"]
            })
            
            if not existing:
                await db.availability_events.insert_one(avail_doc)
        
        print(f"   ✅ Set availability (Mon-Sun)")
    
    print("\n" + "=" * 80)
    print("✅ ALL PROFILES SETUP COMPLETE")
    print("=" * 80)
    
    # Summary
    occ_count = await db.occupation_profiles.count_documents({})
    avail_count = await db.availability_events.count_documents({})
    
    print(f"\n📊 Summary:")
    print(f"   • Occupation Profiles: {occ_count}")
    print(f"   • Availability Records: {avail_count}")
    print(f"   • Workers with addresses: {len(WORKER_PROFILES)}")
    
    print("\n✅ Test workers are now ready for job matching!")
    print("=" * 80)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(setup_profiles())
