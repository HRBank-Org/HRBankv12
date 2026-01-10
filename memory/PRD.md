# HR Bank Platform - Product Requirements Document

## Original Problem Statement
Build a comprehensive HR platform with blockchain credentialing, credential monetization, and multi-user type support (workforce, employer, institution, admin).

## User Personas
1. **Workforce Users** - Job seekers looking for employment with verified credentials
2. **Employers** - Businesses looking to hire verified workers
3. **Institutions** - Educational institutions issuing blockchain credentials
4. **Admins** - Platform administrators managing the ecosystem

## Core Requirements

### Authentication & User Management
- [x] Multi-user type registration and login
- [x] Google OAuth integration
- [x] Role-based access control
- [x] Profile management per user type

### Blockchain Credentialing
- [x] Issue credentials via blockchain (Polygon Mainnet)
- [x] Verify credentials with QR codes
- [x] IPFS storage via Pinata
- [x] Work Passport - portable verified profile

### Credential Monetization (Stripe Connect)
- [x] Institution payout system via Stripe Connect (LIVE)
- [x] Automated Canadian tax calculations
- [x] Self-service Stripe onboarding for institutions
- [x] Admin monitoring of institution Stripe status
- [x] Email notifications for credentials and payments

### Platform Features
- [x] Job posting and matching
- [x] Shift scheduling and time tracking
- [x] Public leaderboard for institutions
- [x] Work Passport with security verifications

### Audience-Specific Landing Pages
- [x] `/work-passport` - Free Work Passport page for workforce/students
- [x] `/institutions` - Credential issuance focused page for educational institutions
- [x] `/employers` - Beta workforce operations tools page for employers
- [x] Updated main navigation: Work Passport (Free), Institutions, Employers (Beta), Leaderboard, Sign In
- [x] Jobs page empty state encourages Work Passport creation

## What's Been Implemented

### January 10, 2026
- **Focused Landing Pages Implementation (P0 COMPLETE)**:
  - Created `/work-passport` landing page focused on workforce/students with "Free Work Passport" messaging
  - Created `/institutions` landing page focused on educational institutions with credential issuance and revenue messaging
  - Created `/employers` landing page positioned as "Beta" for workforce operations tools (attendance, timesheets, scheduling)
  - Updated main landing page navigation to: Work Passport (Free), Institutions, Employers (Beta), Leaderboard, Sign In
  - Updated navigation consistency across all landing pages
  - Fixed Sign In links to use `/login` instead of `/auth/login`
  - Updated Jobs page empty state to encourage Work Passport creation when no jobs match filters
  - All 7 test scenarios passed (100% frontend testing success)

### Previous Sessions (January 8-9, 2026)
- Completed subdomain-specific landing pages integration
- Super Admin Page Audit Complete (22 pages, 100% pass rate)
- Fixed CredentialReviews API endpoint
- Added Blockchain Badge to Employer Workforce View
- Institution Directory System with CSV import and "Request to Join" feature
- Emma Translation Fixed with multilingual value proposition
- Stripe Connect integration (LIVE key)
- AWS Lightsail deployment complete

## Technical Architecture

### Frontend
- React with React Router
- Shadcn/UI components
- Subdomain detection via hostname parsing
- Theme provider per user type

### Backend  
- FastAPI
- MongoDB (Atlas for production)
- Stripe Connect (LIVE)
- SendGrid for emails
- Web3/Infura for blockchain

### Key Files
- `/app/frontend/src/pages/landing/` - Audience-specific landing pages
  - `WorkPassportLanding.jsx` - Workforce focused
  - `InstitutionsLanding.jsx` - Institution focused
  - `EmployersLanding.jsx` - Employer Beta focused
- `/app/frontend/src/pages/LandingPage.jsx` - Main landing page
- `/app/frontend/src/pages/PublicJobsPage.jsx` - Jobs with Work Passport empty state
- `/app/frontend/src/App.js` - Routes for all landing pages

## Prioritized Backlog

### P0 (Completed)
- [x] Audience-specific landing pages (Work Passport, Institutions, Employers Beta)
- [x] Updated navigation across all landing pages
- [x] Jobs page empty state with Work Passport CTA

### P1 (High Priority)
- [ ] Institution Directory Import & Admin UI (1,800 institutions CSV upload)
- [ ] Enhance PWA Functionality (push notifications, offline access)
- [ ] Build Frontend for Auto-Dispatch monitoring

### P2 (Medium Priority)
- [ ] Remove old Career Profile components/routes (dead code cleanup)
- [ ] Build out 11 placeholder pages with functionality
- [ ] Fix bcrypt deprecation warning
- [ ] Workforce Dashboard Performance optimization

### P3 (Low Priority)
- [ ] Replace remaining utcnow() usages
- [ ] Enhance Admin Management with map visualization
- [ ] Build Franchise Management UI
- [ ] Full i18n Implementation

## Known Issues
- YouTube video background may show unavailable in some environments (main landing hero)
- Deployment agent unreliable - use manual AWS Lightsail deployment
- Old Career Profile components still in codebase (should be removed)

## Test Credentials
- Super Admin: qnizami@hrbank.ca / Test123!
- Institution: demo@stclairecollege.ca / Demo123!
- Employer: demo@swanpizza.ca / Demo123!
- Workforce: alex.johnson@email.com / Demo123!

## Critical Notes
- **LIVE Stripe key is configured** - all transactions are real
- **Application is deployed on AWS Lightsail** - changes require redeployment
- Production database on MongoDB Atlas
- Custom domain hrbank.ca setup in progress
