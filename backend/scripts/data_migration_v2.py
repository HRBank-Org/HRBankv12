"""
Data Integrity Migration Script v2 - ALL Profile Types
Comprehensive cleanup across Admin, Employer, Institution, WorkPassport, and Workforce.

Issues addressed:
1. Admin: 2 orphan admin_profiles
2. Employer: 5 orphan employer_profiles
3. Institution: 77 orphan institution_profiles (test data)
4. WorkPassport: 1 orphan workpassport_profile
5. Workforce: 43 orphan workforce_profiles (including 30 with null workforce_id)
6. Attendance: 52 orphan attendance_records
7. Timesheets: 13 orphan timesheets
8. Notifications: 17 orphan notifications
9. EULA: 22 orphan eula_acceptances
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
    
    results = {}
    
    # Build master user_id set
    user_ids = set()
    async for u in db.users.find({}, {"user_id": 1}):
        user_ids.add(u.get("user_id"))
    
    print(f"Total valid user accounts: {len(user_ids)}")
    
    # ========== STEP 1: Clean admin_profiles ==========
    print("\n=== STEP 1: Clean orphan admin_profiles ===")
    admin_orphans = []
    async for ap in db.admin_profiles.find({}, {"_id": 1, "admin_id": 1}):
        aid = ap.get("admin_id")
        if not aid or aid not in user_ids:
            admin_orphans.append(ap["_id"])
    
    if admin_orphans:
        r = await db.admin_profiles.delete_many({"_id": {"$in": admin_orphans}})
        results["admin_profiles_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan admin_profiles")
    else:
        results["admin_profiles_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 2: Clean employer_profiles ==========
    print("\n=== STEP 2: Clean orphan employer_profiles ===")
    emp_orphans = []
    async for ep in db.employer_profiles.find({}, {"_id": 1, "employer_id": 1}):
        eid = ep.get("employer_id")
        if not eid or eid not in user_ids:
            emp_orphans.append(ep["_id"])
    
    if emp_orphans:
        r = await db.employer_profiles.delete_many({"_id": {"$in": emp_orphans}})
        results["employer_profiles_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan employer_profiles")
    else:
        results["employer_profiles_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 3: Clean institution_profiles ==========
    print("\n=== STEP 3: Clean orphan institution_profiles ===")
    inst_orphans = []
    async for ip in db.institution_profiles.find({}, {"_id": 1, "institution_id": 1}):
        iid = ip.get("institution_id")
        if not iid or iid not in user_ids:
            inst_orphans.append(ip["_id"])
    
    if inst_orphans:
        r = await db.institution_profiles.delete_many({"_id": {"$in": inst_orphans}})
        results["institution_profiles_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan institution_profiles")
    else:
        results["institution_profiles_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 4: Clean workpassport_profiles ==========
    print("\n=== STEP 4: Clean orphan workpassport_profiles ===")
    wp_orphans = []
    async for wp in db.workpassport_profiles.find({}, {"_id": 1, "user_id": 1}):
        uid = wp.get("user_id")
        if not uid or uid not in user_ids:
            wp_orphans.append(wp["_id"])
    
    if wp_orphans:
        r = await db.workpassport_profiles.delete_many({"_id": {"$in": wp_orphans}})
        results["workpassport_profiles_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan workpassport_profiles")
    else:
        results["workpassport_profiles_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 5: Clean workforce_profiles ==========
    print("\n=== STEP 5: Clean orphan workforce_profiles ===")
    wf_orphans = []
    async for wf in db.workforce_profiles.find({}, {"_id": 1, "workforce_id": 1}):
        wfid = wf.get("workforce_id")
        if not wfid or wfid not in user_ids:
            wf_orphans.append(wf["_id"])
    
    if wf_orphans:
        r = await db.workforce_profiles.delete_many({"_id": {"$in": wf_orphans}})
        results["workforce_profiles_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan workforce_profiles")
    else:
        results["workforce_profiles_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 6: Clean orphan attendance_records ==========
    print("\n=== STEP 6: Clean orphan attendance_records ===")
    att_orphans = []
    async for a in db.attendance_records.find({}, {"_id": 1, "worker_id": 1, "workforce_id": 1}):
        wid = a.get("worker_id") or a.get("workforce_id")
        if wid and wid not in user_ids:
            att_orphans.append(a["_id"])
    
    if att_orphans:
        r = await db.attendance_records.delete_many({"_id": {"$in": att_orphans}})
        results["attendance_records_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan attendance_records")
    else:
        results["attendance_records_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 7: Clean orphan timesheets ==========
    print("\n=== STEP 7: Clean orphan timesheets ===")
    ts_orphans = []
    async for t in db.timesheets.find({}, {"_id": 1, "worker_id": 1, "workforce_id": 1}):
        wid = t.get("worker_id") or t.get("workforce_id")
        if wid and wid not in user_ids:
            ts_orphans.append(t["_id"])
    
    if ts_orphans:
        r = await db.timesheets.delete_many({"_id": {"$in": ts_orphans}})
        results["timesheets_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan timesheets")
    else:
        results["timesheets_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 8: Clean orphan notifications ==========
    print("\n=== STEP 8: Clean orphan notifications ===")
    notif_orphans = []
    async for n in db.notifications.find({}, {"_id": 1, "user_id": 1}):
        uid = n.get("user_id")
        if uid and uid not in user_ids:
            notif_orphans.append(n["_id"])
    
    if notif_orphans:
        r = await db.notifications.delete_many({"_id": {"$in": notif_orphans}})
        results["notifications_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan notifications")
    else:
        results["notifications_deleted"] = 0
        print("  No orphans found")

    # ========== STEP 9: Clean orphan eula_acceptances ==========
    print("\n=== STEP 9: Clean orphan eula_acceptances ===")
    eula_orphans = []
    async for e in db.eula_acceptances.find({}, {"_id": 1, "user_id": 1}):
        uid = e.get("user_id")
        if uid and uid not in user_ids:
            eula_orphans.append(e["_id"])
    
    if eula_orphans:
        r = await db.eula_acceptances.delete_many({"_id": {"$in": eula_orphans}})
        results["eula_acceptances_deleted"] = r.deleted_count
        print(f"  Deleted {r.deleted_count} orphan eula_acceptances")
    else:
        results["eula_acceptances_deleted"] = 0
        print("  No orphans found")

    # ========== SUMMARY ==========
    print("\n" + "=" * 60)
    print("MIGRATION V2 COMPLETE - SUMMARY")
    print("=" * 60)
    total_cleaned = sum(results.values())
    for key, val in results.items():
        print(f"  {key}: {val}")
    print(f"  TOTAL records cleaned: {total_cleaned}")

    # ========== POST-MIGRATION VERIFICATION ==========
    print("\n=== POST-MIGRATION VERIFICATION ===")
    
    checks = {
        "admin_profiles": ("admin_id", db.admin_profiles),
        "employer_profiles": ("employer_id", db.employer_profiles),
        "institution_profiles": ("institution_id", db.institution_profiles),
        "workpassport_profiles": ("user_id", db.workpassport_profiles),
        "workforce_profiles": ("workforce_id", db.workforce_profiles),
    }
    
    all_clean = True
    for name, (id_field, collection) in checks.items():
        total = await collection.count_documents({})
        orphans = 0
        async for doc in collection.find({}, {"_id": 0, id_field: 1}):
            ref_id = doc.get(id_field)
            if not ref_id or ref_id not in user_ids:
                orphans += 1
        status = "CLEAN" if orphans == 0 else f"ISSUE ({orphans} orphans)"
        if orphans > 0:
            all_clean = False
        print(f"  {name}: {total} total, {status}")
    
    # Check related collections
    for name, id_fields, collection in [
        ("attendance_records", ["worker_id", "workforce_id"], db.attendance_records),
        ("timesheets", ["worker_id", "workforce_id"], db.timesheets),
        ("notifications", ["user_id"], db.notifications),
        ("eula_acceptances", ["user_id"], db.eula_acceptances),
    ]:
        total = await collection.count_documents({})
        orphans = 0
        async for doc in collection.find({}, {"_id": 0, **{f: 1 for f in id_fields}}):
            ref_id = None
            for f in id_fields:
                ref_id = doc.get(f)
                if ref_id:
                    break
            if ref_id and ref_id not in user_ids:
                orphans += 1
        status = "CLEAN" if orphans == 0 else f"ISSUE ({orphans} orphans)"
        if orphans > 0:
            all_clean = False
        print(f"  {name}: {total} total, {status}")
    
    print(f"\nALL CLEAN: {all_clean}")
    
    client.close()
    return results


if __name__ == "__main__":
    asyncio.run(run_migration())
