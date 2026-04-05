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

## What's Been Implemented

### WorkPassport Resume Print Redesign (Feb 2026)
- **Dual-mode rendering**: Screen shows dark WorkPassport card, Print shows professional white resume
- **No photo in print** — removed as per user request
- **QR code** in print top-right corner (using `qrcode.react`) — links to digital WorkPassport URL when scanned
- **Professional resume layout**: Serif typography, name at top, occupation subtitle, stats grid, Professional Experience sections with skills + work history, footer with verify URL
- **Screen version preserved**: Dark card with photo, blockchain verification badge, stats, career entries
- **WorkPassport™** trademark renders correctly across both modes
- **CSS `@media print`** toggles visibility between `.screen-passport` and `.print-resume` divs
- **TESTED**: Iteration 31 — 100% pass (11/11 features)

### Auto-Repair Data Health Feature (Feb 2026)
- POST `/api/admin/data-health/repair` — one-click orphan cleanup + rating re-propagation
- **TESTED**: Iteration 30 — 100% pass (18/18)

### Data Health Monitor Dashboard (Feb 2026)
- GET `/api/admin/data-health` — real-time integrity scan
- **TESTED**: Iteration 29 — 100% pass

### Pydantic Model Standardization (Feb 2026)
- Fixed `datetime.utcnow` → `datetime.now(timezone.utc)` across 8 models
- Added `ConfigDict(extra="ignore")` to 4 models

### Deployment Readiness (Feb 2026)
- Fixed `.gitignore` and `.dockerignore` blocking `.env` files
- Fixed LinkedIn OAuth redirect URI hardcoding (now dynamic via `request.base_url`)

### Data Integrity Migration v1 + v2 (Feb 2026)
- 241+ orphaned records cleaned across all profile types
- **TESTED**: Iterations 28, 29

### Multi-Language Translation System (Feb 2026)
- 7 languages, 195+ pages
- **TESTED**: Iteration 27

### Sidebar Navigation Persistence (Dec 2025)
- Layout wrappers for all dashboard types
- **TESTED**: Iterations 25, 26

## Prioritized Backlog

### P1 (High)
- Partner institution logos hotlinking fix (user verification pending)

### P2 (Medium)
- Browser locale-based auto-detect language feature
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation of all pages (form labels, table columns)
- CI/CD pipeline

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 25-26 | Sidebar persistence | 100% |
| 27 | Translation UI | 100% |
| 28 | Data migration v1 | 100% (12/12) |
| 29 | Data health dashboard | 100% (11/11) |
| 30 | Auto-repair feature | 100% (18/18) |
| 31 | WorkPassport print resume | 100% (11/11) |

---
*Last Updated: February 2026*
