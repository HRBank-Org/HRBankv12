"""
Data Health API - Real-time data integrity monitoring for admin dashboard.
Provides live stats on orphaned records, schema mismatches, and collection health.
"""

from fastapi import APIRouter, Depends
from auth.dependencies import require_role
from typing import Dict
from datetime import datetime, timezone

router = APIRouter(prefix="/admin/data-health", tags=["Data Health"])


def get_db():
    from server import db
    return db


@router.get("", response_model=Dict)
async def get_data_health(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db=Depends(get_db)
):
    """Real-time data integrity scan across all profile types and related collections."""

    user_ids = set()
    user_type_counts = {}
    async for u in db.users.find({}, {"user_id": 1, "user_type": 1}):
        uid = u.get("user_id")
        ut = u.get("user_type", "unknown")
        user_ids.add(uid)
        user_type_counts[ut] = user_type_counts.get(ut, 0) + 1

    # Helper to count orphans
    async def count_orphans(collection, id_field, valid_ids=None):
        if valid_ids is None:
            valid_ids = user_ids
        total = 0
        orphans = 0
        async for doc in collection.find({}, {"_id": 0, id_field: 1}):
            total += 1
            ref = doc.get(id_field)
            if not ref or ref not in valid_ids:
                orphans += 1
        return total, orphans

    async def count_orphans_multi(collection, id_fields, valid_ids=None):
        if valid_ids is None:
            valid_ids = user_ids
        total = 0
        orphans = 0
        async for doc in collection.find({}, {"_id": 0, **{f: 1 for f in id_fields}}):
            total += 1
            ref = None
            for f in id_fields:
                ref = doc.get(f)
                if ref:
                    break
            if ref and ref not in valid_ids:
                orphans += 1
        return total, orphans

    # Profile collections
    wf_profile_ids = set()
    async for wf in db.workforce_profiles.find({}, {"workforce_id": 1}):
        wfid = wf.get("workforce_id")
        if wfid:
            wf_profile_ids.add(wfid)

    emp_profile_ids = set()
    async for ep in db.employer_profiles.find({}, {"employer_id": 1}):
        eid = ep.get("employer_id")
        if eid:
            emp_profile_ids.add(eid)

    inst_profile_ids = set()
    async for ip in db.institution_profiles.find({}, {"institution_id": 1}):
        iid = ip.get("institution_id")
        if iid:
            inst_profile_ids.add(iid)

    # --- Run all checks ---
    admin_total, admin_orphans = await count_orphans(db.admin_profiles, "admin_id")
    emp_total, emp_orphans = await count_orphans(db.employer_profiles, "employer_id")
    inst_total, inst_orphans = await count_orphans(db.institution_profiles, "institution_id")
    wp_total, wp_orphans = await count_orphans(db.workpassport_profiles, "user_id")
    wf_total, wf_orphans = await count_orphans(db.workforce_profiles, "workforce_id")
    occ_total, occ_orphans = await count_orphans(db.occupation_profiles, "workforce_id", wf_profile_ids | user_ids)
    emp_rel_total, emp_rel_orphans = await count_orphans(db.employment_relationships, "workforce_id", wf_profile_ids | user_ids)

    att_total, att_orphans = await count_orphans_multi(db.attendance_records, ["worker_id", "workforce_id"])
    ts_total, ts_orphans = await count_orphans_multi(db.timesheets, ["worker_id", "workforce_id"])
    notif_total, notif_orphans = await count_orphans(db.notifications, "user_id")
    eula_total, eula_orphans = await count_orphans(db.eula_acceptances, "user_id")

    sr_total = await db.shift_ratings.count_documents({})
    bc_total = await db.blockchain_credentials.count_documents({})
    bc_no_wfid = await db.blockchain_credentials.count_documents({"workforce_id": {"$exists": False}})
    wfc_total, wfc_orphans = await count_orphans(db.workforce_credentials, "workforce_id", wf_profile_ids | user_ids)

    # Workforce profiles with propagated ratings
    rated_wf = await db.workforce_profiles.count_documents({"general_rating_count": {"$gt": 0}})

    # Occupation count sync check
    occ_count_mismatch = 0
    async for wf in db.workforce_profiles.find({}, {"workforce_id": 1, "occupation_count": 1}):
        wfid = wf.get("workforce_id")
        if not wfid:
            continue
        actual = await db.occupation_profiles.count_documents({"workforce_id": wfid})
        if actual != wf.get("occupation_count", 0):
            occ_count_mismatch += 1

    # Calculate overall health
    total_issues = (
        admin_orphans + emp_orphans + inst_orphans + wp_orphans + wf_orphans +
        occ_orphans + emp_rel_orphans + att_orphans + ts_orphans +
        notif_orphans + eula_orphans + bc_no_wfid + wfc_orphans + occ_count_mismatch
    )

    if total_issues == 0:
        health_status = "healthy"
    elif total_issues <= 10:
        health_status = "warning"
    else:
        health_status = "critical"

    return {
        "success": True,
        "data": {
            "health_status": health_status,
            "total_issues": total_issues,
            "scan_timestamp": datetime.now(timezone.utc).isoformat(),
            "user_accounts": {
                "total": len(user_ids),
                "by_type": user_type_counts
            },
            "profiles": {
                "admin": {"total": admin_total, "orphans": admin_orphans},
                "employer": {"total": emp_total, "orphans": emp_orphans},
                "institution": {"total": inst_total, "orphans": inst_orphans},
                "workpassport": {"total": wp_total, "orphans": wp_orphans},
                "workforce": {"total": wf_total, "orphans": wf_orphans},
            },
            "related_data": {
                "occupation_profiles": {"total": occ_total, "orphans": occ_orphans},
                "employment_relationships": {"total": emp_rel_total, "orphans": emp_rel_orphans},
                "attendance_records": {"total": att_total, "orphans": att_orphans},
                "timesheets": {"total": ts_total, "orphans": ts_orphans},
                "notifications": {"total": notif_total, "orphans": notif_orphans},
                "eula_acceptances": {"total": eula_total, "orphans": eula_orphans},
                "workforce_credentials": {"total": wfc_total, "orphans": wfc_orphans},
            },
            "special_checks": {
                "shift_ratings": {"total": sr_total},
                "blockchain_credentials": {"total": bc_total, "missing_workforce_id": bc_no_wfid},
                "workforce_with_ratings": rated_wf,
                "occupation_count_mismatches": occ_count_mismatch,
            }
        }
    }
