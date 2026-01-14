# HR Bank - Product Requirements Document

## Original Problem Statement
Build a comprehensive HR platform (HR Bank) with Go-To-Market strategy focusing on distinct landing pages for "Workforce" (WorkPassport™), "Institutions," and "Employers." The platform includes blockchain-verified credentials, public leaderboards, institution directory, and PWA capabilities with push notifications.

## User Personas
1. **Workforce (WorkPassport™)** - Job seekers building verified career profiles
2. **Employers** - Companies posting jobs and hiring verified workers
3. **Institutions** - Educational institutions issuing verified credentials
4. **Admins** - Platform administrators managing users and approvals

## Core Requirements

### Authentication & Verification
- [x] JWT-based authentication
- [x] Google OAuth integration
- [x] **Dual OTP Verification (Implemented but pending credentials)** - Email + Phone OTP during signup
- [x] Admin approval workflow for new accounts
- [x] Password reset functionality
- [x] **NEW: Popup Login Modals** - User-type specific login modals with remember me

### WorkPassport™ Features
- [x] Public profile pages with blockchain verification
- [x] Professional seal and branding
- [x] Print-friendly export with watermark
- [x] Credential-level verification badges
- [x] **NEW: High School Students Section** - Encouraging early enrollment

### Employer Features
- [x] Job posting management
- [x] Shift scheduling
- [x] Worker management
- [x] WSIB compliance tracking
- [x] **NEW: Popup Login Modal** with orange theme

### Institution Features
- [x] Credential issuance
- [x] Transcript management
- [x] Student/alumni verification
- [x] **NEW: Popup Login Modal** with purple theme

### Admin Features
- [x] User management and approval
- [x] Platform analytics
- [x] Compliance monitoring
- [x] **NEW: Popup Login Modal** with red/dark theme for admin.hrbank.ca

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (hrbank_db)
- **Blockchain**: Polygon Mainnet
- **Email**: SendGrid (PENDING CREDENTIALS)
- **SMS**: Twilio (PENDING CREDENTIALS)
- **Storage**: IPFS (Pinata)
- **Payments**: Stripe

## What's Been Implemented

### December 2025
- Core platform architecture
- Multi-tenant landing pages
- Blockchain credential verification
- Public WorkPassport pages

### January 2026
- **Jan 14**: Dual OTP verification system (functional but SendGrid/Twilio credentials failing)
- **Jan 14**: WorkPassport seal branding update
- **Jan 14**: NEW - Popup Login Modals for all user types
  - Created `/app/frontend/src/components/auth/LoginModal.jsx`
  - Updated WorkforceLanding, EmployerLanding, InstitutionLanding, AdminLanding (subdomain pages)
  - Updated LandingPage.jsx, EmployersLanding.jsx, InstitutionsLanding.jsx (main pages)
  - Features: Remember me checkbox, Google OAuth, show/hide password, color themes
- **Jan 14**: NEW - High School Students Section on main landing page
  - Encouraging section with visual card showing example student profile
  - CTA for early enrollment

## Prioritized Backlog

### P0 (Critical)
- [ ] Configure production SendGrid/Twilio credentials (OTP feature blocked)
- [ ] Deploy latest changes to AWS Lightsail

### P1 (High)
- [ ] **11 Placeholder Pages** (user to provide list)
- [ ] **Start CleanGrid Project** (user to provide details)

### P2 (Medium)
- [ ] Admin Management map visualization
- [ ] Franchise Management UI
- [ ] Full i18n Implementation

### P3 (Low/Technical Debt)
- [ ] Workforce Dashboard Performance optimization
- [ ] Fix bcrypt warning on startup
- [ ] Update remaining utcnow() usages

## Environment Configuration

### Frontend (.env)
```
REACT_APP_BACKEND_URL=<production_url>
```

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=hrbank_db
SENDGRID_API_KEY=<api_key>
TWILIO_ACCOUNT_SID=<account_sid>
TWILIO_AUTH_TOKEN=<auth_token>
TWILIO_PHONE_NUMBER=<phone_number>
```

## Test Credentials
- **Super Admin**: qnizami@hrbank.ca / Test123!
- **Institution**: demo@stclairecollege.ca / Demo123!
- **Employer**: demo@swanpizza.ca / Demo123!
- **Workforce**: alex.johnson@email.com / Demo123!
- **Sample Profile Code**: ALEX2024

## Key API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account (sends OTPs)
- `POST /api/auth/verify-signup-otp` - Verify email + phone OTPs
- `POST /api/auth/resend-signup-otp` - Resend OTP codes
- `POST /api/auth/login` - User login
- `GET /api/auth/signup-verification-status/{user_id}` - Check verification status

### WorkPassport
- `GET /api/career-profile/public/{profile_code}` - Public profile data

## Key Files Reference

### Login Modal System
- `/app/frontend/src/components/auth/LoginModal.jsx` - Reusable popup login modal
- `/app/frontend/src/pages/LandingPage.jsx` - Main workforce landing
- `/app/frontend/src/pages/landing/EmployersLanding.jsx` - Employer landing
- `/app/frontend/src/pages/landing/InstitutionsLanding.jsx` - Institution landing
- `/app/frontend/src/pages/subdomains/AdminLanding.jsx` - Admin subdomain landing

### High School Section
- `/app/frontend/src/pages/LandingPage.jsx` - Contains new High School Students section

## Production Deployment
- **AWS Lightsail**: 35.183.20.213
- **Domain**: hrbank.ca
- **Subdomains planned**: workforce.hrbank.ca, employer.hrbank.ca, institution.hrbank.ca, admin.hrbank.ca
- **SSL**: AWS Load Balancer with certificate

## Known Issues
1. **OTP Feature MOCKED**: SendGrid/Twilio returning 401 errors - credentials needed
2. **bcrypt warning**: Benign startup warning
3. **utcnow deprecation**: Some usages still exist
