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

### January 10, 2026 - Final PWA & Cron Setup (COMPLETE)
- **Credential Expiry Checker Cron Job:**
  - Script: `/app/backend/scripts/check_credential_expiry.py`
  - Checks credentials expiring in 30, 14, 7, 3, 1 days
  - Sends push notifications and creates in-app notifications
  - Recommended cron: `0 8 * * * cd /app/backend && python scripts/check_credential_expiry.py`

- **PWA Install Prompt:**
  - Only shows for workforce and employer users
  - Triggers 3 seconds after login
  - Can be dismissed (7-day cooldown)
  - Detects if already installed

### January 10, 2026 - Push Notification Triggers (COMPLETE)
- **Push Notification Service Created:**
  - `/app/backend/utils/push_notifications.py` with full Web Push API support
  - Pre-built notification templates for all key events
  - Installed pywebpush library

- **Events that trigger push notifications:**
  - Credential Issued (to worker)
  - Shift Assigned (to worker)
  - Shift Reminder (to worker)
  - Shift Cancelled (to worker)
  - Payment Received (to worker)
  - New Message (to recipient)
  - Shift Available (to matching workers)
  - Credential Expiring (to worker)
  - Worker Applied (to employer)
  - Worker Checked In (to employer)
  - Verification Request (to institution)

- **Integration points:**
  - `blockchain_credentials.py` - triggers on credential issuance
  - `shift_notification_service.py` - triggers on shift events

### January 10, 2026 - Institution Directory Import & Request System (COMPLETE)
- **1,758 Institutions Imported:**
  - Fixed French character encoding (Mojibake) for Quebec institutions
  - Data includes: Name, Province, City, Phone, Website, Program Categories
  - Provinces: QC (619), ON (524), BC (224), AB (221), MB (69), others
  
- **"Request to Join" System:**
  - Workers can request their institution to join HR Bank
  - Request count displayed on Leaderboard
  - Backend API tracks all requests by institution
  
- **Admin Dashboard:**
  - New page at `/admin/institution-directory`
  - Shows: Total institutions, Active partners, Join requests, Coverage rate
  - "Most Requested" section for priority outreach
  - Export to CSV for outreach campaigns
  - Filter by province, type, search
  
- **Leaderboard Updates:**
  - Shows 1,758 institutions in "All Institutions" tab
  - Non-partner institutions have "Request to Join" button
  - Partners show credential count, non-partners show request count

### January 10, 2026 - GTM Strategy Updates (Session 2)
- **Bug Fix: InstitutionsLanding.jsx Icon Import (COMPLETE)**:
  - Fixed missing GraduationCap and Award icon imports from lucide-react
  - Page was rendering blank due to undefined icons

- **Blockchain Messaging Verification (COMPLETE)**:
  - Workforce page displays: "Unlike LinkedIn and Indeed, You Don't Claim Competence"
  - "secured on the blockchain where they can never be faked, altered, or disputed"
  - "Polygon blockchain" references throughout
  - "Always Current" credential validity tracking section visible
  - "Verified on Polygon Blockchain" badge on sample Work Passport

- **Institutions Page Messaging (COMPLETE)**:
  - "Issue Blockchain Credentials. Prove Authenticity Forever."
  - "For All Regulated Training Providers" badge
  - Three provider types: Universities & Colleges, Training Centers, Specialized Providers
  - Inclusivity message: "The only requirement: Your credentials must be regulated or recognized"
  - Examples include: WHMIS, Forklift, Working at Heights, Food Handler, Smart Serve

- **Testing**: 100% pass rate (iteration_7.json) - 11/11 scenarios passed

### January 10, 2026 - Leaderboard Regions Feature (COMPLETE)
- **New "Regions" Tab on Leaderboard:**
  - Added 12 Ontario regions: Durham, Peel, York, Halton, Toronto, Hamilton, Waterloo, Niagara, Ottawa, London, Windsor, Simcoe
  - Also added regions for BC (3), AB (2), QC (2)
  - Workforce density progress bars show percentage toward job-matching threshold
  - Region status badges: Early Stage → Emerging → Growing → Almost Ready → Active
  - "How Job Matching Works" explainer section
  - "Get Your Passport" CTA for inactive regions
  - Province selector dropdown (ON, BC, AB, QC)

- **Backend API:**
  - New endpoint: `/api/leaderboard/regions?province=ON`
  - Returns region name, cities, worker count, threshold, density percentage, status
  - City-to-region mapping for accurate workforce counting

- **Testing**: 100% pass rate (iteration_8.json) - 16/16 backend, 10/10 frontend scenarios passed

### January 10, 2026 - GTM Strategy Updates (Session 1)
- **Navigation Standardization (COMPLETE)**:
  - All pages now have consistent nav: Workforce, Institutions, Leaderboard, Employers (Beta), Jobs, Sign In
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
- [x] Landing page restructure (Hero video → Work Passport™ → AI Agent)
- [x] Work Passport™ messaging update (trademark added throughout)
- [x] Remove pricing from Institutions page
- [x] Update Employers pricing to Early Adopter offer
- [x] Leaderboard Region Filtering with Workforce Density Indicators
- [x] Institution Directory Import (1,758 institutions)
- [x] "Request to Join" system with social responsibility messaging
- [x] Remove test institutions from display (only real partners shown)
- [x] Local database seed script created
- [x] PWA Push Notification infrastructure

### P1 (High Priority - GTM)
- [ ] Configure VAPID keys for push notifications (backend integration)
- [ ] Add push notification triggers for key events (shifts, credentials)
- [ ] Institution Directory Admin UI refinements

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
