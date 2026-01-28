# HR Bank - Product Requirements Document

## Original Problem Statement
Build a comprehensive HR platform (HR Bank) for workforce management with:
- Dual OTP verification (Email + SMS) for user registration
- Multi-role authentication (Workforce, Employer, Institution, Admin)
- Google OAuth and LinkedIn OAuth integration
- WorkPassport™ global credentials system
- Blockchain-based credential verification
- Real-time shift management and time tracking
- Support for high school co-op and volunteer programs

## User Personas
1. **WorkPassport Users** - Global professionals building verified credential portfolios
2. **Workforce** - Canadian job seekers with work eligibility
3. **Employers** - Companies hiring verified workers
4. **Institutions** - Educational bodies issuing credentials
5. **Admins** - Platform administrators managing users and approvals

## Core Requirements
- Secure authentication with dual OTP (SendGrid email + Twilio SMS)
- Google OAuth and LinkedIn OAuth for social login
- EULA acceptance flow for all user types
- Admin dashboard with pending activations management
- Internationalization (i18n) support for global users
- Blockchain credential verification and payment system

## What's Been Implemented (January 2026)

### Password Reset Flow ✅ (Jan 28, 2026)
- **Forgot Password**: Email with reset link (1-hour expiry)
- **Reset Password**: Token-based password reset with validation
- **Frontend Pages**: `/forgot-password` and `/reset-password` pages
- **Rate Limited**: 5 requests per minute to prevent abuse

### International Institution Support ✅ (Jan 28, 2026)
- **Phone Now Optional**: Institutions can sign up with email-only verification
- **Email OTP Only**: International institutions no longer blocked by SMS requirement
- **Country Field**: Added optional country field for institution profiles

### Donation Email Notifications ✅ (Jan 28, 2026)
- **Real-time Notifications**: Institutions receive email when donations are made
- **Rich Email Template**: Shows donor name, amount, net amount after fees, and optional message
- **Non-blocking**: Email failures don't affect donation processing

### Disaster Recovery Plan ✅ (Jan 28, 2026)
- **Complete DR Documentation**: `/app/docs/disaster-recovery-plan.md`
- **Recovery Objectives**: RTO 4 hours, RPO 1 hour
- **4 Disaster Scenarios**: Database failure, infrastructure failure, security breach, third-party failure
- **Testing Schedule**: Quarterly tabletop, monthly backup restore, annual full drill

### OTP/Signup Issue Fixed ✅ (Jan 28, 2026)
- **Root Cause**: WorkPassport registration was not sending verification emails (TODO comment was never implemented)
- **Fix**: Implemented email verification flow for WorkPassport users
  - Verification email sent on signup via SendGrid
  - Email verification endpoint (`/api/auth/verify-email`) now redirects to login with success message
  - Login page shows success/error messages based on verification status
  - "Resend Verification Email" button added to WorkPassport signup success page
  - New endpoint: `POST /api/workpassport/resend-verification?email=xxx`
- **Workforce OTP Flow**: Already working correctly (dual Email + SMS verification)

### SOC2 Compliance Framework ✅ (Jan 28, 2026)
- **Audit Logging**: Comprehensive event tracking with 30+ event types, tamper-evident checksums, 7-year retention
- **Security Controls**: Account lockout (5 attempts), rate limiting, suspicious activity detection
- **Session Management**: 8-hour timeout, max 5 concurrent sessions, forced logout capability
- **Encryption**: Field-level encryption for PII (AES-256/Fernet), optional AWS KMS integration
- **Data Retention**: PIPEDA-compliant export/deletion, retention schedules, anonymization
- **Consent Management**: Required/optional consent tracking with versioning
- **Compliance Dashboard**: `/admin/soc2` - Real-time security monitoring for admins
- **Documentation**: Security policies, incident response playbook, SOC2 readiness assessment

### Fundraiser Feature ✅ (Jan 28, 2026)
- **Institution Fundraiser Management**: Create, list, update, delete campaigns
- **Graduate/WorkPassport Access**: Users can view fundraisers from credential-issuing institutions
- **5% Platform Fee**: HR Bank receives 5% of all donations
- **Progress Bars**: Visual display of raised amount vs goal
- **Stripe Integration**: Donation checkout via existing Stripe
- **Donation Tracking**: gross_amount, net_amount, platform_fee per donation
- **Test Coverage**: 82% backend, 100% frontend

### WorkPassport Global Credentials System ✅ (Jan 28, 2026)
- **Unified Credential Model**: All credentials stored in `blockchain_credentials` collection
- **No Self-Reported Credentials**: Removed to maintain trust and verification integrity
- **Institution-Only Issuance**: Credentials must be issued by verified institutions
- **Payment Flow**: Users pay to claim credentials ($50-$200 CAD based on tier)
- **LinkedIn Integration**: "Add to LinkedIn" button for verified credentials only
- **Country-Based Features**: Workforce upgrade only available for Canadian users

### Internationalization (i18n) ✅ (Jan 28, 2026)
- **Languages Supported**: English, French, Spanish, Portuguese, Chinese, Arabic, Hindi
- **Translation System**: JSON-based with LanguageContext React provider
- **Language Selector**: Compact dropdown in header for all pages
- **RTL Support**: Full support for Arabic and Hebrew
- **Browser Detection**: Auto-detects user's browser language on first visit

### UI/UX Improvements ✅ (Jan 28, 2026)
- **Sidebar Cleanup**: Removed non-functional links (Career Guidance, Courses, Find Institutions)
- **Profile Preview Page**: New page for users to preview their public profile
- **Credential Cards**: Support for custom background images from institutions
- **Language Selector**: Added to Login, Signup, and Dashboard pages

### Technical Debt Fixed ✅ (Jan 28, 2026)
- **Removed unused bcrypt import** in `/app/backend/auth/password.py`
- **Fixed deprecated utcnow()** - Replaced with `datetime.now(timezone.utc)`
- **Removed legacy workpassport_credentials collection** - Unified to blockchain_credentials
- **Fixed stripe.error.StripeError** - Updated to stripe.StripeError for newer library

### Authentication System ✅
- Dual OTP verification (Email via SendGrid, SMS via Twilio)
- Google OAuth with HTTPS redirect URI
- LinkedIn OAuth for WorkPassport users
- JWT-based session management
- EULA acceptance tracking per user type

### Credential Payment System ✅
- Stripe integration for credential payments
- Tax calculation (Canadian provincial taxes)
- 50/50 revenue split with institutions
- Blockchain minting on successful payment
- IPFS storage for credential metadata

## Data Models

### fundraisers Collection (NEW)
```json
{
  "fundraiser_id": "FUND-xxx",
  "institution_id": "usr_xxx",
  "institution_name": "string",
  "title": "string",
  "description": "string",
  "goal_amount": 50000.0,
  "min_donation": 10.0,
  "raised_amount": 0.0,          // Net to institution (95%)
  "gross_raised_amount": 0.0,    // Total from donors
  "platform_fees_total": 0.0,    // 5% to HR Bank
  "donor_count": 0,
  "platform_fee_percentage": 5.0,
  "is_active": true,
  "media_url": "optional url",
  "media_type": "image|video",
  "end_date": "optional ISO date"
}
```

### fundraiser_donations Collection (NEW)
```json
{
  "donation_id": "DON-xxx",
  "fundraiser_id": "FUND-xxx",
  "donor_id": "wp_xxx",
  "donor_name": "string",
  "gross_amount": 100.0,
  "platform_fee": 5.0,
  "net_amount": 95.0,
  "message": "optional",
  "anonymous": false,
  "stripe_session_id": "cs_xxx",
  "stripe_payment_intent": "pi_xxx"
}
```

### blockchain_credentials (Unified Collection)
```json
{
  "credential_id": "CRED-xxx",
  "worker_id": "wp_xxx | wf_xxx",
  "institution_id": "inst_xxx",
  "institution_name": "string",
  "institution_logo": "url",
  "credential_background_url": "url (optional)",
  "credential_name": "string",
  "credential_type": "certificate | diploma | degree",
  "status": "issued | verified | revoked",
  "blockchain_transaction_hash": "string",
  "ipfs_url": "string",
  "payment_info": { "amount_cad", "transaction_id", "paid_at" }
}
```

## API Endpoints

### Fundraisers (NEW)
- `POST /api/fundraisers/create` - Create fundraiser (Institution only)
- `GET /api/fundraisers/institution/list` - List institution's fundraisers
- `GET /api/fundraisers/institution/{id}` - Get fundraiser details with donations
- `PUT /api/fundraisers/institution/{id}` - Update fundraiser
- `DELETE /api/fundraisers/institution/{id}` - Delete fundraiser
- `GET /api/fundraisers/my-institutions` - Get fundraisers from user's institutions
- `GET /api/fundraisers/public/{id}` - Get public fundraiser details
- `POST /api/fundraisers/donate/{id}` - Initiate donation (creates Stripe checkout)
- `POST /api/fundraisers/webhook/donation-complete` - Process completed donation

### WorkPassport
- `POST /api/workpassport/register` - Create WorkPassport account
- `GET /api/workpassport/profile` - Get user profile
- `GET /api/workpassport/credentials` - Get user's blockchain credentials
- `GET /api/workpassport/verify/{passport_id}/{credential_id}` - Public verification

### Credential Payments
- `POST /api/credential-payments/issue-pending` - Institution issues credential
- `GET /api/credential-payments/my-pending` - Get pending credentials
- `POST /api/credential-payments/initiate-payment` - Start Stripe payment
- Webhook: `/api/credential-payments/webhook` - Stripe payment completion

### LinkedIn
- `GET /api/linkedin/authorize` - Start OAuth flow
- `GET /api/linkedin/callback` - Handle OAuth callback
- `POST /api/linkedin/share-credential` - Share credential to LinkedIn

## Backlog

### P0 - Critical
- ~~**OTP/Signup Issues**: Fixed - WorkPassport email verification was not being sent~~

### P1 - High Priority
- **Disaster Recovery Plan**: Document DR procedures and test annually
- **Penetration Testing**: Schedule annual security assessment
- Deploy updates to AWS Lightsail
- Populate sample job data for WorkPassport users

### P2 - Medium Priority
- **Vulnerability Scanning**: Implement automated security scans
- **CI/CD Pipeline**: Formalize deployment process
- **Privacy Impact Assessments**: Document PIA process
- Create Demo Employer Data in Production
- Expand i18n translations across the application
- Final user verification & regression testing

### P3 - Future
- Build Franchise Management UI
- SOC2 Type II Audit (external auditor)
- Multi-region deployment

## File Structure
```
/app
├── backend/
│   ├── auth/
│   │   ├── dependencies.py
│   │   └── password.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── credential_payments.py
│   │   ├── fundraisers.py (NEW)
│   │   ├── linkedin.py
│   │   ├── workpassport.py
│   │   └── workforce.py
│   ├── services/
│   │   └── blockchain_service.py
│   └── tests/
│       └── test_fundraisers.py (NEW)
└── frontend/
    └── src/
        ├── contexts/
        │   └── LanguageContext.jsx
        ├── i18n/
        │   └── translations.json
        ├── components/
        │   ├── common/
        │   │   └── LanguageSelector.jsx
        │   └── layout/
        │       ├── WorkPassportHeader.jsx
        │       └── WorkPassportSidebar.jsx
        └── pages/
            ├── auth/
            │   └── Login.jsx
            ├── donation/
            │   ├── DonationSuccess.jsx (NEW)
            │   └── DonationCancelled.jsx (NEW)
            ├── institution/
            │   └── Fundraisers.jsx (NEW)
            └── workpassport/
                ├── Credentials.jsx
                ├── Fundraisers.jsx (NEW)
                ├── ProfilePreview.jsx
                └── Signup.jsx
```

## Credentials & Test Accounts
- **Institution**: `test@institution.com` / `TestPass123!`
- **WorkPassport**: `test@workpassport.com` / `TestPass123!`
- **Workforce**: `test@workforce.com` / `TestPass123!`
- **Employer**: `test@employer.com` / `TestPass123!`
- **Admin**: `test@admin.com` / `TestPass123!`

## Third-Party Integrations
- **Stripe**: Payments for credentials and donations (KEY EXPIRED - needs renewal)
- **SendGrid**: Email notifications
- **Twilio**: SMS notifications
- **Google OAuth**: User login
- **LinkedIn OAuth**: Social login and "Add to Profile"
- **MongoDB Atlas**: Production cloud database
- **Google Analytics**: Website traffic analysis

---
*Last Updated: January 28, 2026*
