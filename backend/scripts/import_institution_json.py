"""
Import Institution Directory from JSON Export

Use this script to import the institution directory to production MongoDB Atlas.

Usage:
    1. Copy institution_directory_export.json to the production server
    2. Set MONGO_URL environment variable to your Atlas connection string
    3. Run: python scripts/import_institution_json.py /path/to/institution_directory_export.json
"""

import sys
import os
import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Load .env if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')


async def import_institutions(json_file: str):
    """Import institutions from JSON file."""
    
    print(f"📂 Reading: {json_file}")
    with open(json_file, 'r') as f:
        institutions = json.load(f)
    
    print(f"📊 Found {len(institutions)} institutions")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Check existing count
    existing_count = await db.institution_directory.count_documents({})
    print(f"📈 Existing in database: {existing_count}")
    
    if existing_count > 0:
        response = input("Database already has data. Replace all? (y/N): ")
        if response.lower() == 'y':
            await db.institution_directory.delete_many({})
            print("🗑️ Cleared existing data")
        else:
            print("⏭️ Skipping import (keeping existing data)")
            client.close()
            return
    
    # Insert in batches
    batch_size = 100
    inserted = 0
    
    for i in range(0, len(institutions), batch_size):
        batch = institutions[i:i + batch_size]
        await db.institution_directory.insert_many(batch)
        inserted += len(batch)
        print(f"  ✓ Inserted {inserted}/{len(institutions)}")
    
    # Create indexes
    await db.institution_directory.create_index("directory_id")
    await db.institution_directory.create_index("province")
    await db.institution_directory.create_index([("institution_name", "text")])
    
    print(f"\n✅ Import complete: {inserted} institutions")
    client.close()


async def main():
    if len(sys.argv) < 2:
        # If no file specified, look for default location
        default_file = '/tmp/institution_directory_export.json'
        if os.path.exists(default_file):
            await import_institutions(default_file)
        else:
            print("Usage: python import_institution_json.py <json_file>")
            print("Or place file at /tmp/institution_directory_export.json")
            sys.exit(1)
    else:
        await import_institutions(sys.argv[1])


if __name__ == '__main__':
    asyncio.run(main())
