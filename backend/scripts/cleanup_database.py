"""
Database Cleanup Script
Removes all test data while preserving system configuration data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'hrbank_db')


async def cleanup_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🗑️  Starting database cleanup...")
    print("=" * 60)
    
    # Collections to completely clear (user/test data)
    collections_to_clear = [
        # User & Auth
        'users',
        'email_verifications',
        'otp_verifications',
        'invite_tokens',
        
        # Employer Side
        'employer_profiles',
        'workplaces',
        'workplace_roles',
        'shifts',
        'calendar_shifts',
        'job_postings',
        'jobs',
        
        # Workforce Side
        'workforce_profiles',
        'workforce_credentials',
        'employment_relationships',
        
        # Operations
        'timesheets',
        'weekly_timesheets',
        'task_completions',
        'notifications',
        'shift_ratings',
        'bookings',
        'availability_events',
        
        # Other
        'emma_conversations',
        'documents',
        'qr_codes',
        'zones',
        'job_matches',
    ]
    
    # Collections to preserve (system/config data)
    preserved_collections = [
        'admin_profiles',
        'admins',
        'occupation_profiles',
        'occupation_templates',
        'credential_types',
        'minimum_wages',
        'eula_acceptances',
        'class_templates',
        'credential_verification_requests',
        'notification_preferences',
    ]
    
    total_deleted = 0
    
    for collection_name in collections_to_clear:
        try:
            collection = db[collection_name]
            result = await collection.delete_many({})
            count = result.deleted_count
            total_deleted += count
            print(f"✅ Cleared {collection_name}: {count} documents deleted")
        except Exception as e:
            print(f"⚠️  Error clearing {collection_name}: {str(e)}")
    
    print("=" * 60)
    print(f"🎉 Cleanup complete! Total documents deleted: {total_deleted}")
    print("\n📦 Preserved collections (system data):")
    for col in preserved_collections:
        try:
            count = await db[col].count_documents({})
            print(f"   - {col}: {count} documents")
        except:
            pass
    
    client.close()


if __name__ == "__main__":
    asyncio.run(cleanup_database())
