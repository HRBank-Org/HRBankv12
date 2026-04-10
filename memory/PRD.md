# HR Bank - Product Requirements Document

## Original Problem Statement
Full-stack HR compliance and management application with specialized dashboards for Admin, Employer, Workforce, and Institution users. Features WorkPassport credentials, multi-language support, and compliance management.

## Core Architecture
- **Frontend**: React + TailwindCSS + Vite (Port 3000)
- **Backend**: FastAPI + MongoDB Motor Async (Port 8001)
- **Deployment**: Docker (two containers in one Lightsail Container Service)
- **Database**: MongoDB Atlas (`hrbank_db`)
- **Docker Images**: `qaisijoe/hrbank-frontend:v27+`, `qaisijoe/hrbank-backend:v27+`
- **DNS**: `hrbank.ca` → `hrbank-backend` Container Service

## What's Been Implemented (This Session)

### Invite Email Fix (Apr 2026)
- **Root cause**: `institution_classes.py invite_students()` created tokens but never sent emails
- Added full HTML email template with SendGrid integration
- Fixed institution lookup using `$or` query (user_id OR institution_id)
- Fixed missing `os` import in `routes/invites.py`
- Added `FRONTEND_URL` to Settings class
- Both invite flows verified: Class invite + Bulk invite → Status 202

### Sidebar Fix — 5 Institution Pages (Apr 2026)
- ClassDetails.jsx (edit cohort) — wrapped in InstitutionLayout
- Documents.jsx — wrapped in InstitutionLayout
- NotificationSettings.jsx — wrapped in InstitutionLayout
- PartnershipAgreement.jsx — wrapped in InstitutionLayout
- VerificationQueue.jsx — wrapped in InstitutionLayout

### SafestWork Institution Account (Apr 2026)
- Scraped safestwork.com: 12 training programs
- Account: `aleblanc@safestwork.com` / `SafestWork2026!`
- Faculty: "Health & Safety Training" with 12 programs (WAH, Forklift, CPR, etc.)
- Logo downloaded to `backend/static/logos/inst_safestwork.png`

### WalletStatusWidget Fix (Apr 2026)
- Added missing `useLanguage()` hook

### Lightsail Container Service Migration (Apr 2026)
- Two containers (frontend + backend) in single service sharing localhost
- DNS updated, SSL certificate configured
- Old standalone services deleted

### Partner Logo Hotlinking Fix (Apr 2026)
- 9 institution logos downloaded to `backend/static/logos/`
- Served via `/api/static/logos/`

### WorkPassport Two-Column Print Resume (Feb 2026)
- Dark navy sidebar + white main area
- TESTED: Iteration 32 — 100% (21/21)

## Prioritized Backlog

### P0 (Deploy Now)
- Rebuild & push Docker images v28 (sidebar fix + invite email fix)

### P2 (Medium)
- Browser locale auto-detect language
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation
- CI/CD pipeline
- Make IssueCredential templates dynamic per institution

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 32 | WorkPassport print | 100% (21/21) |
| - | Invite emails | Verified via SendGrid 202 |
| - | Sidebar persistence | Verified via screenshot |

---
*Last Updated: April 2026*
