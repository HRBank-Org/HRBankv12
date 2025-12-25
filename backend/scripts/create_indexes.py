"""
Database Indexing for HR Bank
=============================
Creates indexes on frequently queried fields for optimal performance.
Run this script once during deployment or database setup.

Usage:
    python scripts/create_indexes.py

Indexes are idempotent - running multiple times is safe.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'hrbank_db')


async def create_indexes():
    """Create all necessary database indexes for optimal performance."""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔧 Creating database indexes for HR Bank...")
    print(f"   Database: {DB_NAME}")
    print("=" * 60)
    
    indexes_created = 0
    
    # ============================================
    # USERS COLLECTION - Most frequently queried
    # ============================================
    print("\n📦 Collection: users")
    try:
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("phone", sparse=True)
        await db.users.create_index("user_type")
        await db.users.create_index("profile_status")
        await db.users.create_index("created_date")
        await db.users.create_index([("email", 1), ("user_type", 1)])
        print("   ✓ Created indexes: user_id, email, phone, user_type, profile_status, created_date")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # WORKFORCE PROFILES
    # ============================================
    print("\n📦 Collection: workforce_profiles")
    try:
        await db.workforce_profiles.create_index("user_id", unique=True)
        await db.workforce_profiles.create_index("email")
        await db.workforce_profiles.create_index("phone")
        await db.workforce_profiles.create_index("profile_status")
        await db.workforce_profiles.create_index("preferred_language")
        await db.workforce_profiles.create_index("city")
        await db.workforce_profiles.create_index("province")
        await db.workforce_profiles.create_index([("city", 1), ("province", 1)])
        await db.workforce_profiles.create_index("created_date")
        print("   ✓ Created indexes: user_id, email, phone, profile_status, language, location, created_date")
        indexes_created += 9
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # EMPLOYER PROFILES
    # ============================================
    print("\n📦 Collection: employer_profiles")
    try:
        await db.employer_profiles.create_index("user_id", unique=True)
        await db.employer_profiles.create_index("email")
        await db.employer_profiles.create_index("company_name")
        await db.employer_profiles.create_index("profile_status")
        await db.employer_profiles.create_index("city")
        await db.employer_profiles.create_index("province")
        await db.employer_profiles.create_index("created_date")
        print("   ✓ Created indexes: user_id, email, company_name, profile_status, location, created_date")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # INSTITUTION PROFILES
    # ============================================
    print("\n📦 Collection: institution_profiles")
    try:
        await db.institution_profiles.create_index("institution_id", unique=True)
        await db.institution_profiles.create_index("user_id")
        await db.institution_profiles.create_index("email")
        await db.institution_profiles.create_index("institution_name")
        await db.institution_profiles.create_index("verified_status")
        await db.institution_profiles.create_index("city")
        await db.institution_profiles.create_index("province")
        print("   ✓ Created indexes: institution_id, user_id, email, institution_name, verified_status, location")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # SHIFTS - High volume, time-based queries
    # ============================================
    print("\n📦 Collection: shifts")
    try:
        await db.shifts.create_index("shift_id", unique=True)
        await db.shifts.create_index("employer_id")
        await db.shifts.create_index("workplace_id")
        await db.shifts.create_index("workforce_id")
        await db.shifts.create_index("status")
        await db.shifts.create_index("shift_date")
        await db.shifts.create_index("start_time")
        await db.shifts.create_index([("employer_id", 1), ("shift_date", 1)])
        await db.shifts.create_index([("workforce_id", 1), ("shift_date", 1)])
        await db.shifts.create_index([("workplace_id", 1), ("shift_date", 1), ("status", 1)])
        await db.shifts.create_index([("shift_date", 1), ("status", 1)])
        print("   ✓ Created indexes: shift_id, employer_id, workplace_id, workforce_id, status, dates, compound indexes")
        indexes_created += 11
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # CALENDAR SHIFTS
    # ============================================
    print("\n📦 Collection: calendar_shifts")
    try:
        await db.calendar_shifts.create_index("shift_id", unique=True)
        await db.calendar_shifts.create_index("employer_id")
        await db.calendar_shifts.create_index("workplace_id")
        await db.calendar_shifts.create_index("assigned_worker_id")
        await db.calendar_shifts.create_index("shift_date")
        await db.calendar_shifts.create_index("status")
        await db.calendar_shifts.create_index([("employer_id", 1), ("shift_date", 1)])
        await db.calendar_shifts.create_index([("assigned_worker_id", 1), ("shift_date", 1)])
        print("   ✓ Created indexes: shift_id, employer_id, workplace_id, assigned_worker_id, shift_date, status")
        indexes_created += 8
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # WORKPLACES
    # ============================================
    print("\n📦 Collection: workplaces")
    try:
        await db.workplaces.create_index("workplace_id", unique=True)
        await db.workplaces.create_index("employer_id")
        await db.workplaces.create_index("workplace_name")
        await db.workplaces.create_index("city")
        await db.workplaces.create_index("province")
        await db.workplaces.create_index("status")
        await db.workplaces.create_index([("employer_id", 1), ("status", 1)])
        print("   ✓ Created indexes: workplace_id, employer_id, workplace_name, location, status")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # WORKPLACE ROLES
    # ============================================
    print("\n📦 Collection: workplace_roles")
    try:
        await db.workplace_roles.create_index("role_id", unique=True)
        await db.workplace_roles.create_index("workplace_id")
        await db.workplace_roles.create_index("employer_id")
        await db.workplace_roles.create_index("role_name")
        await db.workplace_roles.create_index([("workplace_id", 1), ("role_name", 1)])
        print("   ✓ Created indexes: role_id, workplace_id, employer_id, role_name")
        indexes_created += 5
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # ATTENDANCE
    # ============================================
    print("\n📦 Collection: attendance")
    try:
        await db.attendance.create_index("attendance_id", unique=True)
        await db.attendance.create_index("shift_id")
        await db.attendance.create_index("workforce_id")
        await db.attendance.create_index("employer_id")
        await db.attendance.create_index("date")
        await db.attendance.create_index("status")
        await db.attendance.create_index([("workforce_id", 1), ("date", 1)])
        await db.attendance.create_index([("employer_id", 1), ("date", 1)])
        await db.attendance.create_index([("shift_id", 1), ("workforce_id", 1)])
        print("   ✓ Created indexes: attendance_id, shift_id, workforce_id, employer_id, date, status, compound indexes")
        indexes_created += 9
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # TIMESHEETS
    # ============================================
    print("\n📦 Collection: timesheets")
    try:
        await db.timesheets.create_index("timesheet_id", unique=True)
        await db.timesheets.create_index("workforce_id")
        await db.timesheets.create_index("employer_id")
        await db.timesheets.create_index("status")
        await db.timesheets.create_index("week_start")
        await db.timesheets.create_index("week_end")
        await db.timesheets.create_index([("workforce_id", 1), ("week_start", 1)])
        await db.timesheets.create_index([("employer_id", 1), ("status", 1)])
        print("   ✓ Created indexes: timesheet_id, workforce_id, employer_id, status, week dates, compound indexes")
        indexes_created += 8
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # WEEKLY TIMESHEETS
    # ============================================
    print("\n📦 Collection: weekly_timesheets")
    try:
        await db.weekly_timesheets.create_index("timesheet_id", unique=True)
        await db.weekly_timesheets.create_index("workforce_id")
        await db.weekly_timesheets.create_index("employer_id")
        await db.weekly_timesheets.create_index("status")
        await db.weekly_timesheets.create_index("week_start_date")
        await db.weekly_timesheets.create_index([("workforce_id", 1), ("week_start_date", 1)])
        await db.weekly_timesheets.create_index([("employer_id", 1), ("status", 1), ("week_start_date", 1)])
        print("   ✓ Created indexes: timesheet_id, workforce_id, employer_id, status, week_start_date, compound indexes")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # NOTIFICATIONS
    # ============================================
    print("\n📦 Collection: notifications")
    try:
        await db.notifications.create_index("notification_id", unique=True)
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("read")
        await db.notifications.create_index("type")
        await db.notifications.create_index("created_date")
        await db.notifications.create_index([("user_id", 1), ("read", 1)])
        await db.notifications.create_index([("user_id", 1), ("created_date", -1)])
        # TTL index - auto-delete notifications older than 90 days
        await db.notifications.create_index("created_date", expireAfterSeconds=7776000)  # 90 days
        print("   ✓ Created indexes: notification_id, user_id, read, type, created_date, compound indexes, TTL (90 days)")
        indexes_created += 8
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # CHAT THREADS & MESSAGES
    # ============================================
    print("\n📦 Collection: chat_threads")
    try:
        await db.chat_threads.create_index("thread_id", unique=True)
        await db.chat_threads.create_index("participants")
        await db.chat_threads.create_index("last_message_at")
        await db.chat_threads.create_index([("participants", 1), ("last_message_at", -1)])
        print("   ✓ Created indexes: thread_id, participants, last_message_at")
        indexes_created += 4
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    print("\n📦 Collection: chat_messages")
    try:
        await db.chat_messages.create_index("message_id", unique=True)
        await db.chat_messages.create_index("thread_id")
        await db.chat_messages.create_index("sender_id")
        await db.chat_messages.create_index("created_at")
        await db.chat_messages.create_index([("thread_id", 1), ("created_at", -1)])
        print("   ✓ Created indexes: message_id, thread_id, sender_id, created_at")
        indexes_created += 5
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # JOB POSTINGS & APPLICATIONS
    # ============================================
    print("\n📦 Collection: job_postings")
    try:
        await db.job_postings.create_index("posting_id", unique=True)
        await db.job_postings.create_index("employer_id")
        await db.job_postings.create_index("status")
        await db.job_postings.create_index("occupation_id")
        await db.job_postings.create_index("city")
        await db.job_postings.create_index("province")
        await db.job_postings.create_index("posted_date")
        await db.job_postings.create_index([("status", 1), ("posted_date", -1)])
        await db.job_postings.create_index([("city", 1), ("province", 1), ("status", 1)])
        print("   ✓ Created indexes: posting_id, employer_id, status, occupation_id, location, posted_date")
        indexes_created += 9
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    print("\n📦 Collection: job_applications")
    try:
        await db.job_applications.create_index("application_id", unique=True)
        await db.job_applications.create_index("posting_id")
        await db.job_applications.create_index("workforce_id")
        await db.job_applications.create_index("employer_id")
        await db.job_applications.create_index("status")
        await db.job_applications.create_index("applied_date")
        await db.job_applications.create_index([("posting_id", 1), ("status", 1)])
        await db.job_applications.create_index([("workforce_id", 1), ("status", 1)])
        print("   ✓ Created indexes: application_id, posting_id, workforce_id, employer_id, status, applied_date")
        indexes_created += 8
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # EMPLOYMENT RELATIONSHIPS
    # ============================================
    print("\n📦 Collection: employment_relationships")
    try:
        await db.employment_relationships.create_index("relationship_id", unique=True)
        await db.employment_relationships.create_index("workforce_id")
        await db.employment_relationships.create_index("employer_id")
        await db.employment_relationships.create_index("workplace_id")
        await db.employment_relationships.create_index("status")
        await db.employment_relationships.create_index([("workforce_id", 1), ("employer_id", 1)])
        await db.employment_relationships.create_index([("employer_id", 1), ("status", 1)])
        print("   ✓ Created indexes: relationship_id, workforce_id, employer_id, workplace_id, status, compound indexes")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # BOOKINGS (Service Tasks)
    # ============================================
    print("\n📦 Collection: bookings")
    try:
        await db.bookings.create_index("booking_id", unique=True)
        await db.bookings.create_index("employer_id")
        await db.bookings.create_index("workforce_id")
        await db.bookings.create_index("status")
        await db.bookings.create_index("booking_date")
        await db.bookings.create_index([("employer_id", 1), ("booking_date", 1)])
        await db.bookings.create_index([("workforce_id", 1), ("booking_date", 1)])
        print("   ✓ Created indexes: booking_id, employer_id, workforce_id, status, booking_date")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # SERVICE TASKS
    # ============================================
    print("\n📦 Collection: service_tasks")
    try:
        await db.service_tasks.create_index("task_id", unique=True)
        await db.service_tasks.create_index("booking_id")
        await db.service_tasks.create_index("workforce_id")
        await db.service_tasks.create_index("status")
        await db.service_tasks.create_index("scheduled_date")
        await db.service_tasks.create_index([("booking_id", 1), ("status", 1)])
        print("   ✓ Created indexes: task_id, booking_id, workforce_id, status, scheduled_date")
        indexes_created += 6
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # DOCUMENTS
    # ============================================
    print("\n📦 Collection: documents")
    try:
        await db.documents.create_index("document_id", unique=True)
        await db.documents.create_index("user_id")
        await db.documents.create_index("document_type")
        await db.documents.create_index("verification_status")
        await db.documents.create_index("expiry_date")
        await db.documents.create_index([("user_id", 1), ("document_type", 1)])
        await db.documents.create_index([("expiry_date", 1), ("verification_status", 1)])
        print("   ✓ Created indexes: document_id, user_id, document_type, verification_status, expiry_date")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # CREDENTIALS (Blockchain)
    # ============================================
    print("\n📦 Collection: blockchain_credentials")
    try:
        await db.blockchain_credentials.create_index("credential_id", unique=True)
        await db.blockchain_credentials.create_index("institution_id")
        await db.blockchain_credentials.create_index("worker_id")
        await db.blockchain_credentials.create_index("status")
        await db.blockchain_credentials.create_index("credential_hash")
        await db.blockchain_credentials.create_index("blockchain_transaction_hash", sparse=True)
        await db.blockchain_credentials.create_index([("institution_id", 1), ("status", 1)])
        print("   ✓ Created indexes: credential_id, institution_id, worker_id, status, credential_hash, transaction_hash")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # TRANSCRIPTS
    # ============================================
    print("\n📦 Collection: transcripts")
    try:
        await db.transcripts.create_index("transcript_id", unique=True)
        await db.transcripts.create_index("institution_id")
        await db.transcripts.create_index("workforce_id", sparse=True)
        await db.transcripts.create_index("status")
        await db.transcripts.create_index("created_at")
        await db.transcripts.create_index([("institution_id", 1), ("status", 1)])
        print("   ✓ Created indexes: transcript_id, institution_id, workforce_id, status, created_at")
        indexes_created += 6
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # CREDENTIAL VERIFICATIONS
    # ============================================
    print("\n📦 Collection: credential_verifications")
    try:
        await db.credential_verifications.create_index("verification_id", unique=True)
        await db.credential_verifications.create_index("credential_id")
        await db.credential_verifications.create_index("verified_date")
        await db.credential_verifications.create_index([("credential_id", 1), ("verified_date", -1)])
        print("   ✓ Created indexes: verification_id, credential_id, verified_date")
        indexes_created += 4
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # INSTITUTION CLASSES
    # ============================================
    print("\n📦 Collection: institution_classes")
    try:
        await db.institution_classes.create_index("class_id", unique=True)
        await db.institution_classes.create_index("institution_id")
        await db.institution_classes.create_index("status")
        await db.institution_classes.create_index("start_date")
        await db.institution_classes.create_index([("institution_id", 1), ("status", 1)])
        print("   ✓ Created indexes: class_id, institution_id, status, start_date")
        indexes_created += 5
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # INVITE TOKENS
    # ============================================
    print("\n📦 Collection: invite_tokens")
    try:
        await db.invite_tokens.create_index("invite_token", unique=True)
        await db.invite_tokens.create_index("employer_id")
        await db.invite_tokens.create_index("email")
        await db.invite_tokens.create_index("status")
        await db.invite_tokens.create_index("expires_at")
        # TTL index - auto-delete expired invites after 30 days
        await db.invite_tokens.create_index("expires_at", expireAfterSeconds=2592000)  # 30 days
        print("   ✓ Created indexes: invite_token, employer_id, email, status, expires_at, TTL (30 days)")
        indexes_created += 6
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # ROSTERS
    # ============================================
    print("\n📦 Collection: rosters")
    try:
        await db.rosters.create_index("roster_id", unique=True)
        await db.rosters.create_index("employer_id")
        await db.rosters.create_index("workplace_id")
        await db.rosters.create_index("week_start")
        await db.rosters.create_index([("employer_id", 1), ("week_start", 1)])
        await db.rosters.create_index([("workplace_id", 1), ("week_start", 1)])
        print("   ✓ Created indexes: roster_id, employer_id, workplace_id, week_start")
        indexes_created += 6
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # OCCUPATION PROFILES & TEMPLATES
    # ============================================
    print("\n📦 Collection: occupation_profiles")
    try:
        await db.occupation_profiles.create_index("occupation_id", unique=True)
        await db.occupation_profiles.create_index("noc_code")
        await db.occupation_profiles.create_index("occupation_name")
        await db.occupation_profiles.create_index("category")
        print("   ✓ Created indexes: occupation_id, noc_code, occupation_name, category")
        indexes_created += 4
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    print("\n📦 Collection: occupation_templates")
    try:
        await db.occupation_templates.create_index("template_id", unique=True)
        await db.occupation_templates.create_index("occupation_id")
        await db.occupation_templates.create_index("employer_id")
        await db.occupation_templates.create_index([("employer_id", 1), ("occupation_id", 1)])
        print("   ✓ Created indexes: template_id, occupation_id, employer_id")
        indexes_created += 4
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # TIME OFF REQUESTS
    # ============================================
    print("\n📦 Collection: time_off_requests")
    try:
        await db.time_off_requests.create_index("request_id", unique=True)
        await db.time_off_requests.create_index("workforce_id")
        await db.time_off_requests.create_index("employer_id")
        await db.time_off_requests.create_index("status")
        await db.time_off_requests.create_index("start_date")
        await db.time_off_requests.create_index([("workforce_id", 1), ("status", 1)])
        await db.time_off_requests.create_index([("employer_id", 1), ("status", 1)])
        print("   ✓ Created indexes: request_id, workforce_id, employer_id, status, start_date")
        indexes_created += 7
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # ADMINS
    # ============================================
    print("\n📦 Collection: admins")
    try:
        await db.admins.create_index("admin_id", unique=True)
        await db.admins.create_index("user_id", unique=True)
        await db.admins.create_index("email", unique=True)
        await db.admins.create_index("role")
        print("   ✓ Created indexes: admin_id, user_id, email, role")
        indexes_created += 4
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # ============================================
    # SUMMARY
    # ============================================
    print("\n" + "=" * 60)
    print(f"✅ DATABASE INDEXING COMPLETE")
    print(f"   Total indexes created/verified: {indexes_created}")
    print("=" * 60)
    
    # List all indexes
    print("\n📊 Index Summary by Collection:")
    collections = await db.list_collection_names()
    for collection_name in sorted(collections):
        try:
            indexes = await db[collection_name].index_information()
            index_count = len(indexes) - 1  # Subtract 1 for the default _id index
            if index_count > 0:
                print(f"   {collection_name}: {index_count} custom indexes")
        except Exception:
            pass
    
    client.close()
    print("\n✅ Database connection closed")


if __name__ == "__main__":
    asyncio.run(create_indexes())
