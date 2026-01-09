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

### Subdomain-Specific Landing Pages
- [x] WorkforceLanding - tailored for job seekers
- [x] EmployerLanding - tailored for businesses
- [x] InstitutionLanding - tailored for educational institutions  
- [x] AdminLanding - secure admin portal
- [x] SubdomainPortal routing based on hostname detection
- [x] Correct navigation routes (/login, /signup?type=X)

## What's Been Implemented

### January 8-9, 2026
- Completed subdomain-specific landing pages integration
- Fixed navigation routes in all subdomain landing pages (auth/login -> /login)
- Fixed footer links in main LandingPage (/auth/register -> /signup)
- Fixed linting issues (Math.random, unescaped entities)
- **Fixed old auth routes in public pages**: About, Contact, Privacy, Leaderboard
- All landing page CTAs properly route to signup/login flows
- **Super Admin Audit Complete**: All 22 admin pages tested (100% pass rate)
- **Fixed CredentialReviews API**: Changed endpoint from `/api/admin/credential-submissions` to `/api/admin/credentials/pending-approval`
- **Fixed InstitutionPayouts React key warning**: Added index to prevent duplicate key errors
- **Added Blockchain Badge to Employer Workforce View**: Workers now display their verified credential count
- **Fixed Leaderboard Header**: Now matches landing page design with fixed position at top
- **Institution Directory System**:
  - Created `/api/institution-directory` API with bulk CSV import
  - Added "Request Institution to Join" feature for workforce users
  - Updated Leaderboard UI to show both Active Partners and Listed Institutions
  - Added search functionality for all Canadian institutions
  - Added "All Institutions" tab and search feature
- **Emma Translation Fixed**: Fixed `/api/emma/conversation` to pass preferred_language
- **Multilingual Value Proposition Added**:
  - New section on landing page highlighting 20+ language support
  - Emma AI chat preview showing Pashto conversation
  - Messaging: "Language Should Never Be a Barrier to Your Dream Job"
  - Added to Workforce and Employer subdomain landing pages
  - Stats: 20+ Languages, 24/7 AI Support, 100% Notification Translation

### Previous Sessions
- Stripe Connect integration (LIVE key)
- Automated tax calculations
- Email notifications (credentials + payments)
- Public leaderboard
- Work Passport enhancements
- Footer link fixes

## Technical Architecture

### Frontend
- React with React Router
- Shadcn/UI components
- Subdomain detection via hostname parsing
- Theme provider per user type

### Backend  
- FastAPI
- MongoDB
- Stripe Connect (LIVE)
- SendGrid for emails
- Web3/Infura for blockchain

### Key Files
- `/app/frontend/src/pages/subdomains/` - Subdomain landing pages
- `/app/frontend/src/pages/SubdomainPortal.jsx` - Subdomain routing
- `/app/frontend/src/utils/subdomainDetector.js` - Hostname parsing

## Prioritized Backlog

### P0 (Completed)
- [x] Subdomain-specific landing pages

### P1 (High Priority)
- [ ] Comprehensive Super Admin Page Audit
- [ ] Build Frontend for Auto-Dispatch monitoring
- [ ] Add Blockchain Badge to Employer Workforce View

### P2 (Medium Priority)
- [ ] Remove old Career Profile components/routes
- [ ] Build out 11 placeholder pages with functionality
- [ ] Fix bcrypt deprecation warning

### P3 (Low Priority)
- [ ] Replace remaining utcnow() usages
- [ ] Enhance Admin Management with map visualization
- [ ] Build Franchise Management UI

## Known Issues
- YouTube video background may show unavailable in some environments
- Deployment agent unreliable (false positives) - use manual deployment
- Subdomain landing pages require actual DNS setup for production

## Test Credentials
- Super Admin: qnizami@hrbank.ca / Test123!
- Institution: demo@stclairecollege.ca / Demo123!
- Employer: demo@swanpizza.ca / Demo123!
- Workforce: alex.johnson@email.com / Demo123!

## Critical Notes
- **LIVE Stripe key is configured** - all transactions are real
- Subdomain landing pages work via hostname detection in production
- Preview environment shows main landing page (localhost returns null)
