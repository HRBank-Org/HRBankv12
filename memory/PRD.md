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
- **Deployment**: Docker (two containers in one service), AWS Lightsail Container Service
- **Database**: MongoDB Atlas (`hrbank_db`)
- **Docker Images**: `qaisijoe/hrbank-frontend:latest`, `qaisijoe/hrbank-backend:latest`
- **DNS**: `hrbank.ca` → `hrbank-backend.db11xcgyyaxh4.ca-central-1.cs.amazonlightsail.com`

## What's Been Implemented

### SafestWork Institution Onboarding (Apr 2026)
- Scraped safestwork.com for 12 training programs
- Created institution account: `aleblanc@safestwork.com` / `SafestWork2026!`
- Pre-verified, onboarded, with logo and credential templates
- Production setup script: `deploy/setup_safestwork.js`
- Fixed WalletStatusWidget crash (missing `t` translation function)

### Lightsail Container Service Deployment (Apr 2026)
- Migrated from single-container to two-container setup (frontend + backend in one service)
- DNS updated: hrbank.ca → hrbank-backend Container Service
- SSL certificate configured on Container Service
- Old standalone frontend service deleted

### Partner Logo Hotlinking Fix (Apr 2026)
- Downloaded 9 institution logos to `backend/static/logos/`
- Served via `/api/static/logos/` endpoint
- DB URLs updated from external hotlinks to local paths
- Production fix script: `deploy/fix_logos.js`

### WorkPassport Two-Column Print Resume (Feb 2026)
- Dark navy sidebar + white main area, QR code, professional layout
- **TESTED**: Iteration 32 — 100% pass (21/21)

### Previous Work
- Data Health Dashboard + Auto-Repair (Iteration 29-30)
- Pydantic Model Standardization
- Dynamic OAuth Redirect URIs
- Data Integrity Migrations v1 + v2
- Multi-Language Translation System (Iteration 27)
- Sidebar Navigation Persistence (Iterations 25-26)

## Active Institution Accounts
| Institution | Contact | Email | Status |
|------------|---------|-------|--------|
| SafestWork Consulting Inc. | Adrien LeBlanc | aleblanc@safestwork.com | Active, Verified |
| University of Windsor | - | - | Active |
| St. Clair College | - | - | Active |
| + 6 more | - | - | Active |

## Prioritized Backlog

### P1 (High)
- Run `deploy/setup_safestwork.js` on production MongoDB
- Run `deploy/fix_logos.js` on production MongoDB
- Rebuild & push Docker images (logo files + WalletStatusWidget fix)

### P2 (Medium)
- Browser locale-based auto-detect language
- Notification system for cohort end dates
- Re-enable Leaderboard when institutions onboard

### P3 (Low/Future)
- Full deep translation of all pages
- CI/CD pipeline
- Make IssueCredential templates dynamic (pull from DB instead of hardcoded)

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 25-26 | Sidebar persistence | 100% |
| 27 | Translation UI | 100% |
| 28-30 | Data integrity | 100% |
| 31-32 | WorkPassport print | 100% |

---
*Last Updated: April 2026*
