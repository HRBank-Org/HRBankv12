"""
Create test users for testing the redesigned dashboards
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
import sys
sys.path.append(str(Path(__file__).parent.parent))
from auth.password import hash_password

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'hrbank_db')


async def create_test_users():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔨 Creating test users...")
    print("=" * 60)
    
    # Create employer user
    employer_id = str(uuid4())
    employer_user = {
        "user_id": employer_id,
        "email": "employer@hrbank.ca",
        "password_hash": hash_password("Test123!"),
        "user_type": "employer",
        "verification_status": "verified",
        "email_verified": True,
        "created_at": datetime.now(timezone.utc),
        "profile": {
            "first_name": "John",
            "last_name": "Manager",
            "business_name": "Sample Restaurant Group",
            "company_name": "Sample Restaurant Group"
        }
    }
    
    await db.users.insert_one(employer_user)
    print(f"✅ Created employer user: employer@hrbank.ca / Test123!")
    
    # Create employer profile
    employer_profile = {
        "employer_id": employer_id,
        "user_id": employer_id,
        "business_name": "Sample Restaurant Group",
        "business_type": "Restaurant",
        "first_name": "John",
        "last_name": "Manager",
        "email": "employer@hrbank.ca",
        "phone": "+1234567890",
        "created_at": datetime.now(timezone.utc)
    }
    await db.employer_profiles.insert_one(employer_profile)
    print(f"✅ Created employer profile")
    
    # Create workforce user
    workforce_id = str(uuid4())
    workforce_user = {
        "user_id": workforce_id,
        "email": "worker@hrbank.ca",
        "password_hash": hash_password("Test123!"),
        "user_type": "workforce",
        "verification_status": "verified",
        "email_verified": True,
        "created_at": datetime.now(timezone.utc),
        "profile": {
            "first_name": "Sarah",
            "last_name": "Smith",
            "full_name": "Sarah Smith"
        }
    }
    
    await db.users.insert_one(workforce_user)
    print(f"✅ Created workforce user: worker@hrbank.ca / Test123!")
    
    # Create workforce profile
    workforce_profile = {
        "user_id": workforce_id,
        "workforce_id": workforce_id,
        "first_name": "Sarah",
        "last_name": "Smith",
        "full_name": "Sarah Smith",
        "email": "worker@hrbank.ca",
        "phone": "+1234567890",
        "general_rating_avg": 4.7,
        "total_hours_worked": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.workforce_profiles.insert_one(workforce_profile)
    print(f"✅ Created workforce profile")
    
    print("=" * 60)
    print("🎉 Test users created successfully!")
    print("\n📝 Login Credentials:")
    print("Employer: employer@hrbank.ca / Test123!")
    print("Worker:   worker@hrbank.ca / Test123!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_test_users())
