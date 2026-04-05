"""
Data Integrity Migration Script v1
Fixes schema inconsistencies in workforce-related MongoDB collections.

Issues addressed:
1. Purge 86 orphaned occupation_profiles (reference non-existent users)
2. Propagate 41 shift_ratings to workforce_profiles (general_rating_avg/count)
3. Clean 12 broken employment_relationships (orphaned workforce refs)
4. Add workforce_id alias to blockchain_credentials (worker_id -> workforce_id)
5. Sync workforce_profiles.occupation_count to actual counts
6. Create indexes to prevent future drift
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "hrbank_db")


async def run_migration():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    results = {
        "occupation_profiles_deleted": 0,
        "shift_ratings_propagated": 0,
        "workforce_profiles_updated": 0,
        "employment_relationships_deleted": 0,
        "blockchain_credentials_updated": 0,
        "occupation_counts_synced": 0,
        "indexes_created": [],
    }

    # ========== STEP 1: Purge orphaned occupation_profiles ==========
    print("\n=== STEP 1: Purge orphaned occupation_profiles ===")
    
    # Build set of valid workforce_ids
    valid_wf_ids = set()
    async for wf in db.workforce_profiles.find({}, {"workforce_id": 1}):
        valid_wf_ids.add(wf.get("workforce_id"))
    
    # Build set of valid user_ids
    valid_user_ids = set()
    async for u in db.users.find({}, {"user_id": 1}):
        valid_user_ids.add(u.get("user_id"))
    
    all_valid_ids = valid_wf_ids | valid_user_ids
    
    # Find and delete orphaned occupation profiles
    all_occ = await db.occupation_profiles.find({}, {"_id": 1, "occupation_id": 1, "workforce_id": 1, "user_id": 1}).to_list(None)
    
    orphan_ids = []
    for occ in all_occ:
        ref_id = occ.get("workforce_id") or occ.get("user_id")
        if not ref_id or ref_id not in all_valid_ids:
            orphan_ids.append(occ["_id"])
    
    if orphan_ids:
        result = await db.occupation_profiles.delete_many({"_id": {"$in": orphan_ids}})
        results["occupation_profiles_deleted"] = result.deleted_count
        print(f"  Deleted {result.deleted_count} orphaned occupation profiles")
    else:
        print("  No orphaned occupation profiles found")

    # ========== STEP 2: Propagate shift_ratings to workforce_profiles ==========
    print("\n=== STEP 2: Propagate shift_ratings to workforce_profiles ===")
    
    # Get all shift_ratings grouped by rated_user_id
    all_ratings = await db.shift_ratings.find({}, {"_id": 0}).to_list(None)
    
    # Group by rated_user_id
    ratings_by_user = {}
    for r in all_ratings:
        uid = r.get("rated_user_id")
        if uid:
            if uid not in ratings_by_user:
                ratings_by_user[uid] = []
            ratings_by_user[uid].append(r.get("rating", 0))
    
    for user_id, rating_values in ratings_by_user.items():
        if not rating_values:
            continue
        
        avg_rating = round(sum(rating_values) / len(rating_values), 2)
        count = len(rating_values)
        
        # Update workforce_profile
        update_result = await db.workforce_profiles.update_one(
            {"workforce_id": user_id},
            {"$set": {
                "general_rating_avg": avg_rating,
                "general_rating_count": count,
                "updated_date": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if update_result.modified_count > 0:
            results["workforce_profiles_updated"] += 1
            print(f"  Updated workforce {user_id}: avg={avg_rating}, count={count}")
        
        results["shift_ratings_propagated"] += count
    
    print(f"  Propagated {results['shift_ratings_propagated']} ratings to {results['workforce_profiles_updated']} profiles")

    # ========== STEP 3: Clean broken employment_relationships ==========
    print("\n=== STEP 3: Clean broken employment_relationships ===")
    
    # Refresh valid workforce IDs (after Step 1 cleanup)
    valid_wf_ids_fresh = set()
    async for wf in db.workforce_profiles.find({}, {"workforce_id": 1}):
        valid_wf_ids_fresh.add(wf.get("workforce_id"))
    
    all_emp = await db.employment_relationships.find({}, {"_id": 1, "workforce_id": 1}).to_list(None)
    
    broken_emp_ids = []
    for emp in all_emp:
        wfid = emp.get("workforce_id")
        if not wfid or wfid not in valid_wf_ids_fresh:
            broken_emp_ids.append(emp["_id"])
    
    if broken_emp_ids:
        result = await db.employment_relationships.delete_many({"_id": {"$in": broken_emp_ids}})
        results["employment_relationships_deleted"] = result.deleted_count
        print(f"  Deleted {result.deleted_count} broken employment relationships")
    else:
        print("  No broken employment relationships found")

    # ========== STEP 4: Add workforce_id to blockchain_credentials ==========
    print("\n=== STEP 4: Add workforce_id to blockchain_credentials ===")
    
    # For each blockchain_credential that has worker_id but no workforce_id, copy worker_id -> workforce_id
    bc_cursor = db.blockchain_credentials.find(
        {"worker_id": {"$exists": True}, "workforce_id": {"$exists": False}},
        {"_id": 1, "worker_id": 1}
    )
    
    bc_count = 0
    async for bc in bc_cursor:
        await db.blockchain_credentials.update_one(
            {"_id": bc["_id"]},
            {"$set": {"workforce_id": bc["worker_id"]}}
        )
        bc_count += 1
    
    results["blockchain_credentials_updated"] = bc_count
    print(f"  Added workforce_id to {bc_count} blockchain credentials")

    # ========== STEP 5: Sync occupation_count on workforce_profiles ==========
    print("\n=== STEP 5: Sync occupation_count on workforce_profiles ===")
    
    sync_count = 0
    async for wf in db.workforce_profiles.find({}, {"workforce_id": 1, "occupation_count": 1}):
        wfid = wf.get("workforce_id")
        actual_count = await db.occupation_profiles.count_documents({"workforce_id": wfid})
        stored_count = wf.get("occupation_count", 0)
        
        if actual_count != stored_count:
            await db.workforce_profiles.update_one(
                {"workforce_id": wfid},
                {"$set": {"occupation_count": actual_count}}
            )
            sync_count += 1
            print(f"  Fixed {wfid}: {stored_count} -> {actual_count}")
    
    results["occupation_counts_synced"] = sync_count
    print(f"  Synced {sync_count} occupation counts")

    # ========== STEP 6: Create indexes ==========
    print("\n=== STEP 6: Create indexes ===")
    
    indexes_to_create = [
        ("occupation_profiles", [("workforce_id", 1)], "idx_occ_workforce_id"),
        ("occupation_profiles", [("occupation_id", 1)], "idx_occ_occupation_id"),
        ("shift_ratings", [("rated_user_id", 1)], "idx_sr_rated_user_id"),
        ("shift_ratings", [("shift_id", 1), ("worker_id", 1)], "idx_sr_shift_worker"),
        ("employment_relationships", [("workforce_id", 1)], "idx_emp_workforce_id"),
        ("employment_relationships", [("employer_id", 1)], "idx_emp_employer_id"),
        ("blockchain_credentials", [("worker_id", 1)], "idx_bc_worker_id"),
        ("blockchain_credentials", [("workforce_id", 1)], "idx_bc_workforce_id"),
        ("workforce_credentials", [("workforce_id", 1)], "idx_wfc_workforce_id"),
        ("workforce_profiles", [("workforce_id", 1)], "idx_wfp_workforce_id"),
    ]
    
    for collection_name, keys, index_name in indexes_to_create:
        try:
            await db[collection_name].create_index(keys, name=index_name, background=True)
            results["indexes_created"].append(index_name)
            print(f"  Created index: {collection_name}.{index_name}")
        except Exception as e:
            print(f"  Index {index_name} skipped: {e}")

    # ========== SUMMARY ==========
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE - SUMMARY")
    print("=" * 60)
    for key, val in results.items():
        print(f"  {key}: {val}")
    
    # Post-migration verification
    print("\n=== POST-MIGRATION VERIFICATION ===")
    occ_total = await db.occupation_profiles.count_documents({})
    sr_total = await db.shift_ratings.count_documents({})
    emp_total = await db.employment_relationships.count_documents({})
    bc_total = await db.blockchain_credentials.count_documents({})
    wf_total = await db.workforce_profiles.count_documents({})
    
    print(f"  occupation_profiles: {occ_total}")
    print(f"  shift_ratings: {sr_total}")
    print(f"  employment_relationships: {emp_total}")
    print(f"  blockchain_credentials: {bc_total}")
    print(f"  workforce_profiles: {wf_total}")
    
    # Verify no more orphans
    remaining_orphans = 0
    all_occ_post = await db.occupation_profiles.find({}, {"workforce_id": 1, "user_id": 1}).to_list(None)
    for occ in all_occ_post:
        ref = occ.get("workforce_id") or occ.get("user_id")
        if not ref or ref not in all_valid_ids:
            remaining_orphans += 1
    print(f"  Remaining orphan occupation_profiles: {remaining_orphans}")
    
    # Verify ratings propagated
    rated_wf = await db.workforce_profiles.count_documents({"general_rating_count": {"$gt": 0}})
    print(f"  Workforce profiles with ratings: {rated_wf}")
    
    client.close()
    return results


if __name__ == "__main__":
    asyncio.run(run_migration())
