# HR Bank - Product Requirements Document

## Original Problem Statement
Full-stack HR compliance and management application with specialized dashboards for Admin, Employer, Workforce, and Institution users. Features WorkPassport credentials, multi-language support, and compliance management.

## Core Architecture
- **Frontend**: React + TailwindCSS + Vite (Port 3000)
- **Backend**: FastAPI + MongoDB Motor Async (Port 8001)
- **Deployment**: Docker (two containers in one Lightsail Container Service)
- **Database**: MongoDB Atlas (`hrbank_db`)
- **Email**: SendGrid integration

## What's Been Implemented

### P0: Notification System (Apr 2026)
- Cohort end-date scheduler (daily background task, emails + in-app notifications)
- Workforce notifications on credential receipt, enrollment, and bulk invite
- Service: `backend/services/cohort_notification_service.py`

### P1: Browser Locale Auto-Detect Language (Apr 2026)
- 19 frontend languages (expanded from 7), browser auto-detect, backend profile sync

### UX Improvements (Apr 2026)
1. **Empty Dashboard "Getting Started" Checklist** — 4-step guided onboarding when stats are zero
2. **Share Profile Hero Card** — Dark gradient hero with LinkedIn/WhatsApp/Email quick-share buttons
3. **Dynamic OG Meta Tags** — react-helmet-async for social sharing previews + backend fallback endpoint
4. **Richer Credential Cards** — Public WorkPassport shows credential type, issue date, expiry status
5. **Notification Bell Dropdown** — Inline popover replaces full-page redirect
6. **Progressive Disclosure Sidebar** — Employment-dependent sidebar:
   - **Mode 1 (Building)**: Dashboard, Credentials, Profiles, WorkPassport, Find Jobs, Documents, Settings, Help
   - **Mode 2 (Employed)**: Adds Work & Schedule (Schedule, Performance, Attendance, Routes, Availability) + Earnings (Wallet, Timesheets, Invoices, Time Off)
   - Determined by `GET /api/workforce/me/employment-status` checking `employment_relationships` + `workforce_profiles.employer_id`
   - Non-employed users see a "Employment" teaser box explaining what unlocks when hired

### Previous Session Work
- WorkPassport Two-Column Print Resume
- AWS Lightsail Container Service Deployment
- Partner Logos Fix, SafestWork Setup, Sidebar Fixes, Email Fix

## Key Endpoints Added
- `GET /api/workforce/me/employment-status` — returns `has_active_employment`, `employer_id`, `position_title`
- `PUT /api/users/preferred-language` — saves browser locale to profile
- `POST /api/admin/trigger-cohort-notifications` — manual cohort check
- `GET /api/og/passport/{share_token}` — OG tags for social crawlers

## Prioritized Backlog
- **P2**: Rebuild Docker images v29 with all fixes, deploy to Lightsail
- **P2**: WorkPassport/Workforce account type unification (deeper merge beyond sidebar)
- **P2**: Re-enable Leaderboard when institutions onboard
- **P3**: Full deep translation of form labels
- **P3**: CI/CD pipeline

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 35 | Progressive Disclosure Sidebar | 100% backend + frontend |
| 34 | UX Improvements (6 fixes) | 100% |
| 33 | P0 Notifications + P1 Language | 100% |
| 32 | WorkPassport print | 100% |

## Test Credentials
- Institution: `aleblanc@safestwork.com` / `SafestWork2026!`
- Employed workforce: `emily.chen@email.com` / `Test123!`
- Non-employed workforce: `test.noemp@example.com` / `Test123!`

---
*Last Updated: April 2026*
