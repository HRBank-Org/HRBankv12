"""
Local Development Seed Script for HR Bank

Creates necessary test data for local development/preview environments.
This script is IDEMPOTENT - safe to run multiple times.

IMPORTANT: This does NOT create fake institution partners.
Only creates workforce user profiles for testing the Work Passport feature.

Usage:
    python scripts/seed_local_dev.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import hashlib

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')

def hash_password(password: str) -> str:
    """Simple password hash for test data."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

async def seed_database():
    """Seed the local database with test data."""
    
    print("🌱 HR Bank Local Development Seeder")
    print("=" * 50)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # ========================================
    # 1. Create Sample Workforce User (Alex Johnson)
    # ========================================
    print("\n📋 Checking Alex Johnson profile...")
    
    alex_email = "alex.johnson@email.com"
    alex_user_id = "usr_alex_johnson_demo"
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": alex_email})
    
    if not existing_user:
        print("  Creating user account...")
        user_doc = {
            "user_id": alex_user_id,
            "email": alex_email,
            "password_hash": hash_password("Demo123!"),
            "user_type": "workforce",
            "is_verified": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "preferred_language": "ps"  # Pashto for language demo
        }
        await db.users.insert_one(user_doc)
        print("  ✓ User created")
    else:
        alex_user_id = existing_user.get("user_id", alex_user_id)
        print("  ✓ User already exists")
    
    # Check if workforce profile exists
    existing_profile = await db.workforce_profiles.find_one({"user_id": alex_user_id})
    
    if not existing_profile:
        print("  Creating workforce profile...")
        profile_doc = {
            "workforce_id": f"wf_{alex_user_id}",
            "user_id": alex_user_id,
            "first_name": "Alex",
            "last_name": "Johnson",
            "email": alex_email,
            "phone": "+1 (416) 555-0123",
            "city": "Toronto",
            "province": "ON",
            "country": "Canada",
            "bio": "Experienced professional with blockchain-verified credentials.",
            "skills": ["Project Management", "Data Analysis", "Team Leadership"],
            "experience_years": 5,
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.workforce_profiles.insert_one(profile_doc)
        print("  ✓ Workforce profile created")
    else:
        print("  ✓ Workforce profile already exists")
    
    # Check if career profile settings exist (for public Work Passport)
    existing_settings = await db.career_profile_settings.find_one({"profile_code": "ALEX2024"})
    
    if not existing_settings:
        print("  Creating Work Passport settings...")
        
        # Get workforce_id
        profile = await db.workforce_profiles.find_one({"user_id": alex_user_id})
        workforce_id = profile.get("workforce_id") if profile else f"wf_{alex_user_id}"
        
        settings_doc = {
            "settings_id": str(uuid.uuid4()),
            "workforce_id": workforce_id,
            "user_id": alex_user_id,
            "profile_code": "ALEX2024",
            "is_public": True,
            "show_email": True,
            "show_phone": False,
            "show_credentials": True,
            "show_experience": True,
            "show_skills": True,
            "custom_url": None,
            "theme": "default",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.career_profile_settings.insert_one(settings_doc)
        print("  ✓ Work Passport settings created (code: ALEX2024)")
    else:
        print("  ✓ Work Passport settings already exist")
    
    # ========================================
    # 2. Create indexes for performance
    # ========================================
    print("\n📊 Creating database indexes...")
    
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.workforce_profiles.create_index("user_id")
        await db.workforce_profiles.create_index("workforce_id")
        await db.career_profile_settings.create_index("profile_code")
        await db.career_profile_settings.create_index("workforce_id")
        await db.institution_directory.create_index("directory_id")
        await db.institution_directory.create_index("province")
        await db.institution_directory.create_index([("institution_name", "text")])
        print("  ✓ Indexes created")
    except Exception as e:
        print(f"  ⚠ Index creation: {e}")
    
    # ========================================
    # 3. Summary
    # ========================================
    print("\n" + "=" * 50)
    print("✅ SEED COMPLETE")
    print("=" * 50)
    print("\nTest Accounts:")
    print(f"  Workforce: {alex_email} / Demo123!")
    print(f"  Work Passport Code: ALEX2024")
    print(f"  Profile URL: /passport/ALEX2024")
    print("\nNOTE: This script does NOT create fake institution partners.")
    print("      Real partnerships must be established through proper channels.")
    
    client.close()

async def main():
    await seed_database()

if __name__ == '__main__':
    asyncio.run(main())
