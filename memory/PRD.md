# HR Bank Platform - Product Requirements Document

## Original Problem Statement
Build a comprehensive HR platform with blockchain credentialing, credential monetization, and multi-user type support (workforce, employer, institution, admin).

## User Personas
1. **Workforce Users** - Job seekers looking for employment with verified credentials
2. **Employers** - Businesses looking to manage their existing workforce operations
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

### GTM Strategy Implementation
- [x] **Consistent Navigation**: Workforce, Institutions, Leaderboard, Jobs, Sign In
- [x] **Main Landing Page**: Hero video → Work Passport section → Context-aware AI Agent
- [x] **Work Passport Messaging**: "Unlike LinkedIn and Indeed, you don't claim competence — Work Passports highlights, optimizes and authenticates your skills, credentials and experience."
- [x] **Context-Aware AI Agent**: Multilingual support, no Canada-specific reference (global scalability)
- [x] **Institutions Page**: No pricing section (revenue model TBD)
- [x] **Employers Page**: Early Adopter offer - 3 months free, up to 300 workers, 10 locations

## What's Been Implemented

### January 10, 2026 - GTM Strategy Updates
- **Navigation Standardization (COMPLETE)**:
  - All pages now have consistent nav: Workforce, Institutions, Leaderboard, Jobs, Sign In
  - Fixed: LandingPage, InstitutionsLanding, EmployersLanding, Leaderboard, PublicJobsPage

- **Main Landing Page Restructured (COMPLETE)**:
  - Hero section with video background now FIRST
  - Work Passport section SECOND with new messaging about highlighting/authenticating skills
  - Context-aware AI Agent section THIRD - no Canada reference (global scalability)
  - "Emma" positioned as context-aware career guide who knows your schedule, availability, credentials

- **Institutions Page Updated (COMPLETE)**:
  - Removed "Simple Pricing" section
  - Kept LinkedIn/Indeed trust comparison section
  - Leaderboard preview section retained

- **Employers Page Updated (COMPLETE)**:
  - Changed from "Beta Pricing" to "Early Adopter Offer"
  - Now shows: Free for 3 months, up to 10 locations, up to 300 workers
  - Priority support included

- **Testing**: 100% pass rate after Jobs page nav fix

### Previous Sessions
- AWS Lightsail deployment complete
- Production MongoDB Atlas database
- Stripe Connect integration (LIVE key)
- Institution Directory System with CSV import
- Emma AI multilingual support
- Super Admin audit complete (22 pages, 100% pass)

## Technical Architecture

### Frontend
- React with React Router
- Shadcn/UI components
- Consistent navigation across all public pages

### Backend  
- FastAPI
- MongoDB (Atlas for production)
- Stripe Connect (LIVE)
- SendGrid for emails
- Web3/Infura for blockchain

### Key Files
- `/app/frontend/src/pages/LandingPage.jsx` - Workforce-focused, hero video, Work Passport, AI Agent
- `/app/frontend/src/pages/landing/InstitutionsLanding.jsx` - Institution landing (no pricing)
- `/app/frontend/src/pages/landing/EmployersLanding.jsx` - Employer Beta (3 months/300/10)
- `/app/frontend/src/pages/public/Leaderboard.jsx` - Institution leaderboard
- `/app/frontend/src/pages/PublicJobsPage.jsx` - Job listings

## Prioritized Backlog

### P0 (Completed)
- [x] Navigation standardization across all pages
- [x] Landing page restructure (Hero video → Work Passport → AI Agent)
- [x] Work Passport messaging update
- [x] Remove pricing from Institutions page
- [x] Update Employers pricing to Early Adopter offer

### P1 (High Priority - GTM)
- [ ] **Leaderboard Enhancement**: Show which institutions have joined HR Bank vs listed only
- [ ] **Region-Based Filtering**: Add Durham, Peel, York, Halton regions under Ontario
- [ ] **Workforce Density Indicator**: Show region readiness for job matching
- [ ] Institution Directory Import & Admin UI (1,800 institutions CSV upload)
- [ ] Enhance PWA Functionality (push notifications, offline access)

### P2 (Medium Priority)
- [ ] Remove old Career Profile components/routes (dead code cleanup)
- [ ] Build out 11 placeholder pages with functionality
- [ ] Build Frontend for Auto-Dispatch monitoring

### P3 (Low Priority)
- [ ] Fix bcrypt deprecation warning
- [ ] Replace remaining utcnow() usages
- [ ] Enhance Admin Management with map visualization
- [ ] Build Franchise Management UI
- [ ] Full i18n Implementation

## GTM Strategy Notes
- **Region-by-Region Launch**: Workforce density must reach threshold before job matching features launch in a region
- **Work Passports as Marketing**: Shareable assets create curiosity even before matching is active
- **Employer Beta**: Free tools build adoption; helps identify regions reaching maturity
- **Institution Leaderboard**: Shows active partners vs all institutions; builds competitive dynamics

## Known Issues
- YouTube video background may show unavailable in some environments
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
- Main landing page is 100% workforce-focused (HR Bank = Human Resources Bank)
