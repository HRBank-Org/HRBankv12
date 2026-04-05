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

### Auto-Repair Data Health Feature (Feb 2026)
- **POST `/api/admin/data-health/repair`**: One-click auto-repair endpoint
  - Purges orphan records across 12 collections (profiles, attendance, timesheets, notifications, etc.)
  - Links blockchain credentials missing `workforce_id`
  - Syncs occupation counts on workforce profiles
  - Re-propagates shift ratings to workforce profiles
  - Returns detailed repair log with counts per collection
  - Idempotent — safe to run repeatedly
- **Frontend**: Red "Auto-Repair" button appears only when issues detected, repair result panel shows breakdown
- **TESTED**: Iteration 30 — 100% pass (18/18 backend + all frontend)

### Pydantic Model Standardization (Feb 2026)
- Fixed deprecated `datetime.utcnow` → `datetime.now(timezone.utc)` across 8 model files
- Added `ConfigDict(extra="ignore")` to 4 models missing it
- All linting passes

### Deployment Readiness (Feb 2026)
- Fixed `.gitignore` and `.dockerignore` blocking `.env` files
- App deployment-ready for AWS Lightsail Docker setup

### Data Health Monitor Dashboard (Feb 2026)
- **GET `/api/admin/data-health`**: Real-time integrity scan
- Admin page at `/admin/data-health` with color-coded cards
- **TESTED**: Iteration 29 — 100% pass

### Data Integrity Migration v1 + v2 (Feb 2026)
- 241+ orphaned records cleaned across all profile types
- Backend routes updated with `$or` queries for backward compatibility
- **TESTED**: Iterations 28, 29 — 100% pass

### Multi-Language Translation System (Feb 2026)
- 7 languages, 195+ pages, all headers/sidebars translated
- **TESTED**: Iteration 27 — 100% pass

### Sidebar Navigation Persistence (Dec 2025)
- Layout wrappers for all dashboard types
- **TESTED**: Iterations 25, 26 — 100% pass

### Leaderboard Feature
- Built but temporarily hidden

## Database Integrity Status: HEALTHY (0 issues)

## Prioritized Backlog

### P1 (High)
- Partner institution logos hotlinking fix (user verification pending)

### P2 (Medium)
- Browser locale-based auto-detect language feature
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation of all pages
- Franchise Management UI
- CI/CD pipeline

## Testing History
| Iteration | Scope | Result |
|-----------|-------|--------|
| 25 | Sidebar bug identification | Pass |
| 26 | Sidebar fix verification | 100% |
| 27 | Translation UI testing | 100% |
| 28 | Data migration v1 (backend) | 100% (12/12) |
| 29 | Data health dashboard (full) | 100% (11/11 + frontend) |
| 30 | Auto-repair feature | 100% (18/18 + frontend) |

---
*Last Updated: February 2026*
