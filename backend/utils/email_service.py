from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from config.settings import settings
import logging
import os

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        self.from_email = settings.SENDGRID_FROM_EMAIL
    
    async def send_email(self, to_email: str, subject: str, html_content: str, plain_content: str = None):
        """Send email via SendGrid"""
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content,
                plain_text_content=plain_content or html_content
            )
            
            response = self.sg.send(message)
            logger.info(f"Email sent to {to_email}: {subject} - Status: {response.status_code}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_verification_email(self, to_email: str, full_name: str, verification_token: str):
        """Send email verification email"""
        verification_link = f"{os.environ.get('FRONTEND_URL', 'https://vault.hrbank.ca')}/verify-email?token={verification_token}"
        
        subject = "Verify Your HR Bank Email"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #3B5998; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">HR Bank</h1>
            </div>
            <div style="padding: 40px 20px; background: #ffffff;">
                <h2 style="color: #333;">Hi {full_name}! 👋</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Welcome to HR Bank! Please verify your email address to activate your account.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" 
                       style="background: #3B5998; color: white; padding: 15px 40px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-weight: bold;">
                        Verify Email
                    </a>
                </div>
                <p style="color: #999; font-size: 14px;">
                    This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
                </p>
                <p style="color: #999; font-size: 14px;">
                    Or copy and paste this link: <br>
                    <a href="{verification_link}" style="color: #3B5998;">{verification_link}</a>
                </p>
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>HR Bank - Connecting Workers with Employers</p>
                <p>vault.hrbank.ca</p>
            </div>
        </div>
        """
        
        plain_content = f"""
        Hi {full_name}!
        
        Welcome to HR Bank! Please verify your email address by clicking the link below:
        
        {verification_link}
        
        This link will expire in 24 hours.
        
        If you didn't create this account, you can safely ignore this email.
        
        HR Bank - vault.hrbank.ca
        """
        
        return await self.send_email(to_email, subject, html_content, plain_content)
    
    async def send_otp_email(self, to_email: str, full_name: str, otp_code: str):
        """Send OTP verification email"""
        subject = "Your HR Bank Verification Code"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
                <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Secure Verification</p>
            </div>
            <div style="padding: 40px 30px; background: #ffffff;">
                <h2 style="color: #1e3a5f; margin-bottom: 20px;">Hi {full_name}! 👋</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    Welcome to HR Bank! Use the verification code below to complete your account setup.
                </p>
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 25px 0; border: 2px dashed #cbd5e1;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">Your Email Verification Code</p>
                    <p style="font-size: 42px; font-weight: bold; color: #1e3a5f; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{otp_code}</p>
                </div>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                        ⏰ <strong>This code expires in 10 minutes.</strong> Do not share this code with anyone.
                    </p>
                </div>
                <p style="color: #9ca3af; font-size: 13px; margin-top: 25px;">
                    If you didn't create an HR Bank account, you can safely ignore this email.
                </p>
            </div>
            <div style="background: #1e3a5f; padding: 25px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">HR Bank - Connecting Workers with Employers</p>
                <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0;">hrbank.ca</p>
            </div>
        </div>
        """
        
        plain_content = f"""
        Hi {full_name}!
        
        Welcome to HR Bank! Use the verification code below to complete your account setup.
        
        Your Email Verification Code: {otp_code}
        
        This code expires in 10 minutes. Do not share this code with anyone.
        
        If you didn't create an HR Bank account, you can safely ignore this email.
        
        HR Bank - hrbank.ca
        """
        
        return await self.send_email(to_email, subject, html_content, plain_content)
    
    async def send_password_reset_email(self, to_email: str, full_name: str, reset_link: str):
        """Send password reset email"""
        
        subject = "Reset Your HR Bank Password"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #3B5998; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">HR Bank</h1>
            </div>
            <div style="padding: 40px 20px; background: #ffffff;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Hi {full_name}, we received a request to reset your password.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background: #3B5998; color: white; padding: 15px 40px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #999; font-size: 14px;">
                    This link will expire in 1 hour. If you didn't request this, please ignore this email.
                </p>
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>HR Bank - vault.hrbank.ca</p>
            </div>
        </div>
        """
        
        return await self.send_email(to_email, subject, html_content)

# Singleton instance
email_service = EmailService()


# Add ticket response email method
async def send_ticket_response_email(to_email: str, user_name: str, ticket_id: str, subject: str, response_preview: str):
    """Send email notification when admin responds to a support ticket"""
    email_subject = f"Response to Your Support Ticket #{ticket_id}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Support Update</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">Hi {user_name}! 📬</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Our support team has responded to your ticket.
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #1e3a5f;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Ticket #{ticket_id}</p>
                <p style="font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0 0 15px 0;">{subject}</p>
                <p style="color: #4b5563; font-size: 14px; margin: 0; line-height: 1.6;">
                    {response_preview}{'...' if len(response_preview) >= 200 else ''}
                </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://hrbank.ca/workforce/support" 
                   style="background: #1e3a5f; color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold;">
                    View Full Response
                </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 25px;">
                If you have any additional questions, feel free to reply to your ticket.
            </p>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">HR Bank Support Team</p>
            <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0;">hrbank.ca</p>
        </div>
    </div>
    """
    
    plain_content = f"""
    Hi {user_name}!
    
    Our support team has responded to your ticket.
    
    Ticket #{ticket_id}: {subject}
    
    Response preview:
    {response_preview}
    
    View the full response at: https://hrbank.ca/workforce/support
    
    If you have any additional questions, feel free to reply to your ticket.
    
    HR Bank Support Team
    hrbank.ca
    """
    
    return await email_service.send_email(to_email, email_subject, html_content, plain_content)

# Add the method to the EmailService class as well
EmailService.send_ticket_response_email = lambda self, to_email, user_name, ticket_id, subject, response_preview: send_ticket_response_email(to_email, user_name, ticket_id, subject, response_preview)
