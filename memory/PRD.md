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

### WorkPassport Two-Column Print Resume (Feb 2026)
- **Two-column layout**: Dark navy sidebar (~30%) + white main area (~70%)
- **Sidebar**: Name, occupation titles, Overview stats (occupations, years, hours, rating), aggregated Skills, Certifications, QR code at bottom
- **Main area**: Contact bar (location, member since, ID), Professional Experience with employment bullets + skill tags, Verified Credentials, Footer with verify URL
- **CSS `@media print`** toggles between `.screen-passport` (screen) and `.print-resume` (print)
- **`-webkit-print-color-adjust: exact`** ensures navy sidebar background prints
- **TESTED**: Iteration 32 — 100% pass (21/21 features)

### WorkPassport QR Code (Feb 2026)
- QR code using `qrcode.react` links to digital WorkPassport URL
- Positioned in sidebar bottom on print, top-right on older layout

### Auto-Repair Data Health Feature (Feb 2026)
- POST `/api/admin/data-health/repair` — one-click orphan cleanup
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
- Frontend Dockerfile updated: `node:18-alpine` → `node:20-alpine`

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
- Partner institution logos hotlinking fix (production DB — user needs to run mongosh script)

### P2 (Medium)
- Browser locale-based auto-detect language feature
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation of all pages (form labels, table columns)
- CI/CD pipeline

## Deployment Notes
- Frontend Docker image: `node:20-alpine` (required for react-router-dom@7.9.6)
- Backend Docker image: `python:3.11-slim`
- Blockchain dependencies (web3, eth-account, etc.) are core features — required for production
- Health check: `/api/health` returns `{"status": "healthy"}`
- No hardcoded secrets in source — all via .env

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 25-26 | Sidebar persistence | 100% |
| 27 | Translation UI | 100% |
| 28 | Data migration v1 | 100% (12/12) |
| 29 | Data health dashboard | 100% (11/11) |
| 30 | Auto-repair feature | 100% (18/18) |
| 31 | WorkPassport print resume (v1) | 100% (11/11) |
| 32 | WorkPassport two-column print resume (v2) | 100% (21/21) |

---
*Last Updated: February 2026*
