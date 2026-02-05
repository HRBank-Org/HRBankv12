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
    
    async def send_donation_notification_email(
        self, 
        to_email: str, 
        institution_name: str, 
        donor_name: str, 
        amount: float, 
        net_amount: float,
        fundraiser_title: str,
        message: str = None
    ):
        """Send email notification when institution receives a donation"""
        subject = f"🎉 New Donation Received - ${amount:.2f}"
        
        message_section = ""
        if message:
            message_section = f"""
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9;">
                <p style="color: #0369a1; font-style: italic; margin: 0;">"{message}"</p>
                <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">- {donor_name}</p>
            </div>
            """
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">💝 New Donation!</h1>
            </div>
            <div style="padding: 40px 30px; background: #ffffff;">
                <p style="color: #333; font-size: 16px;">
                    Great news, <strong>{institution_name}</strong>!
                </p>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    You've received a donation for your fundraiser "<strong>{fundraiser_title}</strong>".
                </p>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 5px 0;">Donation Amount</p>
                    <p style="color: #10b981; font-size: 36px; font-weight: bold; margin: 0;">${amount:.2f}</p>
                    <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0;">
                        You receive: ${net_amount:.2f} (after 5% platform fee)
                    </p>
                </div>
                
                <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0;">
                        <strong>From:</strong> {donor_name}
                    </p>
                </div>
                
                {message_section}
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://vault.hrbank.ca/institution/financials" 
                       style="background: #ec4899; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-weight: bold;">
                        View Your Fundraisers
                    </a>
                </div>
            </div>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>HR Bank - Empowering Education</p>
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


async def send_credential_invite_email(to_email: str, institution_name: str, credential_name: str, invite_link: str):
    """Send email invitation to claim a credential by creating a WorkPassport account"""
    email_subject = f"🎓 {institution_name} has issued you a credential!"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">WorkPassport</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">by HR Bank</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">You've received a credential! 🎓</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                <strong>{institution_name}</strong> has issued you a blockchain-verified credential:
            </p>
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; border: 2px solid #cbd5e1;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Credential</p>
                <p style="font-size: 22px; font-weight: 700; color: #1e3a5f; margin: 0;">{credential_name}</p>
                <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">Issued by {institution_name}</p>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Create your free WorkPassport account to claim this credential. Your WorkPassport is a secure, 
                blockchain-verified digital wallet for all your professional credentials.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" 
                   style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 18px 50px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(30, 58, 95, 0.3);">
                    Claim Your Credential
                </a>
            </div>
            <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                    ⚡ <strong>Important:</strong> Use this email address ({to_email}) when signing up to automatically link your credential.
                </p>
            </div>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                WorkPassport by HR Bank | Blockchain-verified credentials
            </p>
            <p style="color: #64748b; font-size: 11px; margin: 10px 0 0 0;">
                hrbank.ca
            </p>
        </div>
    </div>
    """
    
    plain_content = f"""
    You've received a credential from {institution_name}!
    
    Credential: {credential_name}
    
    Create your free WorkPassport account to claim this credential:
    {invite_link}
    
    Important: Use this email address ({to_email}) when signing up to automatically link your credential.
    
    WorkPassport by HR Bank
    hrbank.ca
    """
    
    return await email_service.send_email(to_email, email_subject, html_content, plain_content)


async def send_institution_invite_email(to_email: str, requester_name: str, credential_type: str, invite_link: str):
    """Send email invitation to an institution to sign up and verify a credential"""
    email_subject = f"Credential verification request from {requester_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Institution Portal</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">Credential Verification Request 📋</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                <strong>{requester_name}</strong> has requested verification of a credential from your institution.
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #1e3a5f;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Requested Credential</p>
                <p style="font-size: 18px; font-weight: 600; color: #1e3a5f; margin: 0;">{credential_type}</p>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Join HR Bank's Institution Portal to verify credentials and issue blockchain-verified certificates to your students and alumni.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" 
                   style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 18px 50px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold; font-size: 16px;">
                    Register Your Institution
                </a>
            </div>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                HR Bank - Empowering Workforce Verification
            </p>
        </div>
    </div>
    """
    
    return await email_service.send_email(to_email, email_subject, html_content)



async def send_account_activated_email(to_email: str, full_name: str, user_type: str, login_url: str):
    """Send email notification when admin activates a user's account"""
    email_subject = "🎉 Your HR Bank Account is Now Active!"
    
    dashboard_map = {
        "workforce": "Workforce Dashboard",
        "employer": "Employer Portal",
        "institution": "Institution Portal",
        "workpassport": "WorkPassport"
    }
    dashboard_name = dashboard_map.get(user_type, "Dashboard")
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Account Activated</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">Welcome, {full_name}! 🎉</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Great news! Your HR Bank account has been reviewed and <strong>activated</strong>. 
                You now have full access to your {dashboard_name}.
            </p>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #22c55e;">
                <p style="color: #166534; font-size: 16px; margin: 0; font-weight: 600;">
                    ✅ Account Status: Active
                </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{login_url}" 
                   style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 18px 50px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(30, 58, 95, 0.3);">
                    Go to {dashboard_name}
                </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions, our support team is here to help. Simply reply to this email 
                or visit our help center.
            </p>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                HR Bank - Empowering the Modern Workforce
            </p>
        </div>
    </div>
    """
    
    plain_content = f"""
    Welcome, {full_name}!
    
    Great news! Your HR Bank account has been reviewed and activated.
    You now have full access to your {dashboard_name}.
    
    Account Status: Active
    
    Log in here: {login_url}
    
    HR Bank
    """
    
    return await email_service.send_email(to_email, email_subject, html_content, plain_content)


async def send_shift_assignment_email(to_email: str, worker_name: str, shift_details: dict):
    """Send email notification when a worker is assigned to a shift"""
    email_subject = f"📅 New Shift Assignment: {shift_details.get('title', 'Shift')}"
    
    shift_date = shift_details.get('date', 'TBD')
    start_time = shift_details.get('start_time', 'TBD')
    end_time = shift_details.get('end_time', 'TBD')
    location = shift_details.get('location', 'TBD')
    employer_name = shift_details.get('employer_name', 'Employer')
    hourly_rate = shift_details.get('hourly_rate', 'TBD')
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Shift Assignment</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">Hi {worker_name}! 📅</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                You've been assigned to a new shift with <strong>{employer_name}</strong>.
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0;">
                <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">Shift Details</h3>
                <table style="width: 100%; font-size: 14px; color: #4b5563;">
                    <tr><td style="padding: 8px 0;"><strong>Date:</strong></td><td>{shift_date}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Time:</strong></td><td>{start_time} - {end_time}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Location:</strong></td><td>{location}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Rate:</strong></td><td>${hourly_rate}/hr</td></tr>
                </table>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://hrbank.ca/workforce/my-shifts" 
                   style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    View Shift Details
                </a>
            </div>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">HR Bank</p>
        </div>
    </div>
    """
    
    return await email_service.send_email(to_email, email_subject, html_content)


async def send_document_expiry_warning_email(to_email: str, user_name: str, document_name: str, expiry_date: str, days_remaining: int):
    """Send email warning when a document is about to expire"""
    urgency = "⚠️" if days_remaining <= 7 else "📋"
    urgency_color = "#dc2626" if days_remaining <= 7 else "#f59e0b"
    
    email_subject = f"{urgency} Document Expiring Soon: {document_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Document Reminder</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">Hi {user_name},</h2>
            <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid {urgency_color};">
                <p style="color: #92400e; font-size: 16px; margin: 0;">
                    <strong>{document_name}</strong> expires in <strong>{days_remaining} day(s)</strong>
                </p>
                <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
                    Expiry Date: {expiry_date}
                </p>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Please renew your document before it expires to maintain your active status and 
                continue receiving shift assignments.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://hrbank.ca/workforce/documents" 
                   style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    Upload Renewed Document
                </a>
            </div>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">HR Bank</p>
        </div>
    </div>
    """
    
    return await email_service.send_email(to_email, email_subject, html_content)


async def send_payroll_ready_email(to_email: str, worker_name: str, pay_period: str, amount: float):
    """Send email notification when payroll is processed and ready"""
    email_subject = f"💰 Your Pay is Ready: {pay_period}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HR Bank</h1>
            <p style="color: #fbbf24; margin: 5px 0 0 0; font-size: 14px;">Payment Notification</p>
        </div>
        <div style="padding: 40px 30px; background: #ffffff;">
            <h2 style="color: #1e3a5f; margin-bottom: 20px;">Hi {worker_name}! 💰</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Your payment for <strong>{pay_period}</strong> has been processed.
            </p>
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                <p style="color: #166534; font-size: 14px; margin: 0 0 5px 0;">Amount Paid</p>
                <p style="color: #166534; font-size: 36px; font-weight: bold; margin: 0;">${amount:.2f} CAD</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://hrbank.ca/workforce/wallet" 
                   style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    View Pay Details
                </a>
            </div>
        </div>
        <div style="background: #1e3a5f; padding: 25px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">HR Bank</p>
        </div>
    </div>
    """
    
    return await email_service.send_email(to_email, email_subject, html_content)
