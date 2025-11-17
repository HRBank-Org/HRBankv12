"""
SMS notification service using Twilio
Sends compliance-related notifications to employers and workers
"""
from twilio.rest import Client
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Twilio credentials from environment variables
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')  # Your Twilio number

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {str(e)}")
else:
    logger.warning("Twilio credentials not configured. SMS notifications disabled.")


async def send_sms(to_phone: str, message: str) -> dict:
    """
    Send SMS using Twilio
    
    Args:
        to_phone: Phone number in E.164 format (e.g., +15195551234)
        message: SMS message body (max 1600 characters)
    
    Returns:
        dict with success status and message_sid or error
    """
    if not twilio_client:
        logger.error("Twilio client not initialized. Cannot send SMS.")
        return {
            "success": False,
            "error": "SMS service not configured"
        }
    
    try:
        # Send SMS
        message_obj = twilio_client.messages.create(
            to=to_phone,
            from_=TWILIO_PHONE_NUMBER,
            body=message
        )
        
        logger.info(f"SMS sent successfully to {to_phone}. SID: {message_obj.sid}")
        return {
            "success": True,
            "message_sid": message_obj.sid,
            "status": message_obj.status
        }
    
    except Exception as e:
        logger.error(f"Failed to send SMS to {to_phone}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== COMPLIANCE NOTIFICATION TEMPLATES ====================

async def notify_employer_wsib_expiring(employer_phone: str, employer_name: str, days_until_expiry: int):
    """Notify employer that WSIB certificate is expiring soon"""
    message = f"""
HR Bank Alert: {employer_name}

Your WSIB certificate expires in {days_until_expiry} days.

Please upload a renewed certificate to continue posting shifts.

Login: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(employer_phone, message.strip())


async def notify_employer_wsib_expired(employer_phone: str, employer_name: str):
    """Notify employer that WSIB certificate has expired"""
    message = f"""
HR Bank URGENT: {employer_name}

Your WSIB certificate has EXPIRED. You cannot post new shifts until renewed.

Upload renewed certificate immediately:
hrbank-app.preview.emergentagent.com

Workers on existing shifts are still covered, but no new shifts allowed.
"""
    return await send_sms(employer_phone, message.strip())


async def notify_employer_wsib_approved(employer_phone: str, employer_name: str):
    """Notify employer that WSIB certificate was approved"""
    message = f"""
HR Bank: {employer_name}

Your WSIB certificate has been APPROVED! ✓

You can now post shifts and hire workers.

Login: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(employer_phone, message.strip())


async def notify_employer_wsib_rejected(employer_phone: str, employer_name: str, reason: str):
    """Notify employer that WSIB certificate was rejected"""
    message = f"""
HR Bank: {employer_name}

Your WSIB certificate was REJECTED.

Reason: {reason}

Please upload a valid certificate:
hrbank-app.preview.emergentagent.com
"""
    return await send_sms(employer_phone, message.strip())


async def notify_worker_account_created(worker_phone: str, worker_name: str):
    """Notify worker that account was created"""
    message = f"""
Welcome to HR Bank, {worker_name}!

Your casual employment account is active.

You can now browse and apply for shifts.

Login: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(worker_phone, message.strip())


async def notify_employer_account_created(employer_phone: str, employer_name: str):
    """Notify employer that account was created"""
    message = f"""
Welcome to HR Bank, {employer_name}!

Complete your compliance setup to start posting shifts:
1. Confirm worker classification (T4 employees)
2. Upload WSIB certificate
3. Acknowledge terms of service

Login: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(employer_phone, message.strip())


async def notify_worker_shift_assigned(worker_phone: str, worker_name: str, shift_date: str, employer_name: str):
    """Notify worker that they were assigned a shift"""
    message = f"""
HR Bank: New Shift Assigned

{worker_name}, you have a new shift:
Date: {shift_date}
Employer: {employer_name}

View details: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(worker_phone, message.strip())


async def notify_worker_shift_starting(worker_phone: str, worker_name: str, hours_until_shift: int):
    """Notify worker that their shift is starting soon"""
    message = f"""
HR Bank: Shift Reminder

{worker_name}, your shift starts in {hours_until_shift} hour(s).

Don't forget to clock in when you arrive!

View shift: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(worker_phone, message.strip())


async def notify_shift_change(phone: str, name: str, change_type: str, details: str):
    """Notify about shift changes (time, location, cancellation)"""
    message = f"""
HR Bank: Shift {change_type}

{name}, 

{details}

View updated shift: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(phone, message.strip())


async def notify_document_expiring(phone: str, name: str, document_type: str, days_until_expiry: int):
    """Notify user that document is expiring"""
    message = f"""
HR Bank: Document Expiring

{name}, your {document_type} expires in {days_until_expiry} days.

Please upload renewed document to avoid account restrictions.

Update: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(phone, message.strip())


async def notify_document_expired(phone: str, name: str, document_type: str):
    """Notify user that document has expired"""
    message = f"""
HR Bank URGENT: Document Expired

{name}, your {document_type} has EXPIRED.

Your account is now restricted. Upload renewed document immediately.

Update: hrbank-app.preview.emergentagent.com
"""
    return await send_sms(phone, message.strip())


# ==================== HELPER FUNCTIONS ====================

def format_phone_e164(phone: str) -> Optional[str]:
    """
    Format phone number to E.164 format
    Assumes Canadian numbers if no country code
    
    Examples:
        5195551234 -> +15195551234
        519-555-1234 -> +15195551234
        +1-519-555-1234 -> +15195551234
    """
    if not phone:
        return None
    
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Add +1 for Canadian numbers if not present
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    elif digits.startswith('+'):
        return phone
    else:
        logger.warning(f"Invalid phone number format: {phone}")
        return None
