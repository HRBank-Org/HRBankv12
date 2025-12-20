import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path

env_file = Path('/app/backend/.env')
for line in env_file.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, val = line.split('=', 1)
        os.environ[key.strip()] = val.strip().strip('"')

async def fix_employer_ids():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'hrbank_db')]
    
    # The correct employer ID for john.b@swanpizza.ca
    correct_employer_id = "emp_80b6196b4d02"
    old_employer_id = "emp_28685eb8d6e9"
    
    print(f"Migrating from {old_employer_id} to {correct_employer_id}")
    
    # Update workplaces
    result = await db.workplaces.update_many(
        {"employer_id": old_employer_id},
        {"$set": {"employer_id": correct_employer_id}}
    )
    print(f"Updated {result.modified_count} workplaces")
    
    # Update roles
    result = await db.workplace_roles.update_many(
        {"employer_id": old_employer_id},
        {"$set": {"employer_id": correct_employer_id}}
    )
    print(f"Updated {result.modified_count} roles")
    
    # Update service tasks
    result = await db.service_tasks.update_many(
        {"employer_id": old_employer_id},
        {"$set": {"employer_id": correct_employer_id}}
    )
    print(f"Updated {result.modified_count} service tasks")
    
    # Verify
    tasks = await db.service_tasks.find({"employer_id": correct_employer_id}, {"_id": 0, "task_id": 1, "title": 1}).to_list(10)
    print(f"\nService tasks for {correct_employer_id}:")
    for t in tasks:
        print(f"  - {t.get('task_id')}: {t.get('title')}")
    
    client.close()
    print("\n✅ Migration complete!")

asyncio.run(fix_employer_ids())
