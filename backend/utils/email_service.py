from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from config.settings import settings
import logging

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
    
    async def send_password_reset_email(self, to_email: str, full_name: str, reset_token: str):
        """Send password reset email"""
        reset_link = f"{os.environ.get('FRONTEND_URL', 'https://vault.hrbank.ca')}/reset-password?token={reset_token}"
        
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
