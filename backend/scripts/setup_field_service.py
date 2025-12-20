import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

# Load env manually
from pathlib import Path
env_file = Path('/app/backend/.env')
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            key, val = line.split('=', 1)
            os.environ[key.strip()] = val.strip()

async def setup_field_service():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'hrbank_db')]
    
    # Get Swan Pizza employer
    employer = await db.employer_profiles.find_one(
        {"company_name": {"$regex": "Swan", "$options": "i"}},
        {"_id": 0}
    )
    
    if not employer:
        print("Swan Pizza employer not found")
        return
    
    employer_id = employer.get("employer_id")
    print(f"Found employer: {employer.get('company_name')} ({employer_id})")
    
    # Windsor area FSAs
    windsor_fsas = ["N8W", "N8X", "N8Y", "N8N", "N8P", "N8R", "N8S", "N8T", "N9A", "N9B", "N9C"]
    
    # Check if field service workplace exists
    existing = await db.workplaces.find_one({"work_mode": "field_service", "employer_id": employer_id})
    
    if existing:
        print(f"Field service workplace exists: {existing.get('workplace_name')}")
        await db.workplaces.update_one(
            {"workplace_id": existing["workplace_id"]},
            {"$set": {"service_fsas": windsor_fsas, "status": "active"}}
        )
        print(f"Updated FSAs: {windsor_fsas}")
        workplace_id = existing["workplace_id"]
    else:
        workplace_id = f"wp_{uuid.uuid4().hex[:12]}"
        field_service_workplace = {
            "workplace_id": workplace_id,
            "employer_id": employer_id,
            "workplace_name": "Swan Pizza - Field Services",
            "work_mode": "field_service",
            "address": "1250 Tecumseh Road East",
            "city": "Windsor",
            "province": "ON",
            "postal_code": "N8W 1C2",
            "service_fsas": windsor_fsas,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.workplaces.insert_one(field_service_workplace)
        print(f"Created field service workplace: {workplace_id}")
    
    print(f"Covering FSAs: {windsor_fsas}")
    
    # Create field service role if not exists
    existing_role = await db.workplace_roles.find_one({
        "employer_id": employer_id,
        "title": "Cleaning Technician"
    })
    
    if not existing_role:
        role_id = f"role_{uuid.uuid4().hex[:12]}"
        field_role = {
            "role_id": role_id,
            "employer_id": employer_id,
            "workplace_id": workplace_id,
            "title": "Cleaning Technician",
            "role_name": "Cleaning Technician",
            "description": "Field service cleaning technician",
            "work_type": "route_based",
            "hourly_rate": 22.00,
            "required_certifications": ["WHMIS"],
            "skills_required": ["Cleaning", "Customer Service"],
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.workplace_roles.insert_one(field_role)
        print("Created Cleaning Technician role")
    else:
        print("Cleaning Technician role exists")
    
    client.close()
    print("\n✅ Field service setup complete!")

asyncio.run(setup_field_service())
