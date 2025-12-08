"""
Shift Notification Service
Handles email and SMS notifications for shift-related events
"""
import os
import logging
from datetime import datetime
from typing import List, Optional
from services.email_service import send_email, EmailDeliveryError
from services.sms_service import send_sms, format_phone_e164
from database import get_database
import moment

logger = logging.getLogger(__name__)


async def check_notification_preference(user_id: str, notification_type: str, channel: str) -> bool:
    """
    Check if user wants to receive this notification on this channel
    Returns True if notification should be sent
    """
    try:
        db = await get_database()
        preferences = await db.notification_preferences.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not preferences:
            return True  # No preferences, send by default
        
        type_settings = preferences.get(notification_type, {})
        if not type_settings:
            return True  # Type not configured, send by default
        
        return type_settings.get(channel, True)
    except Exception as e:
        logger.error(f"Error checking notification preference: {str(e)}")
        return True  # On error, send notification


# ==================== EMAIL TEMPLATES ====================

def get_shift_assignment_email_html(worker_name: str, shift_details: dict, employer_name: str) -> str:
    """Generate HTML email for shift assignment"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 New Shift Assigned!</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                                    Hello {worker_name},
                                </p>
                                <p style="font-size: 16px; color: #333; line-height: 1.5; margin: 0 0 20px 0;">
                                    You've been assigned to a new shift! Here are the details:
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Shift Details</h3>
                                            <table width="100%" cellpadding="5" cellspacing="0">
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Position:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{shift_details.get('position', 'N/A')}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Date:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{shift_details.get('date', 'N/A')}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Time:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{shift_details.get('time', 'N/A')}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Location:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{shift_details.get('location', 'N/A')}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Employer:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{employer_name}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Hourly Rate:</strong></td>
                                                    <td style="color: #1976d2; font-size: 16px; padding: 5px 0; font-weight: bold;">${shift_details.get('rate', '0')}/hour</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/workforce/shifts" style="display: inline-block; background-color: #1976d2; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                                View Shift Details
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
                                    Best regards,<br>
                                    <strong>HR Bank Team</strong>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #999;">
                                    © 2025 HR Bank. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_shift_change_email_html(recipient_name: str, change_type: str, old_details: dict, new_details: dict) -> str:
    """Generate HTML email for shift time change"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #f57c00 0%, #ef6c00 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Shift {change_type}</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                                    Hello {recipient_name},
                                </p>
                                <p style="font-size: 16px; color: #333; line-height: 1.5; margin: 0 0 20px 0;">
                                    Important: Your shift schedule has been updated.
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                    <tr>
                                        <td style="width: 50%; padding: 10px; vertical-align: top;">
                                            <div style="background-color: #ffebee; border-radius: 6px; padding: 15px;">
                                                <h4 style="margin: 0 0 10px 0; color: #c62828;">Previous Details:</h4>
                                                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Date:</strong> {old_details.get('date', 'N/A')}</p>
                                                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Time:</strong> {old_details.get('time', 'N/A')}</p>
                                            </div>
                                        </td>
                                        <td style="width: 50%; padding: 10px; vertical-align: top;">
                                            <div style="background-color: #e8f5e9; border-radius: 6px; padding: 15px;">
                                                <h4 style="margin: 0 0 10px 0; color: #2e7d32;">New Details:</h4>
                                                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Date:</strong> {new_details.get('date', 'N/A')}</p>
                                                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Time:</strong> {new_details.get('time', 'N/A')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 15px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                                <strong>📅 Please update your calendar</strong> with the new shift time.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/workforce/shifts" style="display: inline-block; background-color: #f57c00; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                                View Updated Shift
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
                                    Best regards,<br>
                                    <strong>HR Bank Team</strong>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #999;">
                                    © 2025 HR Bank. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


# ==================== NOTIFICATION FUNCTIONS ====================

async def notify_shift_assigned(worker_email: str, worker_phone: str, worker_name: str, 
                                shift_details: dict, employer_name: str, worker_id: str = None):
    """
    Notify worker about shift assignment via email and SMS
    """
    try:
        # Check preferences
        send_email_pref = await check_notification_preference(worker_id, "shift_assigned", "email") if worker_id else True
        send_sms_pref = await check_notification_preference(worker_id, "shift_assigned", "sms") if worker_id else True
        
        # Send email
        if send_email_pref and worker_email:
            subject = f"🎉 New Shift Assigned - {shift_details.get('date', '')}"
            html_content = get_shift_assignment_email_html(worker_name, shift_details, employer_name)
            
            try:
                send_email(worker_email, subject, html_content)
                logger.info(f"Shift assignment email sent to {worker_email}")
            except EmailDeliveryError as e:
                logger.error(f"Failed to send assignment email: {str(e)}")
        
        # Send SMS
        if send_sms_pref and worker_phone:
            formatted_phone = format_phone_e164(worker_phone)
            if formatted_phone:
                sms_message = f"""HR Bank: New Shift Assigned

{worker_name}, you have a new shift:
Position: {shift_details.get('position', 'N/A')}
Date: {shift_details.get('date', 'N/A')}
Time: {shift_details.get('time', 'N/A')}
Location: {shift_details.get('location', 'N/A')}

View details: {os.getenv('FRONTEND_URL', 'hrbank.ca')}"""
                
                await send_sms(formatted_phone, sms_message.strip())
                logger.info(f"Shift assignment SMS sent to {formatted_phone}")
        
        return True
    except Exception as e:
        logger.error(f"Error in notify_shift_assigned: {str(e)}")
        return False


async def notify_shift_time_changed(affected_workers: List[dict], old_shift: dict, new_shift: dict):
    """
    Notify all affected workers about shift time change
    """
    for worker in affected_workers:
        try:
            # Prepare old and new details
            old_details = {
                'date': datetime.fromisoformat(old_shift['start_time'].replace('Z', '+00:00')).strftime('%B %d, %Y'),
                'time': f"{datetime.fromisoformat(old_shift['start_time'].replace('Z', '+00:00')).strftime('%I:%M %p')} - {datetime.fromisoformat(old_shift['end_time'].replace('Z', '+00:00')).strftime('%I:%M %p')}"
            }
            new_details = {
                'date': datetime.fromisoformat(new_shift['start_time'].replace('Z', '+00:00')).strftime('%B %d, %Y'),
                'time': f"{datetime.fromisoformat(new_shift['start_time'].replace('Z', '+00:00')).strftime('%I:%M %p')} - {datetime.fromisoformat(new_shift['end_time'].replace('Z', '+00:00')).strftime('%I:%M %p')}"
            }
            
            worker_name = worker.get('worker_name', 'Worker')
            worker_email = worker.get('worker_email')
            worker_phone = worker.get('worker_phone')
            
            # Send email
            if worker_email:
                subject = f"⚠️ Shift Time Changed - {new_details['date']}"
                html_content = get_shift_change_email_html(worker_name, "Time Changed", old_details, new_details)
                
                try:
                    send_email(worker_email, subject, html_content)
                    logger.info(f"Shift change email sent to {worker_email}")
                except EmailDeliveryError as e:
                    logger.error(f"Failed to send change email: {str(e)}")
            
            # Send SMS
            if worker_phone:
                formatted_phone = format_phone_e164(worker_phone)
                if formatted_phone:
                    sms_message = f"""HR Bank: Shift Time Changed

{worker_name}, your shift has been rescheduled:

OLD: {old_details['date']} at {old_details['time']}
NEW: {new_details['date']} at {new_details['time']}

View updated shift: {os.getenv('FRONTEND_URL', 'hrbank.ca')}"""
                    
                    await send_sms(formatted_phone, sms_message.strip())
                    logger.info(f"Shift change SMS sent to {formatted_phone}")
        
        except Exception as e:
            logger.error(f"Error notifying worker {worker.get('worker_name')}: {str(e)}")
    
    return True


async def notify_employment_status_change(worker_email: str, worker_phone: str, worker_name: str, 
                                          status: str, employer_name: str, details: dict = None):
    """
    Notify worker about employment status change (hired/fired)
    """
    try:
        if status == "hired":
            subject = f"🎉 Welcome to {employer_name}!"
            email_body = f"""
            <p>Congratulations {worker_name}!</p>
            <p>You've been hired by <strong>{employer_name}</strong>.</p>
            <p>You can now accept shifts from this employer through your HR Bank account.</p>
            """
            sms_message = f"""HR Bank: Hired!

{worker_name}, you've been hired by {employer_name}!

You can now accept shifts from this employer.

Login: {os.getenv('FRONTEND_URL', 'hrbank.ca')}"""
        
        else:  # fired
            subject = f"Employment Status Update - {employer_name}"
            email_body = f"""
            <p>Hello {worker_name},</p>
            <p>Your employment relationship with <strong>{employer_name}</strong> has been terminated.</p>
            <p>Any scheduled shifts with this employer have been cancelled.</p>
            <p>You can continue to work with other employers on the HR Bank platform.</p>
            """
            sms_message = f"""HR Bank: Employment Terminated

{worker_name}, your employment with {employer_name} has ended.

Scheduled shifts with this employer are cancelled.

You can continue with other employers on HR Bank."""
        
        # Send email
        if worker_email:
            try:
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    {email_body}
                    <p style="margin-top: 30px;">Best regards,<br><strong>HR Bank Team</strong></p>
                </body>
                </html>
                """
                send_email(worker_email, subject, html_content)
                logger.info(f"Employment status email sent to {worker_email}")
            except EmailDeliveryError as e:
                logger.error(f"Failed to send employment status email: {str(e)}")
        
        # Send SMS
        if worker_phone:
            formatted_phone = format_phone_e164(worker_phone)
            if formatted_phone:
                await send_sms(formatted_phone, sms_message.strip())
                logger.info(f"Employment status SMS sent to {formatted_phone}")
        
        return True
    except Exception as e:
        logger.error(f"Error in notify_employment_status_change: {str(e)}")
        return False


async def notify_employer_shift_update(employer_email: str, employer_phone: str, employer_name: str,
                                      update_type: str, shift_details: dict):
    """
    Notify employer about shift updates
    """
    try:
        if update_type == "worker_assigned":
            subject = f"Worker Assigned to Shift - {shift_details.get('date', '')}"
            message = f"""Worker {shift_details.get('worker_name')} has been assigned to your {shift_details.get('position')} shift on {shift_details.get('date')}."""
        elif update_type == "worker_unassigned":
            subject = f"Worker Removed from Shift - {shift_details.get('date', '')}"
            message = f"""Worker {shift_details.get('worker_name')} has been removed from your {shift_details.get('position')} shift on {shift_details.get('date')}."""
        elif update_type == "shift_full":
            subject = f"Shift Fully Staffed - {shift_details.get('date', '')}"
            message = f"""Your {shift_details.get('position')} shift on {shift_details.get('date')} is now fully staffed!"""
        else:
            return False
        
        # Send email notification to employer
        if employer_email:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <p>Hello {employer_name},</p>
                <p>{message}</p>
                <p><a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/employer/calendar-scheduling" style="color: #1976d2;">View Calendar</a></p>
                <p style="margin-top: 30px;">Best regards,<br><strong>HR Bank Team</strong></p>
            </body>
            </html>
            """
            try:
                send_email(employer_email, subject, html_content)
                logger.info(f"Employer notification email sent to {employer_email}")
            except EmailDeliveryError as e:
                logger.error(f"Failed to send employer email: {str(e)}")
        
        return True
    except Exception as e:
        logger.error(f"Error in notify_employer_shift_update: {str(e)}")
        return False


async def notify_clock_in(worker_email: str, worker_phone: str, worker_name: str,
                         shift_details: dict, is_late: bool = False, minutes_late: int = 0):
    """
    Notify worker about successful clock-in
    """
    try:
        if is_late:
            subject = f"⚠️ Clock-In Confirmed (Late) - {shift_details.get('position', '')}"
            late_message = f"<p style='color: #f57c00;'><strong>Note:</strong> You clocked in {minutes_late} minutes late.</p>"
            sms_late_note = f"\n⚠️ You were {minutes_late} minutes late."
        else:
            subject = f"✅ Clock-In Confirmed - {shift_details.get('position', '')}"
            late_message = ""
            sms_late_note = ""
        
        # Send email
        if worker_email:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #1976d2;">✅ Clocked In Successfully</h2>
                <p>Hello {worker_name},</p>
                <p>You have successfully clocked in for your shift:</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Position:</strong> {shift_details.get('position', 'N/A')}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> {shift_details.get('workplace', 'N/A')}</p>
                    <p style="margin: 5px 0;"><strong>Clock-In Time:</strong> {shift_details.get('clock_in_time', 'N/A')}</p>
                    <p style="margin: 5px 0;"><strong>Scheduled End:</strong> {shift_details.get('scheduled_end', 'N/A')}</p>
                </div>
                {late_message}
                <p style="margin-top: 30px;">Have a great shift!<br><strong>HR Bank Team</strong></p>
            </body>
            </html>
            """
            try:
                send_email(worker_email, subject, html_content)
                logger.info(f"Clock-in email sent to {worker_email}")
            except EmailDeliveryError as e:
                logger.error(f"Failed to send clock-in email: {str(e)}")
        
        # Send SMS
        if worker_phone:
            formatted_phone = format_phone_e164(worker_phone)
            if formatted_phone:
                sms_message = f"""HR Bank: Clocked In ✅

{worker_name}, you're clocked in for:
{shift_details.get('position', 'N/A')} at {shift_details.get('workplace', 'N/A')}
Time: {shift_details.get('clock_in_time', 'N/A')}{sms_late_note}

Have a great shift!"""
                
                await send_sms(formatted_phone, sms_message.strip())
                logger.info(f"Clock-in SMS sent to {formatted_phone}")
        
        return True
    except Exception as e:
        logger.error(f"Error in notify_clock_in: {str(e)}")
        return False


async def notify_clock_out(worker_email: str, worker_phone: str, worker_name: str,
                          shift_summary: dict):
    """
    Notify worker about successful clock-out with hours worked summary
    """
    try:
        subject = f"✅ Clock-Out Confirmed - Shift Complete"
        
        # Send email
        if worker_email:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #4caf50;">✅ Shift Complete</h2>
                <p>Hello {worker_name},</p>
                <p>You have successfully clocked out. Here's your shift summary:</p>
                <div style="background-color: #e8f5e9; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4caf50;">
                    <h3 style="margin: 0 0 15px 0; color: #2e7d32;">Shift Summary</h3>
                    <p style="margin: 5px 0;"><strong>Position:</strong> {shift_summary.get('position', 'N/A')}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> {shift_summary.get('workplace', 'N/A')}</p>
                    <p style="margin: 5px 0;"><strong>Clock-In:</strong> {shift_summary.get('clock_in_time', 'N/A')}</p>
                    <p style="margin: 5px 0;"><strong>Clock-Out:</strong> {shift_summary.get('clock_out_time', 'N/A')}</p>
                    <p style="margin: 15px 0 5px 0; font-size: 18px;"><strong>Total Hours:</strong> <span style="color: #1976d2; font-size: 24px;">{shift_summary.get('hours_worked', '0')} hours</span></p>
                    <p style="margin: 5px 0;"><strong>Hourly Rate:</strong> ${shift_summary.get('hourly_rate', '0')}</p>
                    <p style="margin: 5px 0; font-size: 18px;"><strong>Earnings:</strong> <span style="color: #2e7d32; font-size: 24px;">${shift_summary.get('total_earnings', '0')}</span></p>
                </div>
                <p>Your timesheet has been submitted for approval.</p>
                <p style="margin-top: 30px;">Great work today!<br><strong>HR Bank Team</strong></p>
            </body>
            </html>
            """
            try:
                send_email(worker_email, subject, html_content)
                logger.info(f"Clock-out email sent to {worker_email}")
            except EmailDeliveryError as e:
                logger.error(f"Failed to send clock-out email: {str(e)}")
        
        # Send SMS
        if worker_phone:
            formatted_phone = format_phone_e164(worker_phone)
            if formatted_phone:
                sms_message = f"""HR Bank: Shift Complete ✅

{worker_name}, you're clocked out!

Hours worked: {shift_summary.get('hours_worked', '0')}h
Earnings: ${shift_summary.get('total_earnings', '0')}

Great work today!"""
                
                await send_sms(formatted_phone, sms_message.strip())
                logger.info(f"Clock-out SMS sent to {formatted_phone}")
        
        return True
    except Exception as e:
        logger.error(f"Error in notify_clock_out: {str(e)}")
        return False


async def notify_geofence_alert(worker_email: str, worker_phone: str, worker_name: str,
                                workplace_name: str, current_location: dict):
    """
    Notify worker when they appear to be away from workplace during shift
    """
    try:
        # Send SMS (priority for location alerts)
        if worker_phone:
            formatted_phone = format_phone_e164(worker_phone)
            if formatted_phone:
                sms_message = f"""HR Bank: Location Check

{worker_name}, our system detected you may be away from {workplace_name}.

Are you currently at your assigned workplace?

If you're on an authorized break or task, please ignore this message.

Questions? Contact your employer."""
                
                await send_sms(formatted_phone, sms_message.strip())
                logger.info(f"Geofence alert SMS sent to {formatted_phone}")
        
        # Send email as backup
        if worker_email:
            subject = f"📍 Location Check - {workplace_name}"
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #f57c00;">📍 Location Verification</h2>
                <p>Hello {worker_name},</p>
                <p>Our system has detected that you may be away from your assigned workplace location.</p>
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 5px 0;"><strong>Assigned Workplace:</strong> {workplace_name}</p>
                    <p style="margin: 15px 0 5px 0;">If you are:</p>
                    <ul style="margin: 5px 0;">
                        <li>On an authorized break</li>
                        <li>Running a work-related errand</li>
                        <li>At your assigned location (GPS error)</li>
                    </ul>
                    <p style="margin: 5px 0;">You can ignore this message.</p>
                </div>
                <p><strong>Note:</strong> This is an automated check to ensure worker safety and compliance. If you have questions, please contact your employer.</p>
                <p style="margin-top: 30px;">Best regards,<br><strong>HR Bank Team</strong></p>
            </body>
            </html>
            """
            try:
                send_email(worker_email, subject, html_content)
                logger.info(f"Geofence alert email sent to {worker_email}")
            except EmailDeliveryError as e:
                logger.error(f"Failed to send geofence email: {str(e)}")
        
        return True
    except Exception as e:
        logger.error(f"Error in notify_geofence_alert: {str(e)}")
        return False
