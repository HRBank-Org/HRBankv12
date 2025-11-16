"""
Email service for sending automated emails via SendGrid
"""
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os
from typing import Optional
from datetime import datetime

class EmailDeliveryError(Exception):
    """Custom exception for email delivery failures"""
    pass

def send_email(to: str, subject: str, html_content: str, from_email: str = None):
    """
    Send email via SendGrid
    
    Args:
        to: Recipient email address
        subject: Email subject line
        html_content: HTML email content
        from_email: Sender email (optional, defaults to SENDGRID_FROM_EMAIL)
    
    Returns:
        bool: True if email was sent successfully
    
    Raises:
        EmailDeliveryError: If email sending fails
    """
    if not from_email:
        from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@hrbank.ca')
    
    message = Mail(
        from_email=from_email,
        to_emails=to,
        subject=subject,
        html_content=html_content
    )
    
    try:
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        response = sg.send(message)
        
        if response.status_code in [200, 202]:
            return True
        else:
            raise EmailDeliveryError(f"SendGrid returned status code: {response.status_code}")
            
    except Exception as e:
        raise EmailDeliveryError(f"Failed to send email: {str(e)}")


def send_document_expiry_reminder(
    recipient_email: str,
    recipient_name: str,
    document_name: str,
    document_type: str,
    expiry_date: str,
    days_until_expiry: int
):
    """
    Send email reminder for document expiry
    
    Args:
        recipient_email: User's email
        recipient_name: User's full name
        document_name: Name of the expiring document
        document_type: Type of document (e.g., 'work_permit', 'government_id')
        expiry_date: Document expiry date (ISO format string)
        days_until_expiry: Number of days until expiry
    """
    
    # Format expiry date for display
    try:
        expiry_dt = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
        formatted_date = expiry_dt.strftime('%B %d, %Y')
    except:
        formatted_date = expiry_date
    
    # Determine urgency level
    if days_until_expiry <= 0:
        urgency_color = '#d32f2f'  # Red
        urgency_text = 'EXPIRED'
        action_text = 'Your document has expired. Please upload a new document immediately to restore full account access.'
    elif days_until_expiry <= 3:
        urgency_color = '#f57c00'  # Orange
        urgency_text = 'URGENT'
        action_text = f'Your document expires in {days_until_expiry} day{"s" if days_until_expiry > 1 else ""}. Please upload a new document as soon as possible.'
    else:
        urgency_color = '#fbc02d'  # Yellow
        urgency_text = 'REMINDER'
        action_text = f'Your document expires in {days_until_expiry} days. Please prepare to upload a new document soon.'
    
    subject = f"⚠️ {urgency_text}: {document_name} Expires Soon - HR Bank"
    
    html_content = f"""
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
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HR Bank</h1>
                                <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Document Management System</p>
                            </td>
                        </tr>
                        
                        <!-- Alert Banner -->
                        <tr>
                            <td style="background-color: {urgency_color}; padding: 15px; text-align: center;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 20px;">⚠️ {urgency_text}</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                                    Hello {recipient_name},
                                </p>
                                
                                <p style="font-size: 16px; color: #333; line-height: 1.5; margin: 0 0 20px 0;">
                                    {action_text}
                                </p>
                                
                                <!-- Document Details Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Document Details</h3>
                                            
                                            <table width="100%" cellpadding="5" cellspacing="0">
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Document Name:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{document_name}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Document Type:</strong></td>
                                                    <td style="color: #333; font-size: 14px; padding: 5px 0;">{document_type.replace('_', ' ').title()}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Expiry Date:</strong></td>
                                                    <td style="color: {urgency_color}; font-size: 14px; padding: 5px 0; font-weight: bold;">{formatted_date}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #666; font-size: 14px; padding: 5px 0;"><strong>Days Remaining:</strong></td>
                                                    <td style="color: {urgency_color}; font-size: 14px; padding: 5px 0; font-weight: bold;">{days_until_expiry} day{"s" if days_until_expiry != 1 else ""}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Action Required Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 15px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                                <strong>⚠️ Action Required:</strong> To maintain full access to your HR Bank account, please upload a new, valid {document_name} before it expires.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="https://hrbank.ca/documents" style="display: inline-block; background-color: #1976d2; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                                Upload New Document
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Account Restriction Warning -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffebee; border-left: 4px solid #d32f2f; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 15px;">
                                            <p style="margin: 0; color: #c62828; font-size: 14px;">
                                                <strong>⚠️ Important:</strong> If your document expires and is not renewed, your account will be restricted. You will still be able to log in, but you won't be able to access most features until you upload a valid document.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="font-size: 14px; color: #666; line-height: 1.5; margin: 20px 0 0 0;">
                                    If you have any questions or need assistance, please contact our support team.
                                </p>
                                
                                <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
                                    Best regards,<br>
                                    <strong>HR Bank Team</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #999;">
                                    This is an automated email from HR Bank Document Management System.<br>
                                    Please do not reply to this email.
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
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
    
    try:
        send_email(recipient_email, subject, html_content)
        return True
    except EmailDeliveryError as e:
        print(f"Failed to send expiry reminder to {recipient_email}: {str(e)}")
        return False


def send_account_restricted_email(
    recipient_email: str,
    recipient_name: str,
    expired_documents: list
):
    """
    Send email notification that account has been restricted due to expired documents
    
    Args:
        recipient_email: User's email
        recipient_name: User's full name
        expired_documents: List of expired document names
    """
    
    subject = "🚫 Account Restricted - Expired Documents - HR Bank"
    
    # Build list of expired documents
    doc_list_html = ""
    for doc in expired_documents:
        doc_list_html += f"<li style='margin: 5px 0; color: #d32f2f;'>{doc}</li>"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0;">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HR Bank</h1>
                                <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Account Status Update</p>
                            </td>
                        </tr>
                        
                        <!-- Alert Banner -->
                        <tr>
                            <td style="background-color: #d32f2f; padding: 15px; text-align: center;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 20px;">🚫 ACCOUNT RESTRICTED</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                                    Hello {recipient_name},
                                </p>
                                
                                <p style="font-size: 16px; color: #333; line-height: 1.5; margin: 0 0 20px 0;">
                                    Your HR Bank account has been <strong>restricted</strong> because the following documents have expired:
                                </p>
                                
                                <!-- Expired Documents List -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffebee; border-left: 4px solid #d32f2f; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h3 style="margin: 0 0 10px 0; color: #c62828; font-size: 16px;">Expired Documents:</h3>
                                            <ul style="margin: 0; padding-left: 20px;">
                                                {doc_list_html}
                                            </ul>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Restriction Details -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">What This Means</h3>
                                            
                                            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                                                ✅ You can still <strong>log in</strong> to your account
                                            </p>
                                            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                                                ❌ You cannot access most features until documents are updated
                                            </p>
                                            <p style="margin: 0; color: #666; font-size: 14px;">
                                                ❌ Your profile may not be visible to employers/institutions
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- How to Restore Access -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h3 style="margin: 0 0 15px 0; color: #2e7d32; font-size: 18px;">How to Restore Full Access</h3>
                                            
                                            <ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px;">
                                                <li style="margin: 5px 0;">Log in to your HR Bank account</li>
                                                <li style="margin: 5px 0;">Navigate to the Documents section</li>
                                                <li style="margin: 5px 0;">Upload new, valid versions of the expired documents</li>
                                                <li style="margin: 5px 0;">Wait for admin verification (usually 1-2 business days)</li>
                                                <li style="margin: 5px 0;">Once approved, your account will be automatically reactivated</li>
                                            </ol>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="https://hrbank.ca/documents" style="display: inline-block; background-color: #4caf50; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                                Upload Documents Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="font-size: 14px; color: #666; line-height: 1.5; margin: 20px 0 0 0;">
                                    If you need help or have questions, please contact our support team at support@hrbank.ca or call us at 1-800-HR-BANK.
                                </p>
                                
                                <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
                                    Best regards,<br>
                                    <strong>HR Bank Team</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #999;">
                                    This is an automated email from HR Bank Document Management System.<br>
                                    Please do not reply to this email.
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
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
    
    try:
        send_email(recipient_email, subject, html_content)
        return True
    except EmailDeliveryError as e:
        print(f"Failed to send account restriction email to {recipient_email}: {str(e)}")
        return False
