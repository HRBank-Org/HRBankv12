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
- Node version: `node:20-alpine`
- Auth: JWT-based, `users` collection with `password_hash`
- Admin test account: `admin@test.com` / `Admin123!` (super_admin)

## What's Been Implemented

### Deployment Readiness (Feb 2026)
- **Fixed `.gitignore`**: Removed blocking of `.env` files for deployment
- **Fixed `.dockerignore`**: Removed blocking of `backend/.env` from Docker builds
- **Deployment status**: App is deployment-ready for AWS Lightsail Docker setup
- Blockchain dependencies noted (works on user's own Docker/Lightsail, not Emergent managed hosting)

### Pydantic Model Standardization (Feb 2026)
- **Fixed `datetime.utcnow`** → `datetime.now(timezone.utc)` across ALL 8 model files (deprecated in Python 3.12+)
- **Added `ConfigDict(extra="ignore")`** to `CredentialRequest`, `VerifiedCredential`, `ShiftRatingRequest`, `ShiftRating` models
- **Added `timezone` import** to all model files needing it
- Files updated: `occupation.py`, `workforce.py`, `employment.py`, `ratings.py`, `employer.py`, `institution.py`, `credentials.py`, `shift_ratings.py`

### Data Health Monitor Dashboard (Feb 2026)
- **New admin page**: `/admin/data-health` with real-time integrity scanning
- **Backend API**: `GET /api/admin/data-health` (auth-protected)
- Shows: Profile collections health, related data orphan counts, special checks
- **TESTED**: Iteration 29 — 100% pass (11/11 backend, all frontend UI tests)

### Data Integrity Migration v1 + v2 (Feb 2026)
- **Total cleaned: 241+ orphaned records** across all profile types and related collections
- Backend routes updated with `$or` queries for backward compatibility
- **TESTED**: Iterations 28, 29 — 100% pass

### Multi-Language Translation System (Feb 2026)
- 7 languages, 195+ pages, all headers/sidebars translated
- **TESTED**: Iteration 27 — 100% pass

### Sidebar Navigation Persistence (Dec 2025)
- Layout wrappers for Workforce, Employer, Institution dashboards
- **TESTED**: Iterations 25, 26 — 100% pass

### Leaderboard Feature
- Built but temporarily hidden (no institutions onboarded yet)

## Database Integrity Status (Healthy)
- All profile collections: 0 orphans
- All related data: 0 orphans
- Shift ratings propagated, occupation counts synced
- 6 database indexes for query performance

## Prioritized Backlog

### P1 (High)
- Partner institution logos hotlinking fix (user verification pending on production DB)

### P2 (Medium)
- Browser locale-based auto-detect language feature
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation of all pages (form labels, table columns)
- Franchise Management UI
- CI/CD pipeline

## Testing History
| Iteration | Scope | Result |
|-----------|-------|--------|
| 25 | Sidebar bug identification | Pass |
| 26 | Sidebar fix verification | 100% |
| 27 | Translation UI testing | 100% |
| 28 | Data migration v1 (backend) | 100% (12/12) |
| 29 | Data health dashboard (full) | 100% (11/11 backend + frontend) |

---
*Last Updated: February 2026*
