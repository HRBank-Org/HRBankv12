# HR Bank - Product Requirements Document

## Original Problem Statement
Build a comprehensive HR platform (HR Bank) for workforce management in Canada, featuring:
- Dual OTP verification (Email + SMS) for user registration
- Multi-role authentication (Workforce, Employer, Institution, Admin)
- Google OAuth integration
- WorkPassport™ credentials system
- Blockchain-based credential verification
- Real-time shift management and time tracking

## User Personas
1. **Workforce** - Job seekers building verified credentials
2. **Employers** - Companies hiring verified workers
3. **Institutions** - Educational bodies issuing credentials
4. **Admins** - Platform administrators managing users and approvals

## Core Requirements
- Secure authentication with dual OTP (SendGrid email + Twilio SMS)
- Google OAuth for social login
- EULA acceptance flow for all user types
- Admin dashboard with pending activations management
- Address-based filtering for admin operations
- Responsive landing pages with popup login modals

## What's Been Implemented (January 2026)

### Authentication System ✅
- Dual OTP verification (Email via SendGrid, SMS via Twilio)
- Google OAuth with HTTPS redirect URI fix
- JWT-based session management
- EULA acceptance tracking per user type

### User Dashboards ✅
- **Workforce Dashboard**: Earnings, shifts, ratings, AI assistant (Emma)
- **Employer Dashboard**: Staffing status, metrics, work modes, quick actions
- **Admin Dashboard**: Platform overview, pending activations, role management

### Admin Features ✅
- Pending Activations page with province/city filtering
- User management (All Users, Credential Reviews, Document Verification)
- Admin role management (Super Admin, Regional Manager, Account Activator)

### Public Pages ✅
- Landing page with refined content strategy (compact student callout)
- Login modals for Workforce, Employer, Institution
- FAQ and Help pages
- Contact page with company phone number

### Deployment ✅
- Docker deployment to AWS Lightsail
- Dockerfiles for frontend (nginx) and backend (FastAPI)
- docker-compose.yml for container orchestration

## Technical Architecture

### Frontend (React)
```
/app/frontend/src/
├── components/
│   ├── auth/LoginModal.jsx
│   └── ui/ (shadcn components)
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   └── PendingActivations.jsx
│   ├── landing/
│   │   ├── EmployersLanding.jsx
│   │   └── InstitutionsLanding.jsx
│   └── public/
│       ├── LandingPage.jsx
│       ├── FAQ.jsx
│       └── Help.jsx
└── contexts/AuthContext.js
```

### Backend (FastAPI)
```
/app/backend/
├── routes/
│   ├── auth.py (Login, Signup, OTP verification)
│   ├── eula.py (EULA content and acceptance)
│   └── super_admin.py (Admin operations)
├── services/
│   ├── email_service.py (SendGrid integration)
│   └── sms_service.py (Twilio integration)
└── models/
```

### Database (MongoDB)
- Collections: users, workforce_profiles, employer_profiles, eula_acceptances, signup_otps

## 3rd Party Integrations
- **SendGrid** - Email OTP delivery
- **Twilio** - SMS OTP delivery
- **Google OAuth** - Social login
- **Docker Hub** - Container registry for deployment

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Workforce | test@workforce.com | TestPass123! |
| Employer | test@employer.com | TestPass123! |
| Admin | test@admin.com | TestPass123! |

## Prioritized Backlog

### P0 (Critical)
- None - MVP is complete

### P1 (High Priority)
- Full i18n implementation (French/English)
- Dashboard performance optimization

### P2 (Medium Priority)
- Admin map visualization for province/zone assignment
- Franchise Management UI
- Fix `bcrypt` deprecation warning
- Replace `utcnow()` with timezone-aware datetime

### P3 (Low Priority/Tech Debt)
- Commit Dockerfiles and docker-compose.yml to Git
- Code cleanup and documentation

## Known Issues
- EULA shows Worker version for Admin users (cosmetic)
- Some seeded users missing password_hash field

## Deployment Notes
- Production: hrbank.ca (AWS Lightsail)
- Local Docker builds should be done outside OneDrive
- Container images pushed to Docker Hub for deployment
