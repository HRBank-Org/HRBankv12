import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from datetime import datetime, timezone
import uuid
from passlib.context import CryptContext

# Load env
env_file = Path('/app/backend/.env')
for line in env_file.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, val = line.split('=', 1)
        os.environ[key.strip()] = val.strip().strip('"')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_account():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'hrbank_db')]
    
    email = "qnizami@hrbank.ca"
    temp_password = "Admin123!"  # Temporary password
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    
    if existing:
        print(f"User {email} already exists. Updating password...")
        # Update password
        hashed_password = pwd_context.hash(temp_password)
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "password_hash": hashed_password,
                "user_type": "admin",
                "status": "active",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        user_id = existing.get("user_id")
    else:
        print(f"Creating new admin account for {email}...")
        user_id = f"admin_{uuid.uuid4().hex[:12]}"
        hashed_password = pwd_context.hash(temp_password)
        
        admin_user = {
            "user_id": user_id,
            "email": email,
            "password_hash": hashed_password,
            "full_name": "Q Nizami",
            "user_type": "admin",
            "status": "active",
            "email_verified": True,
            "mfa_enabled": False,
            "role": "super_admin",
            "permissions": [
                "manage_users",
                "manage_employers",
                "manage_workforce",
                "manage_institutions",
                "manage_credentials",
                "manage_system",
                "view_analytics",
                "manage_compliance"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(admin_user)
    
    # Ensure admin profile exists
    admin_profile = await db.admin_profiles.find_one({"admin_id": user_id})
    if not admin_profile:
        await db.admin_profiles.insert_one({
            "admin_id": user_id,
            "email": email,
            "full_name": "Q Nizami",
            "role": "super_admin",
            "department": "Executive",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print("Created admin profile")
    
    client.close()
    
    print("\n" + "="*50)
    print("✅ ADMIN ACCOUNT READY")
    print("="*50)
    print(f"Email: {email}")
    print(f"Temporary Password: {temp_password}")
    print(f"User ID: {user_id}")
    print(f"Role: super_admin")
    print("="*50)
    print("\n⚠️  Please change your password after first login!")

asyncio.run(create_admin_account())
