"""
Seed 20 Workforce Profiles with Hospitality & Food Service Experience
Linked to Occupation Templates for Match Engine Testing
"""
import asyncio
import os
import sys
sys.path.insert(0, '/app/backend')
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid
from passlib.context import CryptContext
import random

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Canadian cities with coordinates for proximity testing
LOCATIONS = [
    {"city": "Toronto", "province": "ON", "postal_code": "M5H 2N2", "lat": 43.6532, "long": -79.3832},
    {"city": "Mississauga", "province": "ON", "postal_code": "L5B 1M2", "lat": 43.5890, "long": -79.6441},
    {"city": "Vancouver", "province": "BC", "postal_code": "V6B 1A1", "lat": 49.2827, "long": -123.1207},
    {"city": "Burnaby", "province": "BC", "postal_code": "V5H 1X8", "lat": 49.2488, "long": -122.9805},
    {"city": "Calgary", "province": "AB", "postal_code": "T2P 1J9", "lat": 51.0447, "long": -114.0719},
    {"city": "Montreal", "province": "QC", "postal_code": "H3B 4W8", "lat": 45.5017, "long": -73.5673},
    {"city": "Ottawa", "province": "ON", "postal_code": "K1P 1J1", "lat": 45.4215, "long": -75.6972},
    {"city": "Edmonton", "province": "AB", "postal_code": "T5J 2R7", "lat": 53.5461, "long": -113.4938},
]

# Occupation templates (will fetch from DB)
OCCUPATIONS = [
    {"title": "Server", "category": "Food Service", "skills": ["Customer Service", "Food Safety", "POS Systems"], "certs": ["Smart Serve", "Food Handler"]},
    {"title": "Bartender", "category": "Food Service", "skills": ["Mixology", "Customer Service", "Cash Handling"], "certs": ["Smart Serve", "Mixology Certificate"]},
    {"title": "Line Cook", "category": "Food Service", "skills": ["Food Preparation", "Knife Skills", "Kitchen Safety"], "certs": ["Food Handler"]},
    {"title": "Dishwasher", "category": "Food Service", "skills": ["Physical Stamina", "Time Management"], "certs": []},
    {"title": "Host/Hostess", "category": "Food Service", "skills": ["Customer Service", "Communication", "Organization"], "certs": []},
    {"title": "Cashier", "category": "Retail", "skills": ["Cash Handling", "Customer Service", "POS Systems"], "certs": []},
]

FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Cameron", "Avery", "Parker", "Quinn", 
               "Skylar", "Rowan", "Sage", "Dakota", "River", "Phoenix", "Reese", "Blake", "Charlie", "Jamie"]

LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
              "Lee", "Anderson", "Wilson", "Moore", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin"]

async def seed_workforce_profiles():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['hrbank_db']
    
    # Get occupation templates
    templates = await db.occupation_templates.find({"is_active": True}, {"_id": 0}).to_list(100)
    print(f"Found {len(templates)} occupation templates")
    
    if not templates:
        print("No templates found. Please seed occupation templates first.")
        client.close()
        return
    
    # Create template lookup
    template_map = {t['occupation_title']: t for t in templates}
    
    created_count = 0
    
    for i in range(20):
        location = LOCATIONS[i % len(LOCATIONS)]
        first_name = FIRST_NAMES[i]
        last_name = LAST_NAMES[i]
        email = f"{first_name.lower()}.{last_name.lower()}{i}@worker.com"
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            print(f"⏩ Skipping {email} (already exists)")
            continue
        
        # Select random occupation (weighted towards hospitality)
        occ_data = random.choice(OCCUPATIONS)
        
        # Get matching template
        template = template_map.get(occ_data['title'])
        template_id = template['template_id'] if template else None
        
        # Create user
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": pwd_context.hash("Worker123!"),
            "user_type": "workforce",
            "first_name": first_name,
            "last_name": last_name,
            "full_name": f"{first_name} {last_name}",
            "phone": f"+1-416-555-{str(i).zfill(4)}",
            "profile_status": "active",
            "email_verified": True,
            "profile_complete": True,
            "created_date": datetime.utcnow().isoformat(),
            "updated_date": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(user)
        
        # Create workforce profile
        workforce_profile = {
            "workforce_id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "full_name": f"{first_name} {last_name}",
            "phone": user['phone'],
            "phone_verified": True,
            "phone_verified_at": datetime.utcnow(),
            "address": f"{random.randint(100, 9999)} Main St",
            "city": location['city'],
            "province": location['province'],
            "postal_code": location['postal_code'],
            "lat": location['lat'] + random.uniform(-0.1, 0.1),  # Slight variation
            "long": location['long'] + random.uniform(-0.1, 0.1),
            "occupation_count": 1,
            "onboarding_completed": True,
            "profile_completeness": 100,
            "profile_completion": 100,
            "profile_photo_url": "",
            "created_date": datetime.utcnow().isoformat(),
            "updated_date": datetime.utcnow().isoformat()
        }
        await db.workforce_profiles.insert_one(workforce_profile)
        
        # Create occupation profile linked to template
        occupation_id = f"occ_{uuid.uuid4().hex[:12]}"
        occupation_profile = {
            "occupation_id": occupation_id,
            "workforce_id": user_id,
            "occupation_template_id": template_id,  # Link to template
            "occupation_title": occ_data['title'],
            "occupation_category": occ_data['category'],
            "skills": occ_data['skills'],
            "certifications": occ_data['certs'],
            "years_of_experience": random.randint(1, 10),
            "hourly_rate_preference": random.randint(17, 25),
            "active": True,
            "total_shifts_completed": random.randint(10, 200),
            "total_hours_worked": random.randint(100, 2000),
            "general_rating_avg": round(random.uniform(4.0, 5.0), 1),
            "general_rating_count": random.randint(5, 50),
            "skill_rating_avg": round(random.uniform(4.0, 5.0), 1),
            "skill_rating_count": random.randint(5, 50),
            "profile_completeness": 100,
            "created_date": datetime.utcnow(),
            "updated_date": datetime.utcnow().isoformat()
        }
        await db.occupation_profiles.insert_one(occupation_profile)
        
        print(f"✓ Created: {first_name} {last_name} | {occ_data['title']} | {location['city']}, {location['province']}")
        created_count += 1
    
    print(f"\n✅ Created {created_count} workforce profiles with hospitality experience")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_workforce_profiles())
