# HR Bank - Product Requirements Document

## Original Problem Statement
Build a comprehensive HR platform (HR Bank) for workforce management in the Windsor-Essex and Leamington regions of Ontario, Canada, featuring:
- Dual OTP verification (Email + SMS) for user registration
- Multi-role authentication (Workforce, Employer, Institution, Admin)
- Google OAuth integration
- WorkPassport™ credentials system
- Blockchain-based credential verification
- Real-time shift management and time tracking
- Support for high school co-op and volunteer programs

## User Personas
1. **Workforce** - Job seekers building verified credentials (including high school students)
2. **Employers** - Companies hiring verified workers
3. **Institutions** - Educational bodies issuing credentials
4. **Admins** - Platform administrators managing users and approvals

## Core Requirements
- Secure authentication with dual OTP (SendGrid email + Twilio SMS)
- Google OAuth for social login
- EULA acceptance flow for all user types
- Admin dashboard with pending activations management
- Address-based filtering for admin operations (Windsor-Essex region focus)
- Responsive landing pages with popup login modals
- Co-op/Volunteer program support for high school students

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

### Credential Verification System ✅ (Updated Jan 16, 2026)
- Fixed credential types loading from `/api/credentials/types` (18 types)
- Institution autocomplete from 1,758+ Canadian institutions
- New `/api/institution-directory/search` endpoint for autocomplete

### SOC2 & PIPEDA Compliance Technical Foundations ✅ (Added Jan 16, 2026)

#### Phase 1: Audit Logging
- **File**: `/app/backend/services/audit_logger.py`
- 42 event types covering auth, data access, admin actions, security
- Tamper-evident checksums for audit integrity
- 7-year retention for SOC2 compliance

#### Phase 2: Data Security (AWS KMS)
- **File**: `/app/backend/services/encryption_service.py`
- AWS KMS integration with local Fernet fallback
- Field-level encryption for PII (SIN, bank accounts, SSN, etc.)
- Searchable hashing for sensitive lookup fields

#### Phase 3: Access Controls
- **File**: `/app/backend/services/session_manager.py`
  - Track active sessions with IP/device info
  - Max 5 concurrent sessions enforcement
  - Force logout capabilities
  
- **File**: `/app/backend/services/security_controls.py`
  - Account lockout after 5 failed attempts (30 min)
  - Rate limiting (100 requests/minute)
  - Password strength & history validation
  - Suspicious activity detection

#### Phase 4: PIPEDA Compliance
- **File**: `/app/backend/services/data_retention.py`
  - Configurable retention policies by data type
  - User data export (right to portability)
  - User data deletion (right to erasure)
  
- **File**: `/app/backend/services/consent_manager.py`
  - Consent tracking (ToS, privacy, marketing)
  - Full consent history audit trail

#### Compliance API Endpoints (`/api/compliance/*`)
- `GET /consents/me` - Get user's consent status
- `POST /consents/me` - Update consent
- `POST /data/export` - Export all user data (PIPEDA)
- `POST /data/deletion-request` - Request data deletion (PIPEDA)
- `GET /sessions/me` - View active sessions
- `DELETE /sessions/{id}` - Terminate session
- `GET /audit-logs` - Admin: View audit logs
- `GET /audit-logs/summary` - Admin: Audit statistics
- `GET /security/status` - Admin: Security dashboard
- `POST /admin/unlock-account/{email}` - Admin: Unlock locked account
- `POST /admin/terminate-user-sessions/{user_id}` - Admin: Force logout

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
│   ├── workforce/
│   │   └── CredentialVerification.jsx (Updated: institution autocomplete)
│   └── public/
│       ├── LandingPage.jsx
│       ├── FAQ.jsx
│       └── Help.jsx
└── contexts/AuthContext.jsx
```

### Backend (FastAPI)
```
/app/backend/
├── routes/
│   ├── auth.py (Login, Signup, OTP verification)
│   ├── eula.py (EULA content and acceptance)
│   ├── super_admin.py (Admin operations)
│   ├── institution_directory.py (Institution search)
│   └── compliance.py (SOC2/PIPEDA endpoints)
├── services/
│   ├── email_service.py (SendGrid integration)
│   ├── sms_service.py (Twilio integration)
│   ├── audit_logger.py (SOC2 audit logging)
│   ├── encryption_service.py (AWS KMS encryption)
│   ├── session_manager.py (Session tracking)
│   ├── security_controls.py (Lockout, rate limiting)
│   ├── data_retention.py (PIPEDA data lifecycle)
│   └── consent_manager.py (PIPEDA consent)
└── models/
```

### Database (MongoDB)
Collections:
- users, workforce_profiles, employer_profiles
- eula_acceptances, signup_otps
- audit_logs, active_sessions, failed_login_attempts
- account_lockouts, password_history
- consent_records, user_consents
- data_deletion_requests, data_export_requests

## 3rd Party Integrations
- **SendGrid** - Email OTP delivery
- **Twilio** - SMS OTP delivery
- **Google OAuth** - Social login
- **Docker Hub** - Container registry for deployment
- **AWS KMS** - Encryption key management (optional)

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Workforce | test@workforce.com | TestPass123! |
| Employer | test@employer.com | TestPass123! |
| Admin | test@admin.com | TestPass123! |
| Workforce (Alex) | alex.johnson@email.com | Demo123! |

## Prioritized Backlog

### P0 (Critical)
- Configure AWS KMS for production encryption
- Test OTP delivery with real user scenarios

### P1 (High Priority)
- Full i18n implementation (French/English)
- Dashboard performance optimization
- Deploy SOC2 compliance to production

### P2 (Medium Priority)
- Admin map visualization for province/zone assignment
- Franchise Management UI
- Fix `bcrypt` deprecation warning
- Replace `utcnow()` with timezone-aware datetime
- Formal SOC2 audit engagement

### P3 (Low Priority/Tech Debt)
- Commit Dockerfiles and docker-compose.yml to Git
- Code cleanup and documentation
- Security policy documentation
- Consolidate duplicate email_service.py files (utils vs services)

## Recently Completed (January 16, 2026)

### Support Ticket System ✅
Complete multi-user support ticket system with:

**User Features:**
- Create support tickets with 9 categories (Account, Documents, Verification, Payments, Technical, Shifts, Credentials, Feature Request, General)
- 4 priority levels (Low, Medium, High, Urgent)
- View all personal tickets with filtering by status
- View ticket details and conversation history
- Reply to open tickets
- Close tickets with satisfaction rating (1-5)
- Reopen closed/resolved tickets with reason

**Admin Features:**
- Dashboard with statistics (Open, In Progress, Waiting User, Unassigned, Total)
- Search and filter by status, priority, category, user type
- Filter for unassigned tickets only
- View full ticket details including internal admin notes
- Reply to tickets (public response or internal note)
- Update ticket status and priority
- Auto-assignment when admin responds to unassigned ticket
- Email notifications sent to users on admin response

**API Endpoints:**
- `GET /api/support/categories` - Get ticket categories
- `POST /api/support/tickets` - Create ticket (user)
- `GET /api/support/tickets` - List user's tickets
- `GET /api/support/tickets/{id}` - Get ticket detail (user)
- `POST /api/support/tickets/{id}/reply` - Reply to ticket (user)
- `POST /api/support/tickets/{id}/close` - Close ticket (user)
- `POST /api/support/tickets/{id}/reopen` - Reopen ticket (user)
- `GET /api/support/admin/tickets` - List all tickets (admin)
- `GET /api/support/admin/tickets/{id}` - Get ticket detail (admin)
- `POST /api/support/admin/tickets/{id}/reply` - Reply to ticket (admin)
- `PATCH /api/support/admin/tickets/{id}` - Update ticket (admin)
- `GET /api/support/admin/stats` - Get statistics (admin)

**Frontend Pages:**
- `/workforce/support` - Workforce support center
- `/employer/support` - Employer support center
- `/institution/support` - Institution support center
- `/admin/support-tickets` - Admin ticket management

### Role Management Updates (January 19, 2026)

**1. Address Localization:**
- All addresses updated to Windsor-Essex region (Windsor, Leamington, Kingsville, Essex, Tecumseh, LaSalle, Amherstburg)
- Workplaces, employer profiles, workforce profiles, and shift locations updated

**2. Co-op/Volunteer Program Support:**
- New checkbox on role creation: "Co-op / Volunteer Eligible"
- Allows employers to mark roles as suitable for high school students
- Students' hours tracked in WorkPassport for credit purposes
- Schools/organizations can generate volunteer certificates

**3. Role Type Naming Cleanup:**
- Renamed `shift_type` to `work_type` in role models for clarity
- Work types: `on_site`, `route_based`, `continental`
- Shifts inherit `work_type` from their role (no duplication)
- Backward compatibility maintained for existing data

**API Changes:**
- `POST /api/employer/workplace-roles/create` - Now accepts `work_type` and `coop_volunteer_eligible`
- `PUT /api/employer/workplace-roles/{id}/update` - Can update `work_type` and `coop_volunteer_eligible`
- `GET /api/employer/workplace-roles/list` - Returns normalized `work_type` field

## Known Issues
- EULA shows Worker version for Admin users (cosmetic)
- Some seeded users missing password_hash field
- OTP delivery may require Twilio geo-permissions configuration

## Recently Completed (January 21, 2026)

### Invoicing System Frontend ✅
Complete invoice management interface for all user types:

**User Features (Workforce, Employer, Institution):**
- Invoice list page at `/{user_type}/invoices`
- Summary cards showing Total Revenue, Pending Amount, Paid/Pending/Overdue counts
- Filter invoices by status (Paid, Sent, Overdue, Draft, Cancelled)
- Detailed invoice modal with line items, tax breakdown (GST/PST/HST)
- PDF download button for each invoice
- Navigation links added to all user sidebars

**Admin Features:**
- Admin Invoice Management page at `/admin/invoices`
- All user invoice visibility with customer type filter
- Mark invoices as Paid or Cancelled
- View invoice details with full line items and tax calculation
- Download PDF invoices

### Partner API Frontend ✅
Complete partner management interface for admins:

**Partner Management Page (`/admin/partners`):**
- View all registered API partners (like CleanGrid)
- See partner status, jobs forwarded count, registration date
- Register new partners with modal form
- View partner credentials (Partner ID, API Key, Webhook Secret)
- Tab for viewing all partner-forwarded jobs

**Partner Jobs on Job Board:**
- New "Partner Jobs" tab on Find Jobs page (`/workforce/find-jobs`)
- Jobs displayed with partner badge (e.g., "CleanGrid")
- Co-op Eligible badge for qualifying positions
- Full job details: company, location, pay rate, skills
- Apply Now button with application count
- Link to view job on partner site (if available)

### Public Pages UI Cleanup ✅
Updated all public legal/info pages:
- Replaced "Sign In" button with "Back to Home" link
- Updated logo from emoji to actual HR Bank logo image
- Affected pages: Privacy, About, Contact, FAQ, Help, Leaderboard
- Removed duplicate route conflict for `/privacy`

**Files Created/Modified:**
- `/app/frontend/src/pages/admin/Invoices.jsx` - Admin invoice management
- `/app/frontend/src/pages/admin/PartnerManagement.jsx` - Partner management
- `/app/frontend/src/pages/workforce/FindJobs.jsx` - Added partner jobs tab
- `/app/frontend/src/pages/public/*.jsx` - Updated headers on all public pages
- `/app/frontend/src/components/layout/*Sidebar.jsx` - Added Invoice navigation

## Deployment Notes
- Production: hrbank.ca (AWS Lightsail)
- Local Docker builds should be done outside OneDrive
- Container images pushed to Docker Hub for deployment

## AWS KMS Configuration (For Production)
Add to `/app/backend/.env`:
```
AWS_KMS_KEY_ID=your-kms-key-id
AWS_REGION=ca-central-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Data Retention Policies
| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Audit Logs | 7 years | SOC2 requirement |
| Timesheets/Payroll | 7 years | Tax requirement |
| Credentials | 10 years | Professional records |
| Sessions | 90 days | Security |
| OTPs | 1 day | Security |
| User Accounts | Until deletion | PIPEDA |
