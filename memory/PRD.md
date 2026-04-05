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

## What's Been Implemented

### Data Health Monitor Dashboard (Feb 2026)
- **New admin page**: `/admin/data-health` with real-time integrity scanning
- **Backend API**: `GET /api/admin/data-health` (auth-protected, admin/super_admin only)
- Shows: Profile collections health, related data orphan counts, special checks (ratings, credentials, sync)
- Color-coded cards: green checkmarks for clean, red alerts for issues
- Refresh button for on-demand scanning
- Sidebar link added to SuperAdminSidebar under Analytics
- **TESTED**: Iteration 29 — 100% pass (11/11 backend, all frontend UI tests)

### Data Integrity Migration v1 + v2 (Feb 2026)
- **Migration v1** (workforce-focused):
  - Purged 86 orphaned `occupation_profiles`
  - Propagated 41 `shift_ratings` to workforce_profiles (general_rating_avg/count)
  - Cleaned 12 broken `employment_relationships`
  - Added `workforce_id` to 16 `blockchain_credentials`
  - Synced `occupation_count` on workforce_profiles
  - Created 6 database indexes
- **Migration v2** (all profile types):
  - Cleaned 2 orphan `admin_profiles`
  - Cleaned 5 orphan `employer_profiles`
  - Cleaned 77 orphan `institution_profiles` (test/seed data)
  - Cleaned 1 orphan `workpassport_profile`
  - Cleaned 43 orphan `workforce_profiles` (including 30 with null workforce_id)
  - Cleaned 52 orphan `attendance_records`
  - Cleaned 13 orphan `timesheets`
  - Cleaned 17 orphan `notifications`
  - Cleaned 22 orphan `eula_acceptances`
  - Plus 9 more orphans from one user (wkr_78b3bac9cc7d)
  - **Total cleaned: 241 orphaned records**
- **Backend route updates**: `occupations.py`, `shift_ratings.py`, `workpassport.py`, `workforce.py` — all updated with `$or` queries for backward compatibility
- **TESTED**: Iterations 28 (backend 100%), 29 (full 100%)

### Multi-Language Translation System (Feb 2026)
- 7 languages: English, French, Spanish, Portuguese, Chinese, Arabic, Hindi
- All 195+ pages, 4 headers, 4 sidebars translated
- **TESTED**: Iteration 27 — 100% pass

### Sidebar Navigation Persistence (Dec 2025)
- Layout wrappers for Workforce, Employer, Institution dashboards
- **TESTED**: Iterations 25, 26 — 100% pass

### Leaderboard Feature
- Built but temporarily hidden (no institutions onboarded yet)

## Database Integrity Status (Post All Migrations)
- `occupation_profiles`: 3 valid records, 0 orphans
- `shift_ratings`: 41 records, all linked
- `employment_relationships`: 11 valid, 0 broken
- `blockchain_credentials`: 16, all with workforce_id
- `workforce_profiles`: 72 valid, 0 orphans
- `employer_profiles`: 35 valid, 0 orphans
- `institution_profiles`: 23 valid, 0 orphans
- `workpassport_profiles`: 17 valid, 0 orphans
- `attendance_records`: 121, 0 orphans
- `timesheets`: 22, 0 orphans
- `notifications`: 123, 0 orphans
- **Health Status: HEALTHY (0 total issues)**

## Prioritized Backlog

### P0 (Critical)
- None

### P1 (High)
- Standardize backend Pydantic models for occupation.py, workforce.py (schema enforcement)
- Partner institution logos hotlinking fix (user verification pending)

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
| 29 | Data health dashboard (full) | 100% (11/11 backend + all frontend) |

---
*Last Updated: February 2026*
