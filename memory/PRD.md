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
- [x] Google OAuth integration (Fixed HTTPS redirect)
- [x] Dual OTP Verification - Email (SendGrid) + Phone (Twilio)
- [x] Admin approval workflow for new accounts
- [x] Password reset functionality
- [x] Popup Login Modals with "Remember Me" checkbox

### WorkPassport™ Features
- [x] Public profile pages with blockchain verification
- [x] Professional seal and branding
- [x] Print-friendly export with watermark
- [x] Credential-level verification badges
- [x] High School Students Section (compact callout)

### Employer Features
- [x] Job posting management
- [x] Shift scheduling
- [x] Worker management
- [x] WSIB compliance tracking
- [x] Popup Login Modal with orange theme

### Institution Features
- [x] Credential issuance
- [x] Transcript management
- [x] Student/alumni verification
- [x] Popup Login Modal with purple theme

### Admin Features
- [x] User management and approval
- [x] Platform analytics
- [x] Compliance monitoring
- [x] Activity Feed with real data
- [x] Popup Login Modal with red/dark theme

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (hrbank_db)
- **Blockchain**: Polygon Mainnet
- **Email**: SendGrid (Configured)
- **SMS**: Twilio (Configured)
- **Storage**: IPFS (Pinata)
- **Payments**: Stripe

## What's Been Implemented

### January 14, 2026
- **OTP System**: Fully functional with SendGrid (email) and Twilio (SMS)
- **Google OAuth Fix**: Backend now forces HTTPS for production redirect URIs
- **Popup Login Modals**: All landing pages now use themed popup modals with "Remember Me"
- **High School Students Section**: Moved to compact callout before final CTA
- **Activity Feed**: Updated to fetch real data from API instead of static dummy data
- **New Public Pages Created**:
  - `/faq` - Searchable FAQ with categories
  - `/help` - Help center with category cards
  - `/careers` - Careers page with open positions
- **Contact Page**: Updated phone number to +1 (416) 414-2955
- **Contact Info**: support@hrbank.ca, partnerships@hrbank.ca

## Contact Information
- **Support Email**: support@hrbank.ca
- **Partnerships Email**: partnerships@hrbank.ca
- **Phone**: +1 (416) 414-2955
- **Location**: Windsor, Ontario, Canada

## Key API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account (sends OTPs)
- `POST /api/auth/verify-signup-otp` - Verify email + phone OTPs
- `POST /api/auth/resend-signup-otp` - Resend OTP codes
- `POST /api/auth/login` - User login
- `GET /api/auth/google/login` - Google OAuth (forces HTTPS)

### Admin
- `GET /api/admin/users` - List users (for Activity Feed)
- `GET /api/admin/credential-reviews` - Credential reviews
- `GET /api/admin/support-tickets` - Support tickets

## Test Credentials
- **Super Admin**: qnizami@hrbank.ca / Test123!
- **Institution**: demo@stclairecollege.ca / Demo123!
- **Employer**: demo@swanpizza.ca / Demo123!
- **Workforce**: alex.johnson@email.com / Demo123!
- **Sample Profile Code**: ALEX2024

## Public Pages
- `/` - Main landing page (WorkPassport™)
- `/employers` - Employers landing
- `/institutions` - Institutions landing
- `/about` - About HR Bank
- `/contact` - Contact page
- `/faq` - Frequently Asked Questions
- `/help` - Help Center
- `/careers` - Careers page
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/leaderboard` - Institution leaderboard

## Production Deployment
- **AWS Lightsail**: 35.183.20.213
- **Domain**: hrbank.ca
- **Google OAuth**: Configured with HTTPS redirect URIs
- **SSL**: AWS Load Balancer with certificate

## Deployment Checklist
To deploy latest changes to production:
1. Build Docker images locally (Windows)
2. Push to Docker Hub
3. Pull and restart on AWS Lightsail
4. Verify Google OAuth works with HTTPS

## Completed in This Session
1. ✅ OTP verification working (Email + SMS)
2. ✅ Google OAuth HTTPS fix for production
3. ✅ Popup login modals on all landing pages
4. ✅ High School Students section repositioned
5. ✅ Activity Feed fetching real data
6. ✅ FAQ page created
7. ✅ Help page created
8. ✅ Careers page created
9. ✅ Contact info updated

## Ready for Next Project
HR Bank is feature-complete for current scope. Ready to start **CleanGrid** in a new session with its own database.
