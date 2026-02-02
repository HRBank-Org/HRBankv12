"""
Migration Script: Consolidate calendar_shifts into shifts collection
This script migrates all data from calendar_shifts to the unified shifts collection.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

async def migrate_calendar_shifts():
    """Migrate calendar_shifts to unified shifts collection"""
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'hrbank_db')]
    
    print("=" * 60)
    print("Calendar Shifts Migration to Unified Shifts Collection")
    print("=" * 60)
    
    # Count existing records
    calendar_count = await db.calendar_shifts.count_documents({})
    shifts_count = await db.shifts.count_documents({})
    
    print(f"\nBefore migration:")
    print(f"  - calendar_shifts: {calendar_count} records")
    print(f"  - shifts: {shifts_count} records")
    
    if calendar_count == 0:
        print("\nNo calendar_shifts to migrate. Exiting.")
        return
    
    # Check for existing migrated shifts
    already_migrated = await db.shifts.count_documents({"source": "calendar"})
    if already_migrated > 0:
        print(f"\nWARNING: {already_migrated} shifts already have source='calendar'")
        response = input("Continue migration anyway? (y/n): ")
        if response.lower() != 'y':
            print("Migration cancelled.")
            return
    
    # Fetch all calendar_shifts
    print("\nFetching calendar_shifts...")
    calendar_shifts = await db.calendar_shifts.find({}).to_list(None)
    
    # Transform and prepare for insertion
    migrated_shifts = []
    skipped = 0
    
    for cs in calendar_shifts:
        # Check if shift_id already exists in shifts
        existing = await db.shifts.find_one({"shift_id": cs.get("shift_id")})
        if existing:
            skipped += 1
            continue
        
        # Transform calendar_shift to unified shift format
        shift = {
            "shift_id": cs.get("shift_id"),
            "employer_id": cs.get("employer_id"),
            "workplace_id": cs.get("workplace_id"),
            "workplace_name": cs.get("workplace_name", ""),
            "location_id": cs.get("workplace_id"),  # Alias for compatibility
            
            # Time fields - normalize format
            "start_time": cs.get("start_time"),
            "end_time": cs.get("end_time"),
            "duration_hours": cs.get("duration_hours", 0),
            
            # Title/Role fields
            "title": cs.get("shift_name", cs.get("position_title", "Shift")),
            "shift_name": cs.get("shift_name", ""),
            "role": cs.get("position_title", "Worker"),
            "role_id": cs.get("role_id"),
            "position_title": cs.get("position_title"),
            
            # Worker assignment
            "assigned_workers": cs.get("assigned_workers", []),
            "required_workers": cs.get("positions_needed", 1),
            "positions_needed": cs.get("positions_needed", 1),
            "positions_filled": cs.get("positions_filled", 0),
            
            # Status and type
            "status": cs.get("status", "open"),
            "shift_type": cs.get("shift_type", "on_site"),
            
            # Pay
            "hourly_rate": cs.get("hourly_rate", 0),
            
            # Source tracking
            "source": "calendar",
            
            # Metadata
            "created_at": cs.get("created_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "migrated_at": datetime.now(timezone.utc).isoformat(),
            "notes": cs.get("notes", ""),
            
            # Keep recurring info if present
            "recurring_pattern": cs.get("recurring_pattern"),
            "series_id": cs.get("series_id"),
        }
        
        migrated_shifts.append(shift)
    
    print(f"\nPrepared {len(migrated_shifts)} shifts for migration")
    print(f"Skipped {skipped} shifts (already exist in shifts collection)")
    
    if not migrated_shifts:
        print("No new shifts to migrate.")
        return
    
    # Insert in batches
    batch_size = 500
    total_inserted = 0
    
    for i in range(0, len(migrated_shifts), batch_size):
        batch = migrated_shifts[i:i + batch_size]
        try:
            result = await db.shifts.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
            print(f"  Inserted batch {i // batch_size + 1}: {len(result.inserted_ids)} shifts")
        except Exception as e:
            print(f"  Error in batch {i // batch_size + 1}: {e}")
    
    # Final counts
    final_shifts_count = await db.shifts.count_documents({})
    calendar_source_count = await db.shifts.count_documents({"source": "calendar"})
    
    print(f"\nAfter migration:")
    print(f"  - shifts: {final_shifts_count} records")
    print(f"  - shifts with source='calendar': {calendar_source_count}")
    print(f"  - Total inserted: {total_inserted}")
    
    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Update code to use 'shifts' collection instead of 'calendar_shifts'")
    print("2. After verification, you can drop calendar_shifts collection:")
    print("   db.calendar_shifts.drop()")


async def rollback_migration():
    """Remove migrated calendar shifts from shifts collection"""
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'hrbank_db')]
    
    count = await db.shifts.count_documents({"source": "calendar"})
    print(f"Found {count} shifts with source='calendar'")
    
    if count == 0:
        print("Nothing to rollback.")
        return
    
    response = input(f"Delete {count} migrated shifts? (y/n): ")
    if response.lower() == 'y':
        result = await db.shifts.delete_many({"source": "calendar"})
        print(f"Deleted {result.deleted_count} shifts")
    else:
        print("Rollback cancelled.")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(migrate_calendar_shifts())
