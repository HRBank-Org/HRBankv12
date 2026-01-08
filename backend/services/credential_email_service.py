"""
Credential Email Service - Sends emails to workforce when credentials are issued
"""
from services.email_service import send_email, EmailDeliveryError
from datetime import datetime
import os


def send_credential_issued_email(
    recipient_email: str,
    recipient_name: str,
    credential_name: str,
    credential_type: str,
    institution_name: str,
    price_cad: float,
    issue_date: str
):
    """
    Send email to workforce user when a credential is issued to them
    
    Args:
        recipient_email: Workforce user's email
        recipient_name: Workforce user's name
        credential_name: Name of the credential (e.g., "Food Handler Certificate")
        credential_type: Type of credential (certificate, diploma, degree)
        institution_name: Name of the issuing institution
        price_cad: Price to claim the credential
        issue_date: Date the credential was issued
    """
    
    # Format issue date for display
    try:
        issue_dt = datetime.fromisoformat(issue_date.replace('Z', '+00:00'))
        formatted_date = issue_dt.strftime('%B %d, %Y')
    except (ValueError, AttributeError):
        formatted_date = issue_date
    
    # Credential type styling
    type_colors = {
        'certificate': '#3b82f6',  # Blue
        'diploma': '#8b5cf6',      # Purple
        'degree': '#10b981'        # Green
    }
    type_color = type_colors.get(credential_type, '#6b7280')
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://hrbank.ca')
    claim_url = f"{frontend_url}/workforce/credentials/pending"
    
    subject = f"🎓 New Credential Available: {credential_name} - HR Bank"
    
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
                            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎓 HR Bank</h1>
                                <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Blockchain-Verified Credentials</p>
                            </td>
                        </tr>
                        
                        <!-- Success Banner -->
                        <tr>
                            <td style="background-color: #10b981; padding: 15px; text-align: center;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 20px;">✨ New Credential Available!</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                                    Hello {recipient_name},
                                </p>
                                
                                <p style="font-size: 16px; color: #333; line-height: 1.5; margin: 0 0 20px 0;">
                                    Great news! <strong>{institution_name}</strong> has issued a credential to you. Claim it now to add it to your verified career profile!
                                </p>
                                
                                <!-- Credential Details Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                                    <tr>
                                        <td style="padding: 25px;">
                                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                                <span style="background-color: {type_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                                                    {credential_type}
                                                </span>
                                            </div>
                                            
                                            <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 22px;">{credential_name}</h3>
                                            
                                            <table width="100%" cellpadding="5" cellspacing="0">
                                                <tr>
                                                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Issued By:</strong></td>
                                                    <td style="color: #111827; font-size: 14px; padding: 5px 0;">{institution_name}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Issue Date:</strong></td>
                                                    <td style="color: #111827; font-size: 14px; padding: 5px 0;">{formatted_date}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #6b7280; font-size: 14px; padding: 5px 0;"><strong>Price:</strong></td>
                                                    <td style="color: #111827; font-size: 14px; padding: 5px 0; font-weight: bold;">${price_cad:.2f} CAD <span style="font-weight: normal; color: #6b7280;">+ tax</span></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Benefits Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">🔐 Why Claim Your Credential?</h4>
                                            <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
                                                <li style="margin: 5px 0;">Permanently recorded on the blockchain</li>
                                                <li style="margin: 5px 0;">Instantly verifiable by any employer</li>
                                                <li style="margin: 5px 0;">Share on your Work Passport profile</li>
                                                <li style="margin: 5px 0;">Never lose your credentials again</li>
                                            </ul>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{claim_url}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                                                Claim Your Credential
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- No Account Note -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 15px;">
                                            <p style="margin: 0; color: #92400e; font-size: 14px;">
                                                <strong>💡 Don't have an account yet?</strong> Create a free HR Bank account using this email address to claim your credential.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="font-size: 14px; color: #666; line-height: 1.5; margin: 20px 0 0 0;">
                                    If you have any questions about this credential, please contact {institution_name} directly.
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
                                    This email was sent because {institution_name} issued a credential to this email address.<br>
                                    If you believe this was sent in error, please ignore this email.
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
        print(f"✅ Credential issued email sent to {recipient_email}")
        return True
    except EmailDeliveryError as e:
        print(f"❌ Failed to send credential issued email to {recipient_email}: {str(e)}")
        return False


def send_stripe_connect_reminder_email(
    institution_email: str,
    institution_name: str,
    pending_earnings: float,
    credentials_sold: int
):
    """
    Send reminder to institution to connect their Stripe account
    
    Args:
        institution_email: Institution's email
        institution_name: Name of the institution
        pending_earnings: Amount of pending earnings
        credentials_sold: Number of credentials sold
    """
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://hrbank.ca')
    payouts_url = f"{frontend_url}/institution/payouts"
    
    subject = f"💰 You Have ${pending_earnings:.2f} CAD in Pending Earnings - HR Bank"
    
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
                            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💰 HR Bank</h1>
                                <p style="color: #d1fae5; margin: 5px 0 0 0; font-size: 14px;">Institution Payouts</p>
                            </td>
                        </tr>
                        
                        <!-- Alert Banner -->
                        <tr>
                            <td style="background-color: #f59e0b; padding: 15px; text-align: center;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 20px;">⚠️ Action Required: Connect Your Bank Account</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                                    Hello {institution_name},
                                </p>
                                
                                <p style="font-size: 16px; color: #333; line-height: 1.5; margin: 0 0 20px 0;">
                                    Great news! You have earnings waiting to be paid out, but you haven't connected your bank account yet.
                                </p>
                                
                                <!-- Earnings Summary Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
                                    <tr>
                                        <td style="padding: 25px; text-align: center;">
                                            <p style="margin: 0 0 5px 0; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Pending Earnings</p>
                                            <h2 style="margin: 0; color: #059669; font-size: 48px; font-weight: bold;">${pending_earnings:.2f}</h2>
                                            <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px;">CAD</p>
                                            <p style="margin: 15px 0 0 0; color: #065f46; font-size: 14px;">From <strong>{credentials_sold}</strong> credential{"s" if credentials_sold != 1 else ""} sold</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Setup Info -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h4 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">🚀 Quick Setup (5 minutes)</h4>
                                            <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
                                                <li style="margin: 8px 0;">Click "Connect Bank Account" below</li>
                                                <li style="margin: 8px 0;">Enter your business details</li>
                                                <li style="margin: 8px 0;">Connect your bank account</li>
                                                <li style="margin: 8px 0;">Start receiving weekly payouts!</li>
                                            </ol>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{payouts_url}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                                                Connect Bank Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Payout Schedule Note -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0;">
                                    <tr>
                                        <td style="padding: 15px;">
                                            <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                                <strong>📅 Payout Schedule:</strong> Once connected, you'll receive automatic weekly payouts every Friday directly to your bank account.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
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
                                    This is an automated reminder from HR Bank.<br>
                                    You're receiving this because you have pending earnings.
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
        send_email(institution_email, subject, html_content)
        print(f"✅ Stripe Connect reminder sent to {institution_email}")
        return True
    except EmailDeliveryError as e:
        print(f"❌ Failed to send Stripe Connect reminder to {institution_email}: {str(e)}")
        return False
