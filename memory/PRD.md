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
- **Deployment**: Docker (two-container), AWS Lightsail Container Service + Load Balancer
- **Database**: MongoDB (`hrbank_db`)
- **Docker Images**: `qnizami/hrbank-frontend:latest`, `qnizami/hrbank-backend:latest`

## What's Been Implemented

### Deployment — Two-Container Lightsail Setup (Feb 2026)
- Separate frontend (nginx + React) and backend (FastAPI) Docker images
- Frontend nginx proxies `/api/` to `localhost:8001` (Lightsail shared network)
- Root `Dockerfile` updated: `node:20-slim`, added `--extra-index-url` for emergentintegrations
- Frontend `Dockerfile`: `node:20-alpine`
- Deployment guide: `deploy/LIGHTSAIL_DEPLOYMENT.md`
- `docker-compose.prod.yml` for local testing with `network_mode: host`

### WorkPassport Two-Column Print Resume (Feb 2026)
- **Two-column layout**: Dark navy sidebar (~30%) + white main area (~70%)
- **Sidebar**: Name, occupation titles, Overview stats, aggregated Skills, Certifications, QR code
- **Main area**: Contact bar, Professional Experience with bullets + skill tags, Credentials, Footer
- **Print/Export button**: `window.print()` triggers browser print dialog (Save as PDF)
- **TESTED**: Iteration 32 — 100% pass (21/21 features)

### Auto-Repair Data Health Feature (Feb 2026)
- POST `/api/admin/data-health/repair` — one-click orphan cleanup
- **TESTED**: Iteration 30 — 100% pass (18/18)

### Data Health Monitor Dashboard (Feb 2026)
- GET `/api/admin/data-health` — real-time integrity scan
- **TESTED**: Iteration 29 — 100% pass

### Pydantic Model Standardization (Feb 2026)
- Fixed `datetime.utcnow` → `datetime.now(timezone.utc)` across 8 models

### Dynamic OAuth Redirect URIs (Feb 2026)
- Google & LinkedIn OAuth redirect URIs derived from `request.base_url`

### Data Integrity Migration v1 + v2 (Feb 2026)
- 241+ orphaned records cleaned across all profile types

### Multi-Language Translation System (Feb 2026)
- 7 languages, 195+ pages — **TESTED**: Iteration 27

### Sidebar Navigation Persistence (Dec 2025)
- Layout wrappers for all dashboard types — **TESTED**: Iterations 25, 26

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

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 25-26 | Sidebar persistence | 100% |
| 27 | Translation UI | 100% |
| 28 | Data migration v1 | 100% (12/12) |
| 29 | Data health dashboard | 100% (11/11) |
| 30 | Auto-repair feature | 100% (18/18) |
| 31 | WorkPassport print resume (v1) | 100% (11/11) |
| 32 | WorkPassport two-column print (v2) | 100% (21/21) |

---
*Last Updated: February 2026*
