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

### Audience-Specific Landing Pages
- [x] **Main Landing Page (/)** - 100% workforce-focused, "Get Your Free Work Passport" messaging
- [x] **Institutions Landing (/institutions)** - Credential issuance, LinkedIn/Indeed trust warning
- [x] **Employers Landing (/employers)** - Beta workforce operations tools with dashboard preview
- [x] Navigation structure: Browse Jobs, Institutions, Employers (Beta), Leaderboard, Sign In

## What's Been Implemented

### January 10, 2026 - Landing Page Restructuring
- **Main Landing Page Overhaul (COMPLETE)**:
  - Removed all employer-focused sections ("For Business Owners", dashboard mockups)
  - 100% workforce-focused with "Get Your Free Work Passport" messaging
  - Added Work Passport preview card featuring Alex Johnson example
  - Privacy controls section, multilingual support section
  - "Build Your Work Passport" 3-step process
  - Navigation: Browse Jobs, Institutions, Employers (Beta), Leaderboard

- **Employers Landing Page Enhanced (COMPLETE)**:
  - Added dashboard preview card (Swan Pizza example with 4 locations)
  - Shows live metrics: 23 clocked in, 4 locations, 98% on-time
  - Clear "Beta Program — Early Access" messaging
  - "What This Is / What This Isn't" section clarifying it's NOT a hiring marketplace
  - Sample dashboard section with full feature showcase

- **Institutions Landing Page Enhanced (COMPLETE)**:
  - Added "LinkedIn and Indeed Profiles Won't Work Forever" section
  - Trust level comparison: LinkedIn 32%, Indeed 41%, PDF 45%, Blockchain 94%
  - Warning about AI-fabricated profiles and employer trust erosion
  - Fixed HTML entity issue in pricing table

- **Route Changes**:
  - `/work-passport` now redirects to main landing page (same content)
  - Jobs page empty state directs to `/signup?type=workforce`

- **Testing**: 100% pass rate (10/10 test scenarios)

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
- Audience-specific landing pages

### Backend  
- FastAPI
- MongoDB (Atlas for production)
- Stripe Connect (LIVE)
- SendGrid for emails
- Web3/Infura for blockchain

### Key Files
- `/app/frontend/src/pages/LandingPage.jsx` - Workforce-focused main landing
- `/app/frontend/src/pages/landing/InstitutionsLanding.jsx` - Institution landing with LinkedIn/Indeed warning
- `/app/frontend/src/pages/landing/EmployersLanding.jsx` - Employer Beta landing with dashboard preview
- `/app/frontend/src/App.js` - Routes configuration

## Prioritized Backlog

### P0 (Completed)
- [x] Landing page restructuring - workforce-focused main page
- [x] Remove employer sections from main landing
- [x] Add dashboard preview to employers page
- [x] Add LinkedIn/Indeed warning to institutions page

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
- Main landing page is now 100% workforce-focused (HR Bank = Human Resources Bank)
