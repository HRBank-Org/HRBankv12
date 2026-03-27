# HR Bank - Product Requirements Document

## Original Problem Statement
Full-stack HR compliance and management application with specialized dashboards for Admin, Employer, Workforce, and Institution users. The platform features WorkPassport credentials, multi-language support, and compliance management.

## User Personas
- **Workers/Workforce**: Job seekers who need verified credentials
- **Employers**: Companies hiring verified workers
- **Institutions**: Training organizations issuing credentials
- **Admins**: Platform administrators managing the system

## Core Architecture
- **Frontend**: React + TailwindCSS + Vite (Port 3000)
- **Backend**: FastAPI + MongoDB Motor Async (Port 8001)
- **Deployment**: Docker, AWS Lightsail Instance + Load Balancer
- **Database**: MongoDB (`hrbank_db`)

## Key Technical Details
- Production: `hrbank.ca` on AWS Lightsail Ubuntu with Docker
- Docker Hub: `qaisijoe/hrbank-frontend:latest`
- Node version: `node:20-alpine` (updated from 18)
- Auth: JWT-based, `users` collection with `password_hash`

## What's Been Implemented

### Multi-Language Translation System (Feb 2026)
- **7 languages supported**: English, French, Spanish, Portuguese, Chinese, Arabic, Hindi
- **Translation infrastructure**: `LanguageContext.jsx` with `t()` function, `translations.json` with comprehensive keys
- **All 4 sidebars translated**: WorkforceSidebar, ModernSidebar (Employer), InstitutionSidebar, SuperAdminSidebar
- **All 4 dashboard headers updated**: LanguageSelector component added to WorkforceHeader, GenericHeader, InstitutionHeader, AdminHeader
- **Landing page fully translated**: Hero section, CTA buttons, navigation, footer
- **Auth pages translated**: Login, Signup, ForgotPassword
- **195 pages wired**: All page files have `useLanguage` import and `t` function available
- **Page titles/headings translated**: Dashboard pages, common pages across all sections
- **Common UI elements**: Buttons (Save, Cancel, Delete), status labels (Pending, Approved, Rejected), table headers

### Sidebar Navigation Persistence (Dec 2025)
- Created `WorkforceLayout.jsx` and `EmployerLayout.jsx` wrapper components
- All 40+ pages in Workforce and Employer directories wrapped with Layout components
- `InstitutionLayout.jsx` already existed

### Leaderboard Feature (Dec 2025)
- Built but **temporarily hidden** from public UI (no institutions onboarded yet)
- Links commented out in LandingHeader, LandingPage, About, InstitutionsLanding

### Code Cleanup (Feb 2026)
- Deleted obsolete `ClassTemplates.jsx`
- Removed ClassTemplates route from App.js

## Production Environment
- AWS Lightsail Ubuntu Instance (NOT Container Service)
- AWS Load Balancer connected
- Docker containers run directly on the instance
- Production admin: `qnizami@hrbank.ca` (temp password needs changing)

## File Structure
```
/app
├── backend/
│   ├── routes/
│   ├── models/
│   └── server.py
└── frontend/
    └── src/
        ├── i18n/translations.json (comprehensive 7-language translations)
        ├── contexts/LanguageContext.jsx (translation provider)
        ├── components/
        │   ├── common/LanguageSelector.jsx
        │   └── layout/
        │       ├── EmployerLayout.jsx
        │       ├── WorkforceLayout.jsx
        │       ├── InstitutionLayout.jsx
        │       ├── ModernSidebar.jsx (Employer - translated)
        │       ├── WorkforceSidebar.jsx (translated)
        │       ├── InstitutionSidebar.jsx (translated)
        │       ├── SuperAdminSidebar.jsx (translated)
        │       ├── LandingHeader.jsx (translated)
        │       ├── GenericHeader.jsx (+ LanguageSelector)
        │       ├── WorkforceHeader.jsx (+ LanguageSelector)
        │       ├── InstitutionHeader.jsx (+ LanguageSelector)
        │       └── AdminHeader.jsx (+ LanguageSelector)
        └── pages/ (195 pages with useLanguage available)
```

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- Partner institution logos hotlinking fix (user verification pending on mongosh script)
- Remaining page content translation (deeper page-level text beyond titles/headings)

### P2 (Medium)
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard
- SAP Integration planning
- Occupation Score System

### P3 (Low/Future)
- Franchise Management UI
- Formal SLA documentation
- CI/CD pipeline
- Vulnerability scanning
- Full deep translation of all 195 pages (form labels, table columns, error messages)

## Testing Status
- Translation system: **TESTED** (Iteration 27 - 100% pass)
- Sidebar persistence: **TESTED** (Iterations 25, 26 - 100% pass)
- Leaderboard hiding: **VERIFIED** (Iteration 27 confirmed hidden)
- ClassTemplates cleanup: **VERIFIED** (Iteration 27 confirmed removed)

---
*Last Updated: February 2026*
