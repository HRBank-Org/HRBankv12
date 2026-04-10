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

### P1: Browser Locale Auto-Detect Language (Apr 2026)
- 19 frontend languages, browser auto-detect, backend profile sync

### UX Improvements (Apr 2026)
1. **Empty Dashboard → Getting Started Checklist** — 4-step guided onboarding
2. **Share Profile Hero Card** — LinkedIn/WhatsApp/Email quick-share
3. **Dynamic OG Meta Tags** — Social sharing previews
4. **Richer Credential Cards** — Type, issue date, expiry status
5. **Notification Bell Dropdown** — Inline popover
6. **Progressive Disclosure Sidebar** — Employment-dependent sections
7. **"Today" Dashboard (A-to-Z Inspired)** — Employment-aware:
   - **Employed**: 4 Quick Action buttons (Clock In, Time Off, Schedule, Find Shifts), Next Shift card with countdown, This Week earnings, Rating card, job title + date subtitle
   - **Non-employed**: Career stat cards (Occupations, Credentials, Job Offers) + Getting Started checklist
   - Charts/flat-line data removed from default view

## Key Endpoints
- `GET /api/workforce/me/employment-status`
- `PUT /api/users/preferred-language`
- `POST /api/admin/trigger-cohort-notifications`
- `GET /api/og/passport/{share_token}`

## Prioritized Backlog
- **P2**: Rebuild Docker images v29, deploy to Lightsail
- **P2**: WorkPassport/Workforce account type deeper unification
- **P2**: Re-enable Leaderboard when institutions onboard
- **P3**: Full deep translation, CI/CD pipeline
- **Future**: Shift swap marketplace, PWA push notifications

## Testing History
| Iter | Scope | Result |
|------|-------|--------|
| 36 | Today Dashboard (A-to-Z) | 100% frontend |
| 35 | Progressive Disclosure Sidebar | 100% |
| 34 | UX Improvements (6 fixes) | 100% |
| 33 | Notifications + Language | 100% |
| 32 | WorkPassport print | 100% |

## Test Credentials
- Institution: `aleblanc@safestwork.com` / `SafestWork2026!`
- Employed workforce: `emily.chen@email.com` / `Test123!`
- Non-employed workforce: `test.noemp@example.com` / `Test123!`

---
*Last Updated: April 2026*
