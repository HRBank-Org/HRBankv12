#!/usr/bin/env python3
"""
Fix existing workforce profiles to have coordinates and profile_status
"""

import asyncio
import sys
sys.path.insert(0, '/app/backend')
from motor.motor_asyncio import AsyncIOMotorClient
import random

# Canadian cities with coordinates for proximity testing
LOCATIONS = [
    {"city": "Toronto", "province": "ON", "postal_code": "M5H 2N2", "lat": 43.6532, "long": -79.3832},
    {"city": "Mississauga", "province": "ON", "postal_code": "L5B 1M2", "lat": 43.5890, "long": -79.6441},
    {"city": "Vancouver", "province": "BC", "postal_code": "V6B 1A1", "lat": 49.2827, "long": -123.1207},
    {"city": "Burnaby", "province": "BC", "postal_code": "V5H 1X8", "lat": 49.2488, "long": -122.9805},
    {"city": "Calgary", "province": "AB", "postal_code": "T2P 1J9", "lat": 51.0447, "long": -114.0719},
    {"city": "Montreal", "province": "QC", "postal_code": "H3B 4W8", "lat": 45.5017, "long": -73.5673},
    {"city": "Ottawa", "province": "ON", "postal_code": "K1P 1J1", "lat": 45.4215, "long": -75.6972},
    {"city": "Edmonton", "province": "AB", "postal_code": "T5J 2R7", "lat": 53.5461, "long": -113.4938},
]

async def fix_workforce_profiles():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['hrbank_db']
    
    # Get all workforce profiles
    profiles = await db.workforce_profiles.find({}).to_list(100)
    print(f"Found {len(profiles)} workforce profiles")
    
    updated_count = 0
    
    for i, profile in enumerate(profiles):
        location = LOCATIONS[i % len(LOCATIONS)]
        
        # Update profile with missing fields
        update_data = {}
        
        # Add coordinates if missing
        if not profile.get('lat') or not profile.get('long'):
            update_data['lat'] = location['lat'] + random.uniform(-0.1, 0.1)
            update_data['long'] = location['long'] + random.uniform(-0.1, 0.1)
            print(f"  Adding coordinates to {profile.get('email', 'unknown')}")
        
        # Add profile_status if missing
        if not profile.get('profile_status'):
            update_data['profile_status'] = 'active'
            print(f"  Setting profile_status=active for {profile.get('email', 'unknown')}")
        
        # Add employment_status if missing (needed for matching algorithm)
        if not profile.get('employment_status'):
            update_data['employment_status'] = 'available'
            print(f"  Setting employment_status=available for {profile.get('email', 'unknown')}")
        
        # Update the profile if needed
        if update_data:
            # Use user_id if workforce_id doesn't exist
            profile_id = profile.get('workforce_id') or profile.get('user_id')
            if profile_id:
                await db.workforce_profiles.update_one(
                    {'$or': [{'workforce_id': profile_id}, {'user_id': profile_id}]},
                    {'$set': update_data}
                )
                updated_count += 1
            else:
                print(f"  Warning: No ID found for profile {profile.get('email', 'unknown')}")
    
    print(f"\n✅ Updated {updated_count} workforce profiles")
    
    # Verify the updates
    active_profiles = await db.workforce_profiles.find({'profile_status': 'active'}).to_list(100)
    profiles_with_coords = await db.workforce_profiles.find({
        'lat': {'$exists': True, '$ne': None},
        'long': {'$exists': True, '$ne': None}
    }).to_list(100)
    
    print(f"✅ Verification:")
    print(f"   Active profiles: {len(active_profiles)}")
    print(f"   Profiles with coordinates: {len(profiles_with_coords)}")
    
    if active_profiles:
        sample = active_profiles[0]
        print(f"   Sample profile: {sample.get('first_name', 'Unknown')} {sample.get('last_name', '')}")
        print(f"   Coordinates: lat={sample.get('lat')}, long={sample.get('long')}")
        print(f"   Status: {sample.get('profile_status')}, Employment: {sample.get('employment_status')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_workforce_profiles())