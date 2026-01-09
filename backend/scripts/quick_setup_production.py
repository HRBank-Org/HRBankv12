#!/usr/bin/env python3
"""
Quick setup script for HR Bank production database
Creates super admin, demo accounts, and essential data
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Your MongoDB Atlas connection string - REPLACE THIS
MONGO_URL = os.environ.get('MONGO_URL', 'YOUR_MONGODB_ATLAS_CONNECTION_STRING')
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')

async def setup_database():
    """Set up essential data in the database"""
    
    print("=" * 60)
    print("HR Bank - Database Setup")
    print("=" * 60)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Test connection
    try:
        await db.command("ping")
        print("✅ Connected to MongoDB Atlas")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # 1. Create Super Admin
    print("\n📌 Creating Super Admin...")
    existing_admin = await db.admins.find_one({"email": "qnizami@hrbank.ca"})
    if not existing_admin:
        admin = {
            "admin_id": "admin_super_001",
            "email": "qnizami@hrbank.ca",
            "password_hash": pwd_context.hash("Test123!"),
            "full_name": "Q Nizami",
            "is_super_admin": True,
            "is_active": True,
            "permissions": ["all"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.admins.insert_one(admin)
        print("   ✅ Super Admin created: qnizami@hrbank.ca / Test123!")
    else:
        print("   ⏭️  Super Admin already exists")
    
    # 2. Create Demo Employer
    print("\n📌 Creating Demo Employer...")
    existing_employer = await db.employers.find_one({"email": "demo@swanpizza.ca"})
    if not existing_employer:
        employer = {
            "employer_id": "emp_d98ddf3160cf",
            "email": "demo@swanpizza.ca",
            "password_hash": pwd_context.hash("Demo123!"),
            "company_name": "Swan Pizza",
            "contact_name": "John Swan",
            "phone": "+1 (519) 555-0101",
            "is_verified": True,
            "is_active": True,
            "subscription_tier": "professional",
            "onboarding_completed": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.employers.insert_one(employer)
        print("   ✅ Employer created: demo@swanpizza.ca / Demo123!")
    else:
        print("   ⏭️  Demo Employer already exists")
    
    # 3. Create Demo Institution
    print("\n📌 Creating Demo Institution...")
    existing_institution = await db.institutions.find_one({"email": "demo@stclairecollege.ca"})
    if not existing_institution:
        institution = {
            "institution_id": "inst_stclaire_001",
            "email": "demo@stclairecollege.ca",
            "password_hash": pwd_context.hash("Demo123!"),
            "institution_name": "St. Clair College",
            "institution_type": "college",
            "contact_name": "Admin User",
            "phone": "+1 (519) 555-0202",
            "is_verified": True,
            "is_active": True,
            "onboarding_completed": True,
            "stripe_connected": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.institutions.insert_one(institution)
        print("   ✅ Institution created: demo@stclairecollege.ca / Demo123!")
    else:
        print("   ⏭️  Demo Institution already exists")
    
    # 4. Create Demo Workforce User
    print("\n📌 Creating Demo Workforce User...")
    existing_workforce = await db.workforce_profiles.find_one({"email": "alex.johnson@email.com"})
    if not existing_workforce:
        workforce = {
            "user_id": "wf_alex_001",
            "email": "alex.johnson@email.com",
            "password_hash": pwd_context.hash("Demo123!"),
            "full_name": "Alex Johnson",
            "phone": "+1 (519) 555-0303",
            "preferred_language": "en",
            "is_verified": True,
            "is_active": True,
            "onboarding_completed": True,
            "profile_code": "ALEX2024",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.workforce_profiles.insert_one(workforce)
        print("   ✅ Workforce created: alex.johnson@email.com / Demo123!")
    else:
        print("   ⏭️  Demo Workforce already exists")
    
    # 5. Create indexes
    print("\n📌 Creating database indexes...")
    await db.admins.create_index("email", unique=True)
    await db.admins.create_index("admin_id", unique=True)
    await db.employers.create_index("email", unique=True)
    await db.employers.create_index("employer_id", unique=True)
    await db.institutions.create_index("email", unique=True)
    await db.institutions.create_index("institution_id", unique=True)
    await db.workforce_profiles.create_index("email", unique=True)
    await db.workforce_profiles.create_index("user_id", unique=True)
    await db.workforce_profiles.create_index("profile_code", unique=True, sparse=True)
    print("   ✅ Indexes created")
    
    print("\n" + "=" * 60)
    print("✅ DATABASE SETUP COMPLETE!")
    print("=" * 60)
    print("\nTest Accounts:")
    print("-" * 40)
    print("Super Admin:  qnizami@hrbank.ca / Test123!")
    print("Employer:     demo@swanpizza.ca / Demo123!")
    print("Institution:  demo@stclairecollege.ca / Demo123!")
    print("Workforce:    alex.johnson@email.com / Demo123!")
    print("-" * 40)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_database())
