"""
Institution Notification Service
Handles notifying institutions when workforce users request credential verification.
Part of the growth flywheel: Student requests → Institution gets notified → Institution joins
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
import os

# Try to import SendGrid
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False


async def notify_institution_of_credential_request(
    db: AsyncIOMotorDatabase,
    institution_id: str,
    institution_name: str,
    workforce_name: str,
    credential_type: str,
    institution_email: str = None
):
    """
    Notify an institution that a student/grad has requested credential verification.
    
    This is triggered when:
    1. Workforce user submits a credential for verification
    2. The institution is in our directory but not yet a partner
    
    Creates urgency by showing demand from their students.
    """
    
    # Record the notification request
    notification_record = {
        "notification_id": str(uuid.uuid4()),
        "institution_id": institution_id,
        "institution_name": institution_name,
        "workforce_name": workforce_name,
        "credential_type": credential_type,
        "notification_type": "credential_verification_request",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "email_sent": False,
        "email_sent_at": None
    }
    
    await db.institution_notifications.insert_one(notification_record)
    
    # Update request count for this institution
    await db.institution_directory.update_one(
        {"directory_id": institution_id},
        {
            "$inc": {"credential_request_count": 1},
            "$set": {"last_request_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Check if we should send an email (if email is provided and SendGrid available)
    if institution_email and SENDGRID_AVAILABLE:
        try:
            await send_institution_invite_email(
                db=db,
                institution_id=institution_id,
                institution_name=institution_name,
                institution_email=institution_email,
                requester_name=workforce_name,
                credential_type=credential_type
            )
            
            # Mark as sent
            await db.institution_notifications.update_one(
                {"notification_id": notification_record["notification_id"]},
                {
                    "$set": {
                        "email_sent": True,
                        "email_sent_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        except Exception as e:
            print(f"Failed to send institution notification email: {e}")
    
    return notification_record


async def send_institution_invite_email(
    db: AsyncIOMotorDatabase,
    institution_id: str,
    institution_name: str,
    institution_email: str,
    requester_name: str,
    credential_type: str
):
    """
    Send an email to an institution inviting them to join HR Bank.
    
    The email emphasizes:
    1. Students/grads are waiting for verification
    2. They can monetize credential verification
    3. It's free to join
    """
    
    # Get total request count for this institution
    institution = await db.institution_directory.find_one(
        {"directory_id": institution_id},
        {"_id": 0, "credential_request_count": 1, "invite_request_count": 1}
    )
    
    total_requests = (institution.get("credential_request_count", 0) + 
                     institution.get("invite_request_count", 0)) if institution else 1
    
    # Check if we've already sent an email recently (within 7 days)
    recent_email = await db.institution_email_log.find_one({
        "institution_id": institution_id,
        "email_type": "invite",
        "sent_at": {"$gte": (datetime.now(timezone.utc).replace(day=datetime.now().day - 7)).isoformat()}
    })
    
    if recent_email:
        print(f"Skipping email to {institution_name} - already sent within 7 days")
        return
    
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
    if not sendgrid_api_key:
        print("SendGrid API key not configured")
        return
    
    # Build email content
    subject = f"{requester_name} is waiting for their credential verification"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #30496d 0%, #1a2d42 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }}
            .highlight-box {{ background: white; border-left: 4px solid #ff5f00; padding: 20px; margin: 20px 0; border-radius: 8px; }}
            .cta-button {{ display: inline-block; background: #ff5f00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .stats {{ display: flex; justify-content: space-around; text-align: center; margin: 20px 0; }}
            .stat {{ padding: 15px; }}
            .stat-number {{ font-size: 32px; font-weight: bold; color: #ff5f00; }}
            .stat-label {{ font-size: 14px; color: #666; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 24px;">HR Bank</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Blockchain Credential Verification</p>
            </div>
            
            <div class="content">
                <h2>Your students are waiting, {institution_name}</h2>
                
                <div class="highlight-box">
                    <p style="margin: 0;"><strong>{requester_name}</strong> just submitted their <strong>{credential_type}</strong> for verification.</p>
                    <p style="margin: 10px 0 0 0; color: #666;">They selected {institution_name} as their issuing institution.</p>
                </div>
                
                <div class="stats">
                    <div class="stat">
                        <div class="stat-number">{total_requests}</div>
                        <div class="stat-label">Students Waiting</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">$25</div>
                        <div class="stat-label">Avg. per Credential</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">50%</div>
                        <div class="stat-label">Revenue Share</div>
                    </div>
                </div>
                
                <h3>Why Join HR Bank?</h3>
                <ul style="padding-left: 20px;">
                    <li><strong>Monetize your credentials</strong> — Earn 50% of every verification fee</li>
                    <li><strong>Blockchain verification</strong> — Your credentials become tamper-proof</li>
                    <li><strong>Help your graduates</strong> — Give them portable, verifiable credentials</li>
                    <li><strong>Free to join</strong> — No setup costs, no monthly fees</li>
                </ul>
                
                <p style="text-align: center;">
                    <a href="https://hrbank.ca/signup?type=institution" class="cta-button">
                        Join HR Bank — It's Free
                    </a>
                </p>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                    Your students are already here. Don't keep them waiting.
                </p>
            </div>
            
            <div class="footer">
                <p>HR Bank — Blockchain Verified Workforce Credentials</p>
                <p>Windsor, Ontario, Canada</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        message = Mail(
            from_email=Email("credentials@hrbank.ca", "HR Bank Credentials"),
            to_emails=To(institution_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        response = sg.send(message)
        
        # Log the email
        await db.institution_email_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "institution_id": institution_id,
            "institution_name": institution_name,
            "institution_email": institution_email,
            "email_type": "invite",
            "subject": subject,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status_code": response.status_code,
            "triggered_by": requester_name
        })
        
        print(f"Institution invite email sent to {institution_email}")
        
    except Exception as e:
        print(f"SendGrid error: {e}")
        raise


async def get_institution_request_stats(db: AsyncIOMotorDatabase, institution_id: str):
    """Get statistics about requests for an institution"""
    
    # Get credential verification requests
    credential_requests = await db.institution_notifications.count_documents({
        "institution_id": institution_id,
        "notification_type": "credential_verification_request"
    })
    
    # Get general invite requests (from leaderboard)
    invite_requests = await db.institution_invite_requests.count_documents({
        "institution_id": institution_id
    })
    
    # Get institution info
    institution = await db.institution_directory.find_one(
        {"directory_id": institution_id},
        {"_id": 0, "institution_name": 1, "province": 1, "city": 1}
    )
    
    return {
        "institution": institution,
        "credential_verification_requests": credential_requests,
        "invite_requests": invite_requests,
        "total_demand": credential_requests + invite_requests
    }


async def check_and_trigger_threshold_email(
    db: AsyncIOMotorDatabase,
    institution_id: str,
    threshold: int = 5
):
    """
    Check if institution has hit request threshold and trigger email if so.
    Called periodically or after each request.
    """
    
    stats = await get_institution_request_stats(db, institution_id)
    
    if stats["total_demand"] >= threshold:
        # Check if we have an email for this institution
        institution = await db.institution_directory.find_one(
            {"directory_id": institution_id},
            {"_id": 0, "email": 1, "institution_name": 1}
        )
        
        if institution and institution.get("email"):
            # Check if threshold email already sent
            threshold_email = await db.institution_email_log.find_one({
                "institution_id": institution_id,
                "email_type": "threshold_reached"
            })
            
            if not threshold_email:
                # Send threshold email
                await send_threshold_reached_email(
                    db=db,
                    institution_id=institution_id,
                    institution_name=institution.get("institution_name"),
                    institution_email=institution.get("email"),
                    request_count=stats["total_demand"]
                )


async def send_threshold_reached_email(
    db: AsyncIOMotorDatabase,
    institution_id: str,
    institution_name: str,
    institution_email: str,
    request_count: int
):
    """Send email when institution reaches request threshold"""
    
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
    if not sendgrid_api_key or not SENDGRID_AVAILABLE:
        return
    
    subject = f"{request_count} of your students are waiting on HR Bank"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .big-number {{ font-size: 72px; font-weight: bold; color: #ff5f00; text-align: center; }}
            .cta-button {{ display: inline-block; background: #ff5f00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="big-number">{request_count}</div>
            <h2 style="text-align: center; margin: 0;">students from {institution_name}</h2>
            <p style="text-align: center; color: #666;">are waiting for their credentials to be verified</p>
            
            <p>These are your graduates and students. They've uploaded their credentials and selected {institution_name} as their issuing institution.</p>
            
            <p>They're waiting for you to verify them so they can:</p>
            <ul>
                <li>Get better jobs faster with verified credentials</li>
                <li>Build their Work Passport with blockchain-verified achievements</li>
                <li>Prove their qualifications to employers instantly</li>
            </ul>
            
            <p>And here's the best part: <strong>You earn 50% of every credential fee.</strong></p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="https://hrbank.ca/signup?type=institution" class="cta-button">
                    Start Verifying — It's Free
                </a>
            </p>
        </div>
    </body>
    </html>
    """
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        message = Mail(
            from_email=Email("credentials@hrbank.ca", "HR Bank"),
            to_emails=To(institution_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        sg.send(message)
        
        await db.institution_email_log.insert_one({
            "log_id": str(uuid.uuid4()),
            "institution_id": institution_id,
            "institution_name": institution_name,
            "institution_email": institution_email,
            "email_type": "threshold_reached",
            "subject": subject,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "request_count_at_send": request_count
        })
        
    except Exception as e:
        print(f"Failed to send threshold email: {e}")
