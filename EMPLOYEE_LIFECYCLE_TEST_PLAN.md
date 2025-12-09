# Employee Lifecycle & Job Matching - Comprehensive Test Plan

## Test Environment
- **Employer Account**: employer@hrbank.ca / password123
- **Worker Account**: TBD (will create/use existing)
- **Platform**: LaborDeck (labordeck.preview.emergentagent.com)

---

## Phase 1: EMPLOYER SIDE - Job Posting & Hiring

### 1.1 Job Posting
- [ ] Navigate to Jobs/Hiring section
- [ ] Create new job posting with:
  - Workplace selection
  - Position (use occupation template)
  - Pay rate
  - Required skills & certifications
  - Job description
- [ ] Verify job appears in "Active Jobs" list
- [ ] Verify job is visible to workers

### 1.2 Review Applications
- [ ] Check "Candidates" tab for applicants
- [ ] Review worker profiles
- [ ] Filter/sort candidates
- [ ] Shortlist candidates

### 1.3 Interview Scheduling
- [ ] Select candidate for interview
- [ ] Schedule interview (date, time, location/virtual)
- [ ] Send interview invitation
- [ ] Verify notification sent to worker

### 1.4 Hiring Process
- [ ] Send job offer/invitation to selected worker
- [ ] Assign role with pay rate
- [ ] Set workplace access
- [ ] Verify worker receives invitation

### 1.5 Shift Assignment
- [ ] Create shifts for hired workers
- [ ] Assign specific workers to shifts
- [ ] Send shift notifications
- [ ] Verify shifts appear on schedule

### 1.6 Communication
- [ ] Send message to hired worker
- [ ] Verify real-time chat works
- [ ] Send shift updates via notifications

### 1.7 Worker Management
- [ ] View worker in "Workforce" tab
- [ ] Check worker details modal
- [ ] View worker's shift history
- [ ] View worker ratings
- [ ] Monitor 14-day rule indicator

---

## Phase 2: WORKFORCE SIDE - Job Discovery & Application

### 2.1 Job Discovery
- [ ] Login as worker
- [ ] Navigate to Jobs/Browse section
- [ ] Search for available jobs
- [ ] Filter by:
  - Location/distance
  - Pay rate
  - Position type
  - Schedule
- [ ] View job details

### 2.2 Job Application
- [ ] Click "Apply" on job posting
- [ ] Submit application
- [ ] Verify application confirmation
- [ ] Check application status

### 2.3 Interview Process
- [ ] Receive interview invitation notification
- [ ] View interview details
- [ ] Accept/schedule interview
- [ ] Confirm interview time
- [ ] Add to calendar

### 2.4 Job Offer & Onboarding
- [ ] Receive job offer notification
- [ ] Review offer details (role, pay rate, workplace)
- [ ] Accept job offer
- [ ] Complete onboarding if needed
- [ ] Profile completion prompts (7-day reminder)

### 2.5 Shift Management
- [ ] View assigned shifts on schedule
- [ ] Accept/decline shift invitations
- [ ] Set availability (if feature exists)
- [ ] Check shift details

### 2.6 Communication
- [ ] Receive messages from employer
- [ ] Reply to employer messages
- [ ] Chat with co-workers (if feature exists)
- [ ] View notifications

### 2.7 Work & Ratings
- [ ] Clock in to shift (geofence)
- [ ] Complete shift
- [ ] Clock out (automatic geofence)
- [ ] Receive rating from employer
- [ ] Rate employer/shift

---

## Phase 3: INTEGRATION TESTS

### 3.1 Job Matching Algorithm
- [ ] Worker applies to job
- [ ] Verify worker appears in employer's candidates list
- [ ] Check matching score/ranking
- [ ] Verify skills/certifications matching

### 3.2 Notification System
- [ ] Employer posts job → Worker gets notification
- [ ] Worker applies → Employer gets notification
- [ ] Interview scheduled → Both get notifications
- [ ] Job offer sent → Worker gets notification
- [ ] Shift assigned → Worker gets notification

### 3.3 Invitation System
- [ ] Single email invitation
- [ ] Single phone invitation
- [ ] Bulk CSV upload
- [ ] Invitation acceptance flow
- [ ] Role-based invitation (with pre-set pay rate)

### 3.4 Chat System
- [ ] Employer-to-worker messaging
- [ ] Worker-to-worker messaging (co-workers)
- [ ] Message threading
- [ ] Unread indicators
- [ ] Real-time updates

### 3.5 Worker Lifecycle Rules
- [ ] 7-day profile completion reminder
- [ ] 14-day shift rule (return to general pool)
- [ ] Days since last shift indicator
- [ ] Worker availability status

---

## Phase 4: EDGE CASES & ERROR HANDLING

### 4.1 Application Edge Cases
- [ ] Worker applies to multiple jobs
- [ ] Worker withdraws application
- [ ] Employer closes job posting
- [ ] Job posting expires

### 4.2 Interview Edge Cases
- [ ] Interview cancellation
- [ ] Interview rescheduling
- [ ] No-show handling
- [ ] Interview notes/feedback

### 4.3 Hiring Edge Cases
- [ ] Worker declines job offer
- [ ] Worker doesn't respond (timeout)
- [ ] Multiple offers to same worker
- [ ] Worker already hired elsewhere

### 4.4 Shift Edge Cases
- [ ] Worker doesn't show up
- [ ] Late clock-in
- [ ] Early clock-out
- [ ] Shift swap requests
- [ ] Emergency cancellations

---

## Testing Checklist

### Backend APIs to Verify
- [ ] POST /api/jobs - Create job posting
- [ ] GET /api/jobs - List jobs (employer view)
- [ ] GET /api/jobs/browse - Browse jobs (worker view)
- [ ] POST /api/jobs/{id}/apply - Apply to job
- [ ] GET /api/jobs/{id}/candidates - View applicants
- [ ] POST /api/jobs/{id}/schedule-interview - Schedule interview
- [ ] POST /api/employer-invitations/send - Send invitation
- [ ] POST /api/employer-invitations/accept - Accept invitation
- [ ] GET /api/employer/workforce - View hired workers
- [ ] POST /api/shifts/create - Create shift
- [ ] POST /api/shifts/assign - Assign worker to shift

### Frontend Pages to Test
- [ ] /employer/jobs - Job posting & management
- [ ] /workforce/jobs or /workforce/browse - Job discovery
- [ ] /employer/dashboard - Workforce tab (hired workers)
- [ ] /workforce/dashboard - Shifts & schedule
- [ ] /employer/messages & /workforce/messages - Chat
- [ ] /employer/notifications & /workforce/notifications

---

## Success Criteria

✅ **Complete Flow Working:**
1. Employer posts job → Worker finds and applies
2. Employer reviews → Schedules interview
3. Employer sends offer → Worker accepts
4. Employer assigns shift → Worker receives notification
5. Worker completes shift → Both can rate each other
6. Chat works both ways
7. 14-day rule triggers correctly

✅ **Data Integrity:**
- All statuses update correctly
- Notifications sent/received
- Database reflects current state
- No orphaned records

✅ **User Experience:**
- Smooth, intuitive flow
- Clear feedback at each step
- No broken links/buttons
- Mobile responsive

---

## Current Status
- ✅ Notifications & Messages UI - Complete
- ✅ Occupation Templates - Complete
- ✅ Weekly Timesheets - Complete
- ⏳ Job Matching - To Test
- ⏳ Interview Scheduling - To Test
- ⏳ Worker Lifecycle - To Test
- ⏳ Invitation System - To Test

## Next Steps
1. Test employer job posting flow
2. Create/login as worker and test job discovery
3. Test interview scheduling
4. Test invitation acceptance
5. Test shift assignment and completion
6. Verify chat between employer-worker and worker-worker
