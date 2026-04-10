"""
Cohort End Date Notification Service
Checks for cohorts approaching or past their end dates and notifies institution admins
to issue credentials to enrolled students.

Runs daily as a background task.
"""
from datetime import datetime, timezone, timedelta
import logging
import os
import uuid

logger = logging.getLogger(__name__)

# Try to import SendGrid
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False


async def create_notification(db, user_id: str, notification_type: str, title: str, message: str, action_url: str = None, priority: str = "normal"):
    """Create an in-app notification record."""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "notification_type": notification_type,
        "notification_subtype": "cohort_reminder",
        "title": title,
        "message": message,
        "action_url": action_url,
        "priority": priority,
        "read_status": False,
        "created_date": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification["notification_id"]


async def send_cohort_reminder_email(institution_email: str, institution_name: str, cohort_title: str, program_name: str, end_date_str: str, student_count: int, days_label: str, class_id: str):
    """Send email to institution admin about cohort ending."""
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
    if not sendgrid_api_key or not SENDGRID_AVAILABLE:
        logger.warning("SendGrid not available for cohort reminder email")
        return False

    frontend_url = os.environ.get("FRONTEND_URL", "https://hrbank.ca")

    subject = f"Action Required: {cohort_title} — {days_label}"

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
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Credential Issuance Reminder</p>
            </div>

            <div class="content">
                <h2>Time to issue credentials, {institution_name}</h2>

                <div class="highlight-box">
                    <p style="margin: 0;"><strong>{cohort_title}</strong> under program <strong>{program_name}</strong> {days_label.lower()}.</p>
                    <p style="margin: 10px 0 0 0; color: #666;">End date: {end_date_str}</p>
                </div>

                <div class="stats">
                    <div class="stat">
                        <div class="stat-number">{student_count}</div>
                        <div class="stat-label">Students Enrolled</div>
                    </div>
                </div>

                <p>Your students are waiting for their blockchain-verified credentials. Issue them now so they can add them to their WorkPassport profiles.</p>

                <p style="text-align: center;">
                    <a href="{frontend_url}/institution/classes/{class_id}" class="cta-button">
                        Issue Credentials Now
                    </a>
                </p>
            </div>

            <div class="footer">
                <p>HR Bank — Blockchain Verified Workforce Credentials</p>
                <p>hrbank.ca</p>
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
        logger.info(f"Cohort reminder email sent to {institution_email} (status {response.status_code})")
        return True
    except Exception as e:
        logger.error(f"Failed to send cohort reminder email to {institution_email}: {e}")
        return False


async def check_cohort_end_dates(db):
    """
    Daily check for cohorts approaching or past their end dates.

    Triggers:
    - 7 days before end_date  → "ending soon" reminder
    - On end_date             → "ended today" reminder
    - 3 days after end_date   → "overdue" reminder (if credentials not issued)

    Skips cohorts that already have 100% credentials issued.
    """
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    # Date boundaries
    seven_days_from_now = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    three_days_ago = (now - timedelta(days=3)).strftime("%Y-%m-%d")

    logger.info(f"[Cohort Check] Running daily cohort end-date check at {now.isoformat()}")

    # Find active cohorts with end dates in the notification window
    cohorts = await db.institution_classes.find({
        "status": {"$in": ["active", "completed"]},
        "end_date": {"$lte": seven_days_from_now, "$gte": three_days_ago}
    }, {"_id": 0}).to_list(500)

    logger.info(f"[Cohort Check] Found {len(cohorts)} cohorts in notification window")

    notifications_sent = 0

    for cohort in cohorts:
        class_id = cohort.get("class_id")
        institution_id = cohort.get("institution_id")
        end_date = cohort.get("end_date", "")
        enrolled = cohort.get("enrolled_students", [])
        total_enrolled = cohort.get("total_enrolled", len(enrolled))
        credentials_issued = cohort.get("credentials_issued", 0)
        cohort_title = cohort.get("title", "Untitled Cohort")

        # Skip if all credentials already issued
        if total_enrolled > 0 and credentials_issued >= total_enrolled:
            continue

        # Determine reminder type
        if end_date == today_str:
            days_label = "ends today"
            reminder_type = "cohort_ended_today"
            priority = "high"
        elif end_date < today_str:
            days_label = "has ended — credentials overdue"
            reminder_type = "cohort_credentials_overdue"
            priority = "urgent"
        else:
            days_remaining = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(today_str, "%Y-%m-%d")).days
            if days_remaining <= 3:
                days_label = f"ends in {days_remaining} day(s)"
                reminder_type = "cohort_ending_3days"
                priority = "high"
            elif days_remaining <= 7:
                days_label = f"ends in {days_remaining} day(s)"
                reminder_type = "cohort_ending_7days"
                priority = "normal"
            else:
                continue  # Outside notification window

        # Check if we already sent this reminder type for this cohort today
        existing_log = await db.cohort_notification_log.find_one({
            "class_id": class_id,
            "reminder_type": reminder_type,
            "sent_date": today_str
        })

        if existing_log:
            continue  # Already notified today

        # Get institution info
        institution_profile = await db.institution_profiles.find_one(
            {"$or": [
                {"institution_id": institution_id},
                {"user_id": institution_id}
            ]},
            {"_id": 0, "institution_name": 1}
        )
        institution_name = institution_profile.get("institution_name", "Institution") if institution_profile else "Institution"

        # Get institution admin email
        institution_user = await db.users.find_one(
            {"user_id": institution_id},
            {"_id": 0, "email": 1}
        )
        institution_email = institution_user.get("email") if institution_user else None

        # Get program name
        program_name = "Program"
        hierarchy = cohort.get("hierarchy", {})
        if hierarchy.get("program_name"):
            program_name = hierarchy["program_name"]
        elif cohort.get("program_id"):
            program = await db.institution_programs.find_one(
                {"program_id": cohort["program_id"]},
                {"_id": 0, "program_name": 1}
            )
            if program:
                program_name = program.get("program_name", "Program")

        pending_count = total_enrolled - credentials_issued

        # Create in-app notification
        message = f"Cohort \"{cohort_title}\" under {program_name} {days_label}. {pending_count} student(s) are awaiting credentials."
        frontend_url = os.environ.get("FRONTEND_URL", "https://hrbank.ca")
        action_url = f"{frontend_url}/institution/classes/{class_id}"

        await create_notification(
            db=db,
            user_id=institution_id,
            notification_type=reminder_type,
            title=f"Cohort {days_label}: {cohort_title}",
            message=message,
            action_url=action_url,
            priority=priority
        )

        # Send email
        if institution_email:
            await send_cohort_reminder_email(
                institution_email=institution_email,
                institution_name=institution_name,
                cohort_title=cohort_title,
                program_name=program_name,
                end_date_str=end_date,
                student_count=pending_count,
                days_label=days_label.capitalize(),
                class_id=class_id
            )

        notifications_sent += 1

        # Log to cohort_notification_log for deduplication tracking
        await db.cohort_notification_log.insert_one({
            "log_id": f"cnl_{uuid.uuid4().hex[:12]}",
            "class_id": class_id,
            "institution_id": institution_id,
            "reminder_type": reminder_type,
            "sent_date": today_str,
            "created_at": now.isoformat()
        })

    logger.info(f"[Cohort Check] Sent {notifications_sent} cohort reminder notifications")
    return {"notifications_sent": notifications_sent, "cohorts_checked": len(cohorts)}
