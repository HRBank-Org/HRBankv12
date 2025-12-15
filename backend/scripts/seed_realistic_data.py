"""
Realistic Data Seeding for Loose Goose Bar - Windsor, ON
Creates data step-by-step to ensure context and validity
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone, timedelta
import sys
sys.path.append(str(Path(__file__).parent.parent))

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'hrbank_db')


# Real Loose Goose Locations in Windsor Essex
LOCATIONS = [
    {
        "name": "The Loose Goose - Downtown Windsor",
        "address": "126 Ouellette Ave",
        "city": "Windsor",
        "province": "ON",
        "postal_code": "N9A 1A2",
        "phone": "(519) 985-6673",
        "coordinates": {"lat": 42.3149, "lng": -83.0364},  # Approximate
        "description": "Riverfront location near Detroit with two floors and large Scotch selection"
    },
    {
        "name": "The Loose Goose - Walkerville",
        "address": "Unit 103 - 624 Chilver Road",
        "city": "Windsor",
        "province": "ON",
        "postal_code": "N8Y 2K2",
        "phone": "(519) 962-0085",
        "coordinates": {"lat": 42.3268, "lng": -82.9658},  # Approximate
        "description": "16 draught taps, many TVs, pub food, 60+ chicken wing options"
    },
    {
        "name": "The Loose Goose - Lakeshore",
        "address": "480 Advance Blvd Unit 230",
        "city": "Lakeshore",
        "province": "ON",
        "postal_code": "N8N 5E9",
        "phone": "(226) 221-0264",
        "coordinates": {"lat": 42.2186, "lng": -82.6489},  # Approximate
        "description": "Lakeshore location serving the community"
    }
]

# Realistic roles for running a bar/restaurant
ROLES = [
    {
        "title": "Server",
        "positions": 8,
        "hourly_rate": 15.50,
        "description": "Take orders, serve food/drinks, provide excellent customer service",
        "requirements": ["Smart Serve certification", "Customer service experience"]
    },
    {
        "title": "Bartender",
        "positions": 4,
        "hourly_rate": 16.50,
        "description": "Mix drinks, serve customers at bar, manage bar inventory",
        "requirements": ["Smart Serve certification", "Mixology experience preferred"]
    },
    {
        "title": "Line Cook",
        "positions": 5,
        "hourly_rate": 18.00,
        "description": "Prepare food items, maintain kitchen standards, follow recipes",
        "requirements": ["Food Handler certification", "Kitchen experience"]
    },
    {
        "title": "Dishwasher",
        "positions": 3,
        "hourly_rate": 15.50,
        "description": "Clean dishes, utensils, maintain kitchen cleanliness",
        "requirements": ["Food Handler certification"]
    },
    {
        "title": "Host/Hostess",
        "positions": 3,
        "hourly_rate": 15.50,
        "description": "Greet customers, manage reservations, seat guests",
        "requirements": ["Customer service skills"]
    },
    {
        "title": "Kitchen Manager",
        "positions": 1,
        "hourly_rate": 22.00,
        "description": "Oversee kitchen operations, manage staff, order supplies",
        "requirements": ["Food Handler certification", "Management experience", "3+ years kitchen experience"]
    },
    {
        "title": "Shift Supervisor",
        "positions": 3,
        "hourly_rate": 20.00,
        "description": "Oversee front-of-house operations, manage staff during shift",
        "requirements": ["Smart Serve certification", "Leadership experience", "2+ years hospitality"]
    }
]

# Worker profiles (realistic Windsor area workforce)
WORKERS = [
    {"first_name": "Emily", "last_name": "Thompson", "email": "emily.t@hrbank.ca", "phone": "+15198881234", "preferred_roles": ["Server", "Host/Hostess"]},
    {"first_name": "Michael", "last_name": "Santos", "email": "michael.s@hrbank.ca", "phone": "+15198881235", "preferred_roles": ["Bartender"]},
    {"first_name": "Jessica", "last_name": "Chen", "email": "jessica.c@hrbank.ca", "phone": "+15198881236", "preferred_roles": ["Server", "Bartender"]},
    {"first_name": "David", "last_name": "Brown", "email": "david.b@hrbank.ca", "phone": "+15198881237", "preferred_roles": ["Line Cook"]},
    {"first_name": "Sarah", "last_name": "Williams", "email": "sarah.w@hrbank.ca", "phone": "+15198881238", "preferred_roles": ["Server"]},
    {"first_name": "Alex", "last_name": "Johnson", "email": "alex.j@hrbank.ca", "phone": "+15198881239", "preferred_roles": ["Line Cook", "Kitchen Manager"]},
    {"first_name": "Maria", "last_name": "Rodriguez", "email": "maria.r@hrbank.ca", "phone": "+15198881240", "preferred_roles": ["Server", "Shift Supervisor"]},
    {"first_name": "James", "last_name": "Lee", "email": "james.l@hrbank.ca", "phone": "+15198881241", "preferred_roles": ["Dishwasher"]},
]


async def seed_data():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("🍺 LOOSE GOOSE BAR - REALISTIC DATA SEEDING")
    print("=" * 80)
    print("\nThis script will create realistic test data for Loose Goose Bar in Windsor, ON")
    print("with real addresses for proper geofencing and job matching functionality.\n")
    
    # Get employer user
    employer = await db.users.find_one({"email": "employer@hrbank.ca"})
    if not employer:
        print("❌ Employer user not found! Run create_test_users.py first.")
        return
    
    employer_id = employer["user_id"]
    
    # Update employer profile with real business info
    print("\n📝 Step 1: Updating employer profile...")
    await db.employer_profiles.update_one(
        {"employer_id": employer_id},
        {"$set": {
            "business_name": "The Loose Goose Resto Pub & Lounge",
            "company_name": "The Loose Goose Resto Pub & Lounge",
            "first_name": "John",
            "last_name": "Manager",
            "industry": "Food & Beverage",
            "business_type": "Restaurant/Bar",
            "description": "Windsor-Essex's premier resto pub with multiple locations, offering great food, drinks, and atmosphere"
        }}
    )
    print("✅ Employer profile updated")
    
    # Create workplaces
    print("\n🏢 Step 2: Creating workplaces (real Loose Goose locations)...")
    workplace_ids = []
    
    for location in LOCATIONS:
        workplace_id = str(uuid4())
        workplace_doc = {
            "workplace_id": workplace_id,
            "employer_id": employer_id,
            "name": location["name"],
            "address": location["address"],
            "city": location["city"],
            "province": location["province"],
            "postal_code": location["postal_code"],
            "country": "Canada",
            "phone": location["phone"],
            "description": location["description"],
            "coordinates": location["coordinates"],
            "geofence_radius": 100,  # 100 meters for clock-in validation
            "created_at": datetime.now(timezone.utc),
            "status": "active"
        }
        
        await db.workplaces.insert_one(workplace_doc)
        workplace_ids.append(workplace_id)
        print(f"✅ Created: {location['name']}")
        print(f"   📍 {location['address']}, {location['city']}, {location['province']} {location['postal_code']}")
    
    print(f"\n✅ Created {len(workplace_ids)} workplaces with REAL addresses")
    
    # Create roles
    print("\n👥 Step 3: Creating roles for each location...")
    role_ids = []
    
    for workplace_id, location in zip(workplace_ids, LOCATIONS):
        for role in ROLES:
            role_id = str(uuid4())
            role_doc = {
                "role_id": role_id,
                "workplace_id": workplace_id,
                "employer_id": employer_id,
                "title": role["title"],
                "positions_available": role["positions"],
                "positions_filled": 0,
                "hourly_rate": role["hourly_rate"],
                "description": role["description"],
                "requirements": role["requirements"],
                "created_at": datetime.now(timezone.utc),
                "status": "active"
            }
            
            await db.workplace_roles.insert_one(role_doc)
            role_ids.append((role_id, workplace_id, role["title"]))
        
        print(f"✅ Created {len(ROLES)} roles for {location['name']}")
    
    print(f"\n✅ Created {len(role_ids)} total role positions across all locations")
    
    print("\n" + "=" * 80)
    print("✅ PHASE 1 COMPLETE - Employer & Workplaces Created")
    print("=" * 80)
    print(f"\nCreated:")
    print(f"  • 1 Employer account (The Loose Goose)")
    print(f"  • 3 Workplaces (real Windsor addresses)")
    print(f"  • {len(role_ids)} Role positions")
    print("\n📋 Next: Run create_workers() to add workforce users")
    print("=" * 80)
    
    client.close()


async def create_workers():
    """Step 2: Create worker accounts"""
    from auth.password import hash_password
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("\n" + "=" * 80)
    print("👷 PHASE 2: Creating Worker Accounts")
    print("=" * 80)
    
    worker_ids = []
    
    for worker in WORKERS:
        user_id = str(uuid4())
        
        # Create user account
        user_doc = {
            "user_id": user_id,
            "email": worker["email"],
            "password_hash": hash_password("Test123!"),
            "user_type": "workforce",
            "verification_status": "verified",
            "email_verified": True,
            "profile_status": "active",
            "needs_onboarding": False,
            "created_at": datetime.now(timezone.utc),
            "profile": {
                "first_name": worker["first_name"],
                "last_name": worker["last_name"],
                "full_name": f"{worker['first_name']} {worker['last_name']}"
            }
        }
        
        await db.users.insert_one(user_doc)
        
        # Create workforce profile
        profile_doc = {
            "user_id": user_id,
            "workforce_id": user_id,
            "first_name": worker["first_name"],
            "last_name": worker["last_name"],
            "full_name": f"{worker['first_name']} {worker['last_name']}",
            "email": worker["email"],
            "phone": worker["phone"],
            "general_rating_avg": 0,
            "total_hours_worked": 0,
            "onboarding_completed": True,
            "verification_status": "verified",
            "profile_status": "active",
            "profile_completeness": 100,
            "created_at": datetime.now(timezone.utc),
            "preferred_roles": worker["preferred_roles"]
        }
        
        await db.workforce_profiles.insert_one(profile_doc)
        worker_ids.append((user_id, worker["email"], worker["first_name"]))
        
        print(f"✅ Created: {worker['first_name']} {worker['last_name']} ({worker['email']})")
    
    print(f"\n✅ Created {len(worker_ids)} worker accounts")
    print("\n📋 All workers can login with password: Test123!")
    print("=" * 80)
    
    client.close()


if __name__ == "__main__":
    print("\n🚀 Starting realistic data seeding...\n")
    asyncio.run(seed_data())
    
    response = input("\n\n🤔 Create worker accounts now? (y/n): ")
    if response.lower() == 'y':
        asyncio.run(create_workers())
        print("\n✅ All done! You can now test with realistic data.")
    else:
        print("\n📝 Run this script again and choose 'y' when ready.")
