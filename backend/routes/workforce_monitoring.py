from fastapi import APIRouter, Depends
from typing import Dict
from datetime import datetime, timedelta, timezone
from auth.dependencies import require_role
import uuid

router = APIRouter(prefix="/api/admin/workforce-monitoring", tags=["Workforce Monitoring"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

@router.post("/check-inactive-workers", response_model=Dict)
async def check_inactive_workers(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Cron job endpoint: Check for workers who haven't received shifts in 14 days
    Return them to workforce pool (deactivate employment relationship)
    """
    
    fourteen_days_ago = datetime.now(timezone.utc) - timedelta(days=14)
    
    # Find all active employment relationships
    relationships = await db.employment_relationships.find({
        "status": "active"
    }, {"_id": 0}).to_list(10000)
    
    workers_returned_to_pool = []
    workers_warned = []
    
    for rel in relationships:
        workforce_id = rel['workforce_id']
        employer_id = rel['employer_id']
        
        # Get last completed shift for this worker with this employer
        last_shift = await db.bookings.find_one(
            {
                "workforce_id": workforce_id,
                "employer_id": employer_id,
                "status": "completed"
            },
            {"_id": 0},
            sort=[("end_time", -1)]
        )
        
        # Determine last shift date
        if last_shift:
            last_shift_date_str = last_shift.get('end_time') or last_shift.get('shift_date')
            if last_shift_date_str:
                if isinstance(last_shift_date_str, str):
                    last_shift_date = datetime.fromisoformat(last_shift_date_str.replace('Z', '+00:00'))
                else:
                    last_shift_date = last_shift_date_str
            else:
                last_shift_date = None
        else:
            # No shifts ever - use employment start date
            start_date_str = rel.get('employment_start_date')
            if start_date_str:
                if isinstance(start_date_str, str):
                    last_shift_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                else:
                    last_shift_date = start_date_str
            else:
                last_shift_date = datetime.now(timezone.utc)
        
        # Check if more than 14 days without shift
        if last_shift_date and last_shift_date < fourteen_days_ago:
            days_without_shift = (datetime.now(timezone.utc) - last_shift_date).days
            
            # Update relationship status
            await db.employment_relationships.update_one(
                {"relationship_id": rel['relationship_id']},
                {"$set": {
                    "status": "inactive",
                    "termination_reason": "auto_return_to_pool",
                    "employment_end_date": datetime.now(timezone.utc).isoformat(),
                    "days_without_shift": days_without_shift,
                    "last_shift_date": last_shift_date.isoformat() if last_shift_date else None
                }}
            )
            
            # Send Emma notification to worker
            emma_notification = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": workforce_id,
                "notification_type": "returned_to_pool",
                "title": "Returned to Workforce Pool",
                "message": f"You haven't received shifts from your employer in {days_without_shift} days. You've been returned to the workforce pool and can now accept opportunities from other employers.",
                "priority": "medium",
                "status": "pending",
                "created_date": datetime.now(timezone.utc).isoformat()
            }
            
            await db.notifications.insert_one(emma_notification)
            
            workers_returned_to_pool.append({
                "workforce_id": workforce_id,
                "employer_id": employer_id,
                "days_without_shift": days_without_shift
            })
        
        # Send warning at 10 days (for workers approaching 14-day limit)
        elif last_shift_date:
            days_without_shift = (datetime.now(timezone.utc) - last_shift_date).days
            
            if days_without_shift >= 10 and days_without_shift < 14:
                # Check if warning already sent
                existing_warning = await db.notifications.find_one({
                    "user_id": workforce_id,
                    "notification_type": "shift_warning_10_days",
                    "created_date": {"$gte": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()}
                })
                
                if not existing_warning:
                    # Send warning notification
                    warning_notification = {
                        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                        "user_id": workforce_id,
                        "notification_type": "shift_warning_10_days",
                        "title": "No Recent Shifts",
                        "message": f"You haven't received shifts in {days_without_shift} days. If you don't receive a shift within {14 - days_without_shift} more days, you'll be returned to the workforce pool.",
                        "priority": "medium",
                        "status": "pending",
                        "created_date": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.notifications.insert_one(warning_notification)
                    
                    workers_warned.append({
                        "workforce_id": workforce_id,
                        "employer_id": employer_id,
                        "days_without_shift": days_without_shift
                    })
    
    return {
        "success": True,
        "data": {
            "workers_returned_to_pool": workers_returned_to_pool,
            "workers_warned": workers_warned,
            "total_returned": len(workers_returned_to_pool),
            "total_warned": len(workers_warned)
        },
        "message": f"Returned {len(workers_returned_to_pool)} workers to pool. Warned {len(workers_warned)} workers."
    }

@router.post("/check-incomplete-profiles", response_model=Dict)
async def check_incomplete_profiles(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Cron job endpoint: Check workers with incomplete profiles
    Send Emma reminders and stall accounts if deadline passed
    """
    
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Find workers with incomplete profiles
    incomplete_profiles = await db.workforce_profiles.find({
        "profile_completeness": {"$lt": 100}
    }, {"_id": 0}).to_list(10000)
    
    profiles_stalled = []
    reminders_sent = []
    
    for profile in incomplete_profiles:
        user_id = profile['user_id']
        
        # Check when profile was created
        created_date_str = profile.get('created_date')
        if created_date_str:
            if isinstance(created_date_str, str):
                created_date = datetime.fromisoformat(created_date_str.replace('Z', '+00:00'))
            else:
                created_date = created_date_str
        else:
            continue
        
        days_since_creation = (datetime.now(timezone.utc) - created_date).days
        
        # Stall account if 7+ days with incomplete profile
        if days_since_creation >= 7:
            # Update user status
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "account_status": "stalled",
                    "stall_reason": "incomplete_profile"
                }}
            )
            
            # Send stall notification
            stall_notification = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "notification_type": "account_stalled",
                "title": "Account Stalled",
                "message": "Your account has been temporarily stalled due to incomplete profile. Please complete your profile and submit required documents to reactivate your account.",
                "priority": "high",
                "status": "pending",
                "created_date": datetime.now(timezone.utc).isoformat()
            }
            
            await db.notifications.insert_one(stall_notification)
            
            profiles_stalled.append({
                "user_id": user_id,
                "days_since_creation": days_since_creation,
                "profile_completeness": profile.get('profile_completeness', 0)
            })
        
        # Send reminder at 3 and 5 days
        elif days_since_creation in [3, 5]:
            # Check if reminder already sent today
            existing_reminder = await db.notifications.find_one({
                "user_id": user_id,
                "notification_type": "profile_reminder",
                "created_date": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
            })
            
            if not existing_reminder:
                reminder_notification = {
                    "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "notification_type": "profile_reminder",
                    "title": "Complete Your Profile",
                    "message": f"You have {7 - days_since_creation} days remaining to complete your profile. Your account will be stalled if not completed within the deadline.",
                    "priority": "high",
                    "status": "pending",
                    "created_date": datetime.now(timezone.utc).isoformat()
                }
                
                await db.notifications.insert_one(reminder_notification)
                
                reminders_sent.append({
                    "user_id": user_id,
                    "days_remaining": 7 - days_since_creation
                })
    
    return {
        "success": True,
        "data": {
            "profiles_stalled": profiles_stalled,
            "reminders_sent": reminders_sent,
            "total_stalled": len(profiles_stalled),
            "total_reminders": len(reminders_sent)
        },
        "message": f"Stalled {len(profiles_stalled)} accounts. Sent {len(reminders_sent)} reminders."
    }
