"""
Workforce Cleanup Service
Handles automatic termination of workers who have been unassigned for more than 2 weeks.
This service should be run periodically (e.g., daily via a cron job or scheduler).
"""

from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


async def get_unassigned_workers_for_termination(db: AsyncIOMotorDatabase, employer_id: str = None):
    """
    Get all workers who have been unassigned for more than 14 days.
    Optionally filter by employer_id.
    
    Returns list of workers eligible for auto-termination.
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=14)
    
    query = {
        "status": "unassigned",
        "unassigned_date": {"$lte": cutoff_date}
    }
    
    if employer_id:
        query["employer_id"] = employer_id
    
    workers = await db.workforce_inventory.find(
        query,
        {"_id": 0}
    ).to_list(1000)
    
    return workers


async def terminate_unassigned_workers(db: AsyncIOMotorDatabase, employer_id: str = None, dry_run: bool = False):
    """
    Terminate workers who have been unassigned for more than 14 days.
    
    Args:
        db: Database connection
        employer_id: Optional - filter by specific employer
        dry_run: If True, only return what would be terminated without making changes
        
    Returns:
        dict with terminated_count and terminated_workers list
    """
    workers = await get_unassigned_workers_for_termination(db, employer_id)
    
    if dry_run:
        return {
            "dry_run": True,
            "would_terminate_count": len(workers),
            "workers": workers
        }
    
    terminated_workers = []
    
    for worker in workers:
        worker_id = worker.get("workforce_id") or worker.get("user_id")
        emp_id = worker.get("employer_id")
        
        if not worker_id:
            continue
        
        try:
            # Update worker status to terminated in inventory
            await db.workforce_inventory.update_one(
                {"workforce_id": worker_id, "employer_id": emp_id},
                {
                    "$set": {
                        "status": "terminated",
                        "terminated_at": datetime.now(timezone.utc),
                        "termination_reason": "auto_terminated_unassigned_14_days",
                        "termination_type": "automatic"
                    }
                }
            )
            
            # Log the termination
            termination_log = {
                "log_id": f"term_{datetime.now().strftime('%Y%m%d%H%M%S')}_{worker_id[:8]}",
                "workforce_id": worker_id,
                "employer_id": emp_id,
                "action": "auto_termination",
                "reason": "Unassigned for more than 14 days",
                "previous_status": "unassigned",
                "new_status": "terminated",
                "unassigned_since": worker.get("unassigned_date"),
                "created_at": datetime.now(timezone.utc)
            }
            await db.workforce_activity_logs.insert_one(termination_log)
            
            terminated_workers.append({
                "workforce_id": worker_id,
                "employer_id": emp_id,
                "unassigned_since": worker.get("unassigned_date")
            })
            
            logger.info(f"Auto-terminated worker {worker_id} for employer {emp_id}")
            
        except Exception as e:
            logger.error(f"Failed to terminate worker {worker_id}: {e}")
    
    return {
        "terminated_count": len(terminated_workers),
        "terminated_workers": terminated_workers
    }


async def cleanup_expired_invitations(db: AsyncIOMotorDatabase, days_expired: int = 30):
    """
    Clean up invitations that have been expired for more than the specified days.
    
    Args:
        db: Database connection
        days_expired: Number of days past expiration to clean up (default 30)
        
    Returns:
        Number of invitations cleaned up
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_expired)
    
    result = await db.invitations.delete_many({
        "status": {"$in": ["expired", "cancelled"]},
        "expires_at": {"$lte": cutoff_date}
    })
    
    logger.info(f"Cleaned up {result.deleted_count} expired invitations")
    
    return result.deleted_count


async def get_workforce_inventory_stats(db: AsyncIOMotorDatabase, employer_id: str):
    """
    Get statistics about workforce inventory for an employer.
    
    Returns counts by status and workers approaching auto-termination.
    """
    pipeline = [
        {"$match": {"employer_id": employer_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    status_counts = {}
    async for doc in db.workforce_inventory.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    # Get workers approaching termination (7-14 days unassigned)
    warning_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    termination_cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    
    approaching_termination = await db.workforce_inventory.find({
        "employer_id": employer_id,
        "status": "unassigned",
        "unassigned_date": {
            "$lte": warning_cutoff,
            "$gt": termination_cutoff
        }
    }, {"_id": 0, "workforce_id": 1, "name": 1, "email": 1, "unassigned_date": 1}).to_list(100)
    
    # Calculate days until termination for each
    for worker in approaching_termination:
        if worker.get("unassigned_date"):
            unassigned_date = worker["unassigned_date"]
            if isinstance(unassigned_date, str):
                unassigned_date = datetime.fromisoformat(unassigned_date.replace('Z', '+00:00'))
            days_unassigned = (datetime.now(timezone.utc) - unassigned_date).days
            worker["days_until_termination"] = max(0, 14 - days_unassigned)
    
    return {
        "status_counts": status_counts,
        "total": sum(status_counts.values()),
        "approaching_termination": approaching_termination,
        "approaching_termination_count": len(approaching_termination)
    }


async def run_daily_cleanup(db: AsyncIOMotorDatabase):
    """
    Run all daily cleanup tasks. Call this from a scheduler or cron job.
    """
    results = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "tasks": {}
    }
    
    # 1. Terminate unassigned workers (all employers)
    try:
        termination_result = await terminate_unassigned_workers(db)
        results["tasks"]["auto_termination"] = termination_result
    except Exception as e:
        logger.error(f"Auto-termination task failed: {e}")
        results["tasks"]["auto_termination"] = {"error": str(e)}
    
    # 2. Clean up expired invitations
    try:
        cleanup_count = await cleanup_expired_invitations(db)
        results["tasks"]["invitation_cleanup"] = {"cleaned_count": cleanup_count}
    except Exception as e:
        logger.error(f"Invitation cleanup task failed: {e}")
        results["tasks"]["invitation_cleanup"] = {"error": str(e)}
    
    logger.info(f"Daily cleanup completed: {results}")
    
    return results
