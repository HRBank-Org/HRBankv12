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
- [x] **Dual OTP Verification (NEW)** - Email + Phone OTP during signup
- [x] Admin approval workflow for new accounts
- [x] Password reset functionality

### WorkPassport™ Features
- [x] Public profile pages with blockchain verification
- [x] Professional seal and branding
- [x] Print-friendly export with watermark
- [x] Credential-level verification badges

### Employer Features
- [x] Job posting management
- [x] Shift scheduling
- [x] Worker management
- [x] WSIB compliance tracking

### Institution Features
- [x] Credential issuance
- [x] Transcript management
- [x] Student/alumni verification

### Admin Features
- [x] User management and approval
- [x] Platform analytics
- [x] Compliance monitoring

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (hrbank_db)
- **Blockchain**: Polygon Mainnet
- **Email**: SendGrid
- **SMS**: Twilio
- **Storage**: IPFS (Pinata)
- **Payments**: Stripe

## What's Been Implemented

### December 2025
- Core platform architecture
- Multi-tenant landing pages
- Blockchain credential verification
- Public WorkPassport pages

### January 2026
- **Jan 14**: Dual OTP verification system
  - Email OTP via SendGrid
  - Phone OTP via Twilio SMS
  - New verification page UI
  - Account status flow: `pending_verification` → `pending` → `active`
- **Jan 14**: WorkPassport seal branding update
  - New professional shield seal design
  - Changed header from "WORKPASSPORT™" to "WorkPassport™"

## Prioritized Backlog

### P0 (Critical)
- [ ] Configure production SendGrid/Twilio credentials
- [ ] Deploy latest changes to AWS Lightsail

### P1 (High)
- [ ] Start CleanGrid project
- [ ] Build 11 placeholder pages

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

## Production Deployment
- **AWS Lightsail**: 35.183.20.213
- **Domain**: hrbank.ca
- **SSL**: AWS Load Balancer with certificate
