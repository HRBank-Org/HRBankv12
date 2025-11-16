"""
Background scheduler for document expiry checks and reminders
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from services.email_service import send_document_expiry_reminder, send_account_restricted_email
import asyncio

# Global scheduler instance
scheduler = None

async def check_and_send_expiry_reminders(db):
    """
    Check for expiring documents and send email reminders
    This runs daily at 9 AM
    """
    print(f"[{datetime.utcnow()}] Running document expiry check...")
    
    try:
        # Get all documents with expiry dates that are verified
        documents = await db.documents.find({
            "expiry_date": {"$ne": None},
            "verification_status": "verified"
        }).to_list(10000)
        
        emails_sent = 0
        accounts_restricted = 0
        
        for doc in documents:
            if not doc.get("expiry_date"):
                continue
            
            try:
                # Calculate days until expiry
                from datetime import timezone
                expiry_date_obj = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
                now_utc = datetime.now(timezone.utc)
                days_until = (expiry_date_obj - now_utc).days
                
                # Send reminder if expiring within 7 days (including today)
                if 0 <= days_until <= 7:
                    # Get user info
                    user = await db.users.find_one({"user_id": doc["user_id"]})
                    if not user:
                        continue
                    
                    # Get user profile for name
                    user_type = user.get("user_type")
                    full_name = user.get("full_name", "User")
                    
                    if user_type == "workforce":
                        profile = await db.workforce_profiles.find_one({"user_id": doc["user_id"]})
                        if profile:
                            full_name = profile.get("full_name", full_name)
                    elif user_type == "employer":
                        profile = await db.employer_profiles.find_one({"user_id": doc["user_id"]})
                        if profile:
                            full_name = profile.get("contact_name", full_name)
                    elif user_type == "institution":
                        profile = await db.institution_profiles.find_one({"user_id": doc["user_id"]})
                        if profile:
                            full_name = profile.get("contact_name", full_name)
                    
                    # Check if reminder already sent today
                    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                    last_reminder = doc.get("last_reminder_sent")
                    
                    # Send reminder if not sent today
                    if not last_reminder or datetime.fromisoformat(last_reminder) < today_start:
                        success = send_document_expiry_reminder(
                            recipient_email=user.get("email"),
                            recipient_name=full_name,
                            document_name=doc.get("document_name", "Document"),
                            document_type=doc.get("document_type", ""),
                            expiry_date=doc["expiry_date"],
                            days_until_expiry=days_until
                        )
                        
                        if success:
                            # Update last reminder sent timestamp
                            await db.documents.update_one(
                                {"document_id": doc["document_id"]},
                                {"$set": {"last_reminder_sent": datetime.utcnow().isoformat()}}
                            )
                            emails_sent += 1
                            print(f"  ✓ Sent reminder to {user.get('email')} for {doc.get('document_name')} ({days_until} days)")
                
                # Handle expired documents (days_until < 0)
                elif days_until < 0:
                    # Mark document as expired
                    if doc.get("verification_status") != "expired":
                        await db.documents.update_one(
                            {"document_id": doc["document_id"]},
                            {"$set": {
                                "verification_status": "expired",
                                "is_expired": True
                            }}
                        )
                    
                    # Check if user account needs to be restricted
                    await check_and_restrict_account(db, doc["user_id"], doc["user_type"])
                    accounts_restricted += 1
                    
            except Exception as e:
                print(f"  ✗ Error processing document {doc.get('document_id')}: {str(e)}")
                continue
        
        print(f"[{datetime.utcnow()}] Expiry check complete: {emails_sent} reminders sent, {accounts_restricted} accounts checked for restriction")
        return {"emails_sent": emails_sent, "accounts_checked": accounts_restricted}
        
    except Exception as e:
        print(f"[{datetime.utcnow()}] ERROR in expiry check: {str(e)}")
        return {"error": str(e)}


async def check_and_restrict_account(db, user_id: str, user_type: str):
    """
    Check if user has expired required documents and restrict account if needed
    """
    from models.documents import (
        WORKFORCE_DOCUMENT_TYPES, 
        EMPLOYER_DOCUMENT_TYPES, 
        INSTITUTION_DOCUMENT_TYPES, 
        ADMIN_DOCUMENT_TYPES
    )
    
    # Get document types for this user
    type_map = {
        'workforce': WORKFORCE_DOCUMENT_TYPES,
        'employer': EMPLOYER_DOCUMENT_TYPES,
        'institution': INSTITUTION_DOCUMENT_TYPES,
        'admin': ADMIN_DOCUMENT_TYPES
    }
    document_types = type_map.get(user_type, {})
    required_types = [k for k, v in document_types.items() if v.get('required')]
    
    # Get all user documents
    documents = await db.documents.find({"user_id": user_id}).to_list(100)
    
    # Check which required documents are valid (verified and not expired)
    valid_required = []
    expired_documents = []
    
    for doc in documents:
        if doc.get("document_type") in required_types:
            # Check if expired
            if doc.get("expiry_date"):
                try:
                    from datetime import timezone
                    expiry_date_obj = datetime.fromisoformat(doc["expiry_date"].replace('Z', '+00:00'))
                    now_utc = datetime.now(timezone.utc)
                    is_expired = (expiry_date_obj - now_utc).days < 0
                    
                    if is_expired:
                        expired_documents.append(doc.get("document_name", doc.get("document_type")))
                    elif doc.get("verification_status") == "verified":
                        valid_required.append(doc.get("document_type"))
                except:
                    pass
            elif doc.get("verification_status") == "verified":
                # No expiry date means document doesn't expire
                valid_required.append(doc.get("document_type"))
    
    # Check if all required documents are valid
    missing_or_expired = [req for req in required_types if req not in valid_required]
    
    # Get current account status
    user = await db.users.find_one({"user_id": user_id})
    current_status = user.get("account_status", "active")
    
    if missing_or_expired:
        # Restrict account
        new_status = "restricted"
        
        if current_status != "restricted":
            # Update account status
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "account_status": new_status,
                    "restriction_reason": "expired_documents",
                    "restricted_date": datetime.utcnow().isoformat()
                }}
            )
            
            # Send account restriction email
            if expired_documents:
                # Get user profile for name
                full_name = user.get("full_name", "User")
                
                if user_type == "workforce":
                    profile = await db.workforce_profiles.find_one({"user_id": user_id})
                    if profile:
                        full_name = profile.get("full_name", full_name)
                elif user_type == "employer":
                    profile = await db.employer_profiles.find_one({"user_id": user_id})
                    if profile:
                        full_name = profile.get("contact_name", full_name)
                elif user_type == "institution":
                    profile = await db.institution_profiles.find_one({"user_id": user_id})
                    if profile:
                        full_name = profile.get("contact_name", full_name)
                
                send_account_restricted_email(
                    recipient_email=user.get("email"),
                    recipient_name=full_name,
                    expired_documents=expired_documents
                )
                
                print(f"  ⚠ Account restricted for user {user_id} due to expired documents: {', '.join(expired_documents)}")
    else:
        # All required documents are valid, ensure account is active
        if current_status == "restricted" and user.get("restriction_reason") == "expired_documents":
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "account_status": "active",
                    "restriction_reason": None,
                    "restricted_date": None
                }}
            )
            print(f"  ✓ Account reactivated for user {user_id} - all documents now valid")


def start_scheduler(db):
    """
    Start the background scheduler for document expiry checks
    
    Args:
        db: MongoDB database instance
    """
    global scheduler
    
    if scheduler is not None:
        print("Scheduler already running")
        return scheduler
    
    scheduler = AsyncIOScheduler()
    
    # Schedule daily check at 9 AM UTC
    scheduler.add_job(
        check_and_send_expiry_reminders,
        CronTrigger(hour=9, minute=0),  # 9:00 AM UTC daily
        args=[db],
        id='document_expiry_check',
        name='Document Expiry Reminder Check',
        replace_existing=True
    )
    
    scheduler.start()
    print(f"[{datetime.utcnow()}] Document expiry scheduler started - will run daily at 9:00 AM UTC")
    
    return scheduler


def stop_scheduler():
    """Stop the background scheduler"""
    global scheduler
    
    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
        print("Document expiry scheduler stopped")


async def run_manual_check(db):
    """
    Manually trigger an expiry check (for testing or admin action)
    
    Args:
        db: MongoDB database instance
    
    Returns:
        dict: Results of the check
    """
    print("[MANUAL] Running document expiry check...")
    result = await check_and_send_expiry_reminders(db)
    return result
