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

### WorkPassport Global Credentials System ✅ (Jan 28, 2026)
- **Unified Credential Model**: All credentials stored in `blockchain_credentials` collection
- **No Self-Reported Credentials**: Removed to maintain trust and verification integrity
- **Institution-Only Issuance**: Credentials must be issued by verified institutions
- **Payment Flow**: Users pay to claim credentials ($50-$200 CAD based on tier)
- **LinkedIn Integration**: "Add to LinkedIn" button for verified credentials only
- **Country-Based Features**: Workforce upgrade only available for Canadian users

### Internationalization (i18n) ✅ (Jan 28, 2026)
- **Languages Supported**: English, French, Spanish, Portuguese, Chinese
- **Translation System**: JSON-based with LanguageContext React provider
- **Language Selector**: Compact dropdown in header for all pages
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
- None currently

### P1 - High Priority
- Deploy WorkPassport v2 to AWS Lightsail
- Populate sample job data for WorkPassport users
- Final user verification of all features

### P2 - Medium Priority
- Create Demo Employer Data in Production
- Enhanced OTP delivery logging

### P3 - Future
- Build Franchise Management UI
- Full RTL language support (Arabic, Hebrew)
- SOC2 compliance certification
- Multi-region deployment

## File Structure
```
/app
├── backend/
│   ├── auth/
│   │   ├── dependencies.py
│   │   └── password.py (bcrypt import removed)
│   ├── routes/
│   │   ├── auth.py
│   │   ├── credential_payments.py
│   │   ├── linkedin.py
│   │   ├── workpassport.py (unified credentials)
│   │   └── workforce.py (utcnow fixed)
│   └── services/
│       └── blockchain_service.py
└── frontend/
    └── src/
        ├── contexts/
        │   └── LanguageContext.jsx (NEW)
        ├── i18n/
        │   └── translations.json (NEW)
        ├── components/
        │   ├── common/
        │   │   └── LanguageSelector.jsx (NEW)
        │   └── layout/
        │       ├── WorkPassportHeader.jsx (i18n added)
        │       └── WorkPassportSidebar.jsx (cleaned up)
        └── pages/
            ├── auth/
            │   └── Login.jsx (i18n added)
            └── workpassport/
                ├── Credentials.jsx (background images)
                ├── ProfilePreview.jsx (NEW)
                └── Signup.jsx (i18n added)
```

## Credentials & Test Accounts
- **WorkPassport**: `work.passport@test.com` / `TestPass123!`
- **Workforce**: `test@workforce.com` / `TestPass123!`
- **Employer**: `test@employer.com` / `TestPass123!`
- **Admin**: `test@admin.com` / `TestPass123!`

---
*Last Updated: January 28, 2026*
