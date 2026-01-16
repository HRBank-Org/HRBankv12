"""
Enhanced Background Scheduler for Document Expiry
Multi-interval reminders via Email and SMS
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


async def run_daily_expiry_check(db):
    """
    Daily document expiry check - runs at 9 AM UTC.
    Sends reminders at: 30 days, 14 days, 7 days, 3 days, 1 day, and expiry day.
    """
    logger.info(f"[{datetime.now(timezone.utc)}] Starting daily document expiry check...")
    
    try:
        from services.document_expiry_service import document_expiry_service
        
        # Process all reminders
        results = await document_expiry_service.process_all_reminders(send_sms=True)
        
        logger.info(f"[{datetime.now(timezone.utc)}] Expiry check complete:")
        logger.info(f"  - Documents processed: {results['total_processed']}")
        logger.info(f"  - Reminders sent: {results['reminders_sent']}")
        logger.info(f"  - Emails sent: {results['emails_sent']}")
        logger.info(f"  - SMS sent: {results['sms_sent']}")
        
        if results['by_interval']:
            logger.info(f"  - By interval: {results['by_interval']}")
        
        if results['errors']:
            logger.warning(f"  - Errors: {len(results['errors'])}")
        
        # Also process expired documents (mark as expired, restrict accounts)
        await process_expired_documents(db)
        
        return results
        
    except Exception as e:
        logger.error(f"[{datetime.now(timezone.utc)}] ERROR in expiry check: {str(e)}")
        return {"error": str(e)}


async def process_expired_documents(db):
    """Process documents that have expired - mark them and restrict accounts if needed"""
    from services.document_expiry_service import document_expiry_service
    from services.email_service import send_account_restricted_email
    
    now = datetime.now(timezone.utc)
    
    # Find expired but not yet marked documents
    expired_docs = await db.documents.find({
        "expiry_date": {"$lt": now.isoformat()},
        "verification_status": {"$ne": "expired"}
    }).to_list(10000)
    
    accounts_to_check = set()
    
    for doc in expired_docs:
        # Mark as expired
        await db.documents.update_one(
            {"document_id": doc["document_id"]},
            {"$set": {
                "verification_status": "expired",
                "is_expired": True,
                "expired_at": now.isoformat()
            }}
        )
        
        accounts_to_check.add((doc["user_id"], doc.get("user_type", "workforce")))
        logger.info(f"Marked document {doc['document_id']} as expired")
    
    # Check and potentially restrict accounts
    for user_id, user_type in accounts_to_check:
        await check_and_restrict_account(db, user_id, user_type)


async def check_and_restrict_account(db, user_id: str, user_type: str):
    """
    Check if user has expired required documents and restrict account if needed.
    """
    from services.document_expiry_service import DOCUMENTS_REQUIRING_EXPIRY
    from services.email_service import send_account_restricted_email
    
    # Get user
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return
    
    # Get all user documents
    documents = await db.documents.find({"user_id": user_id}).to_list(100)
    
    # Find expired required documents
    expired_required = []
    for doc in documents:
        doc_type = doc.get("document_type", "")
        if doc_type in DOCUMENTS_REQUIRING_EXPIRY:
            if doc.get("verification_status") == "expired" or doc.get("is_expired"):
                doc_name = DOCUMENTS_REQUIRING_EXPIRY.get(doc_type, {}).get("name", doc_type)
                expired_required.append(doc_name)
    
    if expired_required:
        current_status = user.get("account_status", "active")
        
        if current_status != "restricted":
            # Restrict account
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "account_status": "restricted",
                    "restriction_reason": "expired_documents",
                    "restricted_date": datetime.now(timezone.utc).isoformat(),
                    "expired_documents": expired_required
                }}
            )
            
            # Get user profile for name
            from services.document_expiry_service import document_expiry_service
            profile = await document_expiry_service._get_user_profile(user_id, user_type)
            full_name = profile.get("full_name") or profile.get("contact_name") or "User"
            
            # Send restriction email
            send_account_restricted_email(
                recipient_email=user.get("email"),
                recipient_name=full_name,
                expired_documents=expired_required
            )
            
            # Send restriction SMS
            phone = profile.get("phone") or user.get("phone")
            if phone:
                try:
                    from services.sms_service import send_sms
                    await send_sms(
                        phone,
                        f"HR Bank: Your account has been restricted due to expired documents ({', '.join(expired_required[:2])}). Please upload renewed documents to restore access."
                    )
                except Exception as e:
                    logger.error(f"Failed to send restriction SMS: {str(e)}")
            
            logger.warning(f"Account restricted for user {user_id} due to expired: {', '.join(expired_required)}")
            
            # Log to audit
            from services.audit_logger import audit_logger, AuditEventType, AuditSeverity
            await audit_logger.log(
                event_type=AuditEventType.USER_DEACTIVATED,
                action="account_restricted",
                description=f"Account restricted due to expired documents",
                actor_type="system",
                target_type="user",
                target_id=user_id,
                severity=AuditSeverity.WARNING,
                metadata={"expired_documents": expired_required}
            )


def start_scheduler(db):
    """
    Start the background scheduler for document expiry checks.
    
    Args:
        db: MongoDB database instance
    """
    global scheduler
    
    if scheduler is not None:
        logger.info("Scheduler already running")
        return scheduler
    
    scheduler = AsyncIOScheduler()
    
    # Schedule daily check at 9 AM UTC
    scheduler.add_job(
        run_daily_expiry_check,
        CronTrigger(hour=9, minute=0),
        args=[db],
        id='document_expiry_check',
        name='Daily Document Expiry Check',
        replace_existing=True
    )
    
    # Also run a check at 6 PM UTC for urgent (same-day/next-day) reminders
    scheduler.add_job(
        run_daily_expiry_check,
        CronTrigger(hour=18, minute=0),
        args=[db],
        id='document_expiry_check_evening',
        name='Evening Document Expiry Check',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info(f"[{datetime.now(timezone.utc)}] Document expiry scheduler started")
    logger.info("  - Daily check at 9:00 AM UTC")
    logger.info("  - Evening check at 6:00 PM UTC")
    logger.info("  - Reminder intervals: 30, 14, 7, 3, 1, 0 days")
    
    return scheduler


def stop_scheduler():
    """Stop the background scheduler"""
    global scheduler
    
    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
        logger.info("Document expiry scheduler stopped")


async def run_manual_check(db):
    """
    Manually trigger an expiry check (for testing or admin action).
    
    Args:
        db: MongoDB database instance
    
    Returns:
        dict: Results of the check
    """
    logger.info("[MANUAL] Running document expiry check...")
    result = await run_daily_expiry_check(db)
    return result
