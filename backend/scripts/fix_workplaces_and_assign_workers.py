"""
Fix workplaces addresses and assign workers to shifts
Based on the schedule image showing daily hours
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
import random

sys.path.append('/app/backend')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client['hrbank_db']

EMPLOYER_ID = "usr_e8e29382551e"

async def force_update_workplaces():
    """Force update all workplace fields"""
    print("\n🔧 Force Updating Workplaces...")
    
    workplaces_data = [
        {
            "name": "Loose Goose - Tecumseh",
            "address": "480 Advance Blvd Unit 230, Tecumseh, ON N8N 0B8",
            "city": "Tecumseh",
            "province": "ON",
            "postal": "N8N 0B8",
            "lat": 42.3251,
            "lng": -82.9107
        },
        {
            "name": "Loose Goose - Chilver",
            "address": "624 Chilver Rd Unit 103, Windsor, ON N8Y 2K2",
            "city": "Windsor",
            "province": "ON",
            "postal": "N8Y 2K2",
            "lat": 42.2891,
            "lng": -82.9761
        },
        {
            "name": "Loose Goose - Downtown",
            "address": "126 Ouellette Ave, Windsor, ON N9A 1A2",
            "city": "Windsor",
            "province": "ON",
            "postal": "N9A 1A2",
            "lat": 42.3175,
            "lng": -83.0364
        }
    ]
    
    existing = await db.workplaces.find({"employer_id": EMPLOYER_ID}).to_list(10)
    
    for i, wp_data in enumerate(workplaces_data):
        if i < len(existing):
            workplace_id = existing[i]['workplace_id']
            
            # Update ALL fields
            await db.workplaces.update_one(
                {"workplace_id": workplace_id},
                {"$set": {
                    "workplace_name": wp_data["name"],
                    "workplace_address": wp_data["address"],
                    "workplace_city": wp_data["city"],
                    "workplace_province": wp_data["province"],
                    "workplace_postal_code": wp_data["postal"],
                    "address_line_1": wp_data["address"],
                    "city": wp_data["city"],
                    "province": wp_data["province"],
                    "postal_code": wp_data["postal"],
                    "coordinates": {
                        "lat": wp_data["lat"],
                        "lng": wp_data["lng"]
                    }
                }}
            )
            print(f"  ✓ Updated: {wp_data['name']}")
            print(f"    {wp_data['address']}")
    
    # Verify
    updated = await db.workplaces.find({"employer_id": EMPLOYER_ID}, {"_id": 0}).to_list(10)
    print("\n✅ Verification:")
    for wp in updated:
        print(f"  • {wp['workplace_name']}")
        print(f"    {wp['workplace_address']}")
        print(f"    Coords: {wp.get('coordinates')}\n")
    
    return updated

async def assign_workers_to_shifts(workplaces):
    """Assign workers to shifts based on their occupation"""
    print("\n👥 Assigning Workers to Shifts...")
    
    # Get all shifts
    shifts = await db.shifts.find({"employer_id": EMPLOYER_ID}).to_list(1000)
    
    # Get workforce by occupation
    bartenders = await db.workforce_profiles.find(
        {"occupation_titles": "Bartender", "status": "active"}
    ).to_list(100)
    
    servers = await db.workforce_profiles.find(
        {"occupation_titles": "Server", "status": "active"}
    ).to_list(100)
    
    chefs = await db.workforce_profiles.find(
        {"occupation_titles": "Chef", "status": "active"}
    ).to_list(100)
    
    janitors = await db.workforce_profiles.find(
        {"occupation_titles": "Janitor", "status": "active"}
    ).to_list(100)
    
    print(f"  Available: {len(bartenders)} bartenders, {len(servers)} servers, {len(chefs)} chefs, {len(janitors)} janitors")
    
    assigned_count = 0
    
    for shift in shifts:
        position = shift['position_title']
        needed = shift['positions_needed']
        
        # Get appropriate workforce pool
        if position == "Bartender":
            pool = bartenders
        elif position == "Server":
            pool = servers
        elif position == "Chef":
            pool = chefs
        elif position == "Janitor":
            pool = janitors
        else:
            continue
        
        # Randomly select workers from pool (without replacement for now)
        selected = random.sample(pool, min(needed, len(pool)))
        
        assigned_workers = []
        for worker in selected:
            assigned_workers.append({
                "workforce_id": worker['workforce_id'],
                "name": f"{worker.get('first_name', '')} {worker.get('last_name', '')}",
                "status": "confirmed"
            })
        
        # Update shift
        await db.shifts.update_one(
            {"shift_id": shift['shift_id']},
            {"$set": {
                "assigned_workers": assigned_workers,
                "status": "filled" if len(assigned_workers) >= needed else "partially_filled"
            }}
        )
        
        assigned_count += 1
    
    print(f"\n✅ Assigned workers to {assigned_count} shifts")
    
    # Show summary
    filled = await db.shifts.count_documents({"employer_id": EMPLOYER_ID, "status": "filled"})
    partial = await db.shifts.count_documents({"employer_id": EMPLOYER_ID, "status": "partially_filled"})
    open_shifts = await db.shifts.count_documents({"employer_id": EMPLOYER_ID, "status": "open"})
    
    print(f"\nShift Status:")
    print(f"  • Filled: {filled}")
    print(f"  • Partially Filled: {partial}")
    print(f"  • Open: {open_shifts}")

async def main():
    print("=" * 60)
    print("🔧 FIXING WORKPLACES & ASSIGNING WORKERS")
    print("=" * 60)
    
    # Fix workplaces
    workplaces = await force_update_workplaces()
    
    # Assign workers to shifts
    await assign_workers_to_shifts(workplaces)
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE!")
    print("=" * 60)
    print("\n💡 Tip: Clear browser cache to see updated workplace addresses")
    print("   Or do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)")

if __name__ == "__main__":
    asyncio.run(main())
