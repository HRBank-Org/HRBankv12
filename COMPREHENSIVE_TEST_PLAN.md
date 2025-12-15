# 🎯 COMPREHENSIVE BUILD & TEST PLAN
**Bella Basile's Loose Goose - End-to-End Workflow Testing**

---

## 📍 TEST ENVIRONMENT SETUP

### Location Update
- **Change:** Lakeshore location → Your home address
- **New Address:** 1597 Whitewood Drive, Belle River, ON N8L 1E2
- **Purpose:** Physical geofencing test on Thursday

### Test Accounts Strategy
1. **Real Accounts (3):** Sudais, Laraib, Najeeba - Test invitation flow
2. **Test Accounts (9):** Existing workers - Test external hiring, job matching
3. **Employer:** Bella Basile's Loose Goose (employer@hrbank.ca)

---

## 🔄 WORKFLOW SEQUENCE: Hiring → Termination

### Complete Workflow Path:
```
1. RECRUITMENT
   ↓
2. SHIFT CREATION & ASSIGNMENT
   ↓
3. ATTENDANCE (Clock In/Out)
   ↓
4. TIMESHEET APPROVAL
   ↓
5. PERFORMANCE RATING
   ↓
6. PAYROLL
   ↓
7. TERMINATION
```

---

## 📋 PHASE-BY-PHASE BUILD & TEST PLAN

---

## **PHASE 1: RECRUITMENT & HIRING** 🎯

### Dependency: NONE (Starting point)
### Duration: Day 1-2

### 🏗️ Components to Build/Update:

#### **Employer Side:**
- [ ] **Workplace Management**
  - ✅ View workplaces (exists)
  - ✅ Create workplace (exists)
  - ⚠️ Update: Change Lakeshore address to Belle River
  - [ ] Edit workplace details
  - [ ] View workplace QR code (for clock-in)

- [ ] **Role Management** 
  - ✅ View roles (exists)
  - ✅ Create roles with wage validation (exists)
  - [ ] Edit role details
  - [ ] Deactivate/Archive roles
  - [ ] View open positions count

- [ ] **Worker Invitation Flow (CRITICAL - NEW)**
  - [ ] Bulk invite modal (from Roles page)
  - [ ] Individual invite (from role detail)
  - [ ] Email invitation template
  - [ ] SMS invitation (Twilio integration)
  - [ ] Track invitation status (sent/accepted/rejected)
  - [ ] Resend invitation

- [ ] **Job Posting (External Hiring)**
  - [ ] Create job posting from role
  - [ ] View applicants
  - [ ] Review worker profiles
  - [ ] Send offers
  - [ ] Accept/Reject applications

#### **Workforce Side:**
- [ ] **Invitation Acceptance**
  - [ ] Email/SMS link → signup flow
  - [ ] Auto-fill employer/role info
  - [ ] Accept/Reject invitation
  - [ ] Onboarding after acceptance

- [ ] **Job Search & Application**
  - ✅ Find Jobs page (exists)
  - [ ] Proximity-based job matching
  - [ ] Filter by role, distance, pay
  - [ ] Apply to jobs
  - [ ] Track application status
  - [ ] View job offers

- [ ] **Occupation Profiles (for matching)**
  - ✅ Create occupation profile (exists)
  - [ ] Ensure all 9 test workers have profiles
  - [ ] Certifications upload
  - [ ] Experience details

### ✅ Testing Criteria:
- [ ] **Invitation Flow:**
  - Send invites to 3 real family members
  - Receive email/SMS
  - Accept invitation
  - Complete onboarding
  - Verify in employer dashboard

- [ ] **External Hiring:**
  - Create job posting
  - 9 test workers see it in "Find Jobs"
  - Workers apply
  - Employer reviews applications
  - Employer sends offers
  - Workers accept offers

- [ ] **Job Matching:**
  - Workers with "Server" preference see server jobs
  - Distance filtering works
  - Pay rate filtering works

### 📊 Success Metrics:
- 3 real workers successfully onboarded via invitation
- 3-5 test workers hired via external application
- Job matching shows relevant positions only

---

## **PHASE 2: SHIFT CREATION & ASSIGNMENT** 📅

### Dependency: Workers must be hired (Phase 1)
### Duration: Day 3-4

### 🏗️ Components to Build/Update:

#### **Employer Side:**
- [ ] **Shift Creation (Manual Test - Thursday)**
  - ✅ Calendar view (exists)
  - [ ] Create shift modal with:
    - Date/time picker
    - Location selection
    - Role selection
    - Worker assignment (dropdown of hired workers)
    - Tasks for shift
    - Break times
  - [ ] Recurring shift options
  - [ ] Shift templates

- [ ] **Shift Management**
  - [ ] Edit shift details
  - [ ] Cancel shift (notify workers)
  - [ ] Update shift (notify workers)
  - [ ] View shift roster
  - [ ] Assign/unassign workers
  - [ ] View worker availability

- [ ] **Worker Roster View**
  - [ ] Weekly/Monthly calendar
  - [ ] Filter by location
  - [ ] Filter by role
  - [ ] Export roster

#### **Workforce Side:**
- [ ] **My Shifts Page (UPDATE EXISTING)**
  - ✅ Basic structure exists
  - [ ] Add WorkforceSidebar + WorkforceHeader
  - [ ] Calendar view (day/week/month toggle)
  - [ ] Show shifts from ALL employers
  - [ ] Upcoming shifts list
  - [ ] Past shifts list
  - [ ] Shift details modal

- [ ] **Shift Notifications**
  - [ ] New shift assigned
  - [ ] Shift updated/changed
  - [ ] Shift cancelled
  - [ ] Reminder before shift starts

- [ ] **Availability Management (UPDATE EXISTING)**
  - ✅ Basic page exists
  - [ ] Add WorkforceSidebar + WorkforceHeader
  - [ ] Set recurring availability
  - [ ] Block specific dates
  - [ ] Request time off
  - [ ] View availability calendar

### ✅ Testing Criteria:
- [ ] **Shift Creation:**
  - You manually create Thursday shift
  - Location: Belle River address
  - Time: [Your preferred time]
  - Assign 1-2 workers
  - Workers receive notification

- [ ] **Multi-Employer Shifts:**
  - Create shifts at different locations
  - Workers see all shifts in calendar
  - Filter by employer works

- [ ] **Shift Updates:**
  - Edit shift time
  - Workers notified of change
  - Cancel shift
  - Workers notified

- [ ] **Availability:**
  - Worker sets availability
  - Employer sees it when assigning shifts
  - Conflict warning if shift outside availability

### 📊 Success Metrics:
- Thursday geofencing test shift created successfully
- Workers see their shifts in My Shifts page
- Notifications delivered for shift changes
- Availability properly displayed to employer

---

## **PHASE 3: ATTENDANCE & GEOFENCING** 🕐

### Dependency: Shifts must be created and assigned (Phase 2)
### Duration: Day 5-6 + Physical Test on Thursday

### 🏗️ Components to Build/Update:

#### **Employer Side:**
- [ ] **Attendance Monitoring**
  - [ ] Live shift status dashboard
  - [ ] Who's clocked in/out
  - [ ] Late arrivals alert
  - [ ] No-shows tracking
  - [ ] Approve/reject clock-ins
  - [ ] Override clock times
  - [ ] View attendance history

- [ ] **QR Code Management**
  - [ ] Generate workplace QR code
  - [ ] Display QR code in dashboard
  - [ ] Print QR code
  - [ ] Regenerate QR code

#### **Workforce Side:**
- [ ] **Clock In/Out (UPDATE EXISTING)**
  - ✅ Basic page exists
  - [ ] Add WorkforceSidebar + WorkforceHeader
  - [ ] **Geofencing validation:**
    - Check GPS coordinates
    - Verify within 100m of workplace
    - Show distance to workplace
    - Error if too far
  - [ ] QR code scanner option
  - [ ] Selfie photo capture (optional)
  - [ ] Clock-in confirmation modal
  - [ ] Break tracking
  - [ ] Clock-out with hours summary

- [ ] **Today's Shift Widget**
  - [ ] Show active shift on dashboard
  - [ ] Quick clock-in button
  - [ ] Time remaining in shift
  - [ ] Location map

- [ ] **Attendance Page (NEW - Already Created)**
  - ✅ Page structure exists
  - [ ] Connect to real data
  - [ ] Show clock-in/out history
  - [ ] Calculate total hours
  - [ ] Daily/weekly/monthly views

### ✅ Testing Criteria:
- [ ] **Geofencing (PHYSICAL TEST - Thursday):**
  - You go to 1597 Whitewood Drive
  - Login as worker on mobile
  - Attempt clock-in
  - ✅ System verifies GPS within 100m
  - Clock-in succeeds
  - At shift end time, clock out
  - System calculates hours

- [ ] **QR Code Alternative:**
  - Employer generates QR code
  - Worker scans QR code
  - Clock-in without geofencing
  - (Use if geofencing fails)

- [ ] **Edge Cases:**
  - Try clock-in from wrong location (should fail)
  - Try clock-in before shift start (should warn)
  - Try clock-out without clock-in (should prevent)
  - Try clock-in for unassigned shift (should prevent)

### 📊 Success Metrics:
- Physical geofencing test passes on Thursday
- GPS coordinates validated correctly
- Clock-in/out times recorded accurately
- Employer can see live attendance status
- Hours calculated correctly

---

## **PHASE 4: TASKS & PERFORMANCE** ✅

### Dependency: Worker must be clocked in (Phase 3)
### Duration: Day 7-8

### 🏗️ Components to Build/Update:

#### **Employer Side:**
- [ ] **Task Management**
  - [ ] Create tasks for shifts
  - [ ] Assign tasks to workers
  - [ ] Task templates by role
  - [ ] View task completion
  - [ ] Task checklist in shift detail

- [ ] **Performance Rating**
  - [ ] Rate worker after shift
  - [ ] Star rating system (1-5)
  - [ ] Written feedback
  - [ ] Badge awards
  - [ ] View worker's overall rating
  - [ ] Performance history

#### **Workforce Side:**
- [ ] **Tasks Page (NEW - Already Created)**
  - ✅ Page structure exists
  - [ ] Connect to real shift tasks
  - [ ] Today's tasks list
  - [ ] Task completion checkboxes
  - [ ] Photo evidence upload
  - [ ] Date navigation (prev/next day)

- [ ] **Performance Page (NEW - Already Created)**
  - ✅ Page structure exists
  - [ ] View ratings from employers
  - [ ] View feedback comments
  - [ ] View earned badges
  - [ ] Rating history/trends
  - [ ] Rate employer after shift

### ✅ Testing Criteria:
- [ ] **Task Flow:**
  - Employer creates shift with tasks
  - Worker sees tasks during shift
  - Worker completes tasks
  - Employer sees completion status

- [ ] **Rating Flow:**
  - After shift ends, employer rates worker
  - Worker receives rating notification
  - Worker can rate employer
  - Ratings displayed on both profiles
  - Average rating updates

### 📊 Success Metrics:
- Tasks assigned and completed
- Mutual rating system works
- Badges awarded based on ratings
- Performance trends visible

---

## **PHASE 5: TIMESHEETS & PAYROLL** 💰

### Dependency: Shifts completed with clock-in/out (Phase 3)
### Duration: Day 9-10

### 🏗️ Components to Build/Update:

#### **Employer Side:**
- [ ] **Timesheet Review**
  - [ ] Weekly timesheet submission
  - [ ] Review worker hours
  - [ ] Edit hours (with reason)
  - [ ] Approve timesheets
  - [ ] Reject with comment
  - [ ] Bulk approve
  - [ ] Export for payroll

- [ ] **Payroll Management**
  - [ ] View total payroll costs
  - [ ] Breakdown by worker
  - [ ] Breakdown by location
  - [ ] Platform fee calculation
  - [ ] Pay period summary
  - [ ] Export payroll report

#### **Workforce Side:**
- [ ] **Wallet Page (NEW - Already Created)**
  - ✅ Page structure exists
  - [ ] Connect to real earnings data
  - [ ] Current pay period hours
  - [ ] Current period earnings
  - [ ] Expected weekly income
  - [ ] Breakdown by employer
  - [ ] Payment history

- [ ] **Timesheets Page (UPDATE EXISTING)**
  - ✅ Basic page exists
  - [ ] Add WorkforceSidebar + WorkforceHeader
  - [ ] List all timesheets
  - [ ] Status indicators (pending/approved/paid)
  - [ ] View timesheet details
  - [ ] Dispute timesheet
  - [ ] Download timesheet PDF

### ✅ Testing Criteria:
- [ ] **Timesheet Flow:**
  - After week ends, timesheets auto-generated
  - Workers see pending timesheets
  - Employer reviews and approves
  - Workers see approved status
  - Hours and pay calculated correctly

- [ ] **Wallet:**
  - Real-time earnings tracking
  - Multiple employers shown separately
  - Expected income accurate
  - Platform fees calculated correctly

### 📊 Success Metrics:
- Timesheets generated from actual shifts
- Approval workflow functions
- Earnings calculated correctly
- Platform fees properly applied
- Multi-employer earnings separated

---

## **PHASE 6: TERMINATION & OFFBOARDING** 👋

### Dependency: Worker must be hired (Phase 1+)
### Duration: Day 11

### 🏗️ Components to Build/Update:

#### **Employer Side:**
- [ ] **Worker Management**
  - [ ] View all hired workers
  - [ ] Worker profile details
  - [ ] Employment history
  - [ ] Performance summary
  - [ ] Terminate worker
  - [ ] Termination reason
  - [ ] Final payment calculation
  - [ ] Re-hire option

#### **Workforce Side:**
- [ ] **Employment Status**
  - [ ] Active employers list
  - [ ] Employment history
  - [ ] Terminated status indicator
  - [ ] Final payment notification
  - [ ] Re-application option

### ✅ Testing Criteria:
- [ ] **Termination Flow:**
  - Employer terminates worker
  - Worker receives notification
  - Worker loses access to future shifts
  - Past data preserved
  - Final payment calculated
  - Worker can reapply

### 📊 Success Metrics:
- Clean termination process
- Data preserved for records
- Final payments accurate
- Re-hire option available

---

## 📅 EXECUTION TIMELINE

### **Week 1:**
- **Day 1-2:** Phase 1 (Recruitment) - Build invitation flow
- **Day 3-4:** Phase 2 (Shifts) - Update shift management UI
- **Day 5:** Phase 3 Part 1 - Build geofencing logic
- **Thursday:** **PHYSICAL TEST** - Geofencing validation
- **Day 6:** Phase 3 Part 2 - Fix any geofencing issues

### **Week 2:**
- **Day 7-8:** Phase 4 (Tasks & Performance)
- **Day 9-10:** Phase 5 (Timesheets & Payroll)
- **Day 11:** Phase 6 (Termination)
- **Day 12-13:** End-to-end regression testing
- **Day 14:** Buffer for fixes

---

## 🎯 PRIORITY ORDER

### **CRITICAL PATH (Must Have for Basic Workflow):**
1. ✅ Worker invitation flow (can't hire without this)
2. ✅ Shift creation with assignment
3. ✅ Clock-in/out with geofencing
4. ✅ Timesheet approval
5. ✅ Basic payroll calculation

### **IMPORTANT (Needed for Complete Experience):**
6. Job matching and external hiring
7. Task management
8. Performance ratings
9. Shift updates/cancellations
10. Availability management

### **NICE TO HAVE (Can be deferred):**
11. Shift templates
12. Recurring shifts
13. Break tracking
14. Photo evidence for tasks
15. Advanced analytics

---

## 🧪 TEST DATA PREPARATION

### **Before Thursday:**
1. [ ] Update Lakeshore workplace address to Belle River
2. [ ] Ensure all 9 test workers have occupation profiles
3. [ ] Set realistic availability for test workers
4. [ ] Add certifications to test worker profiles
5. [ ] You create Thursday shift manually (for geofencing test)

### **For Thursday Test:**
- [ ] Shift created at Belle River location
- [ ] Shift assigned to you (login as worker)
- [ ] GPS coordinates: 42.2886° N, 82.7291° W (approx)
- [ ] Geofence: 100m radius
- [ ] Test window: Shift start time ± 15 minutes

---

## 📊 TRACKING PROGRESS

### **Definition of Done for Each Phase:**
- [ ] All employer-side components built
- [ ] All workforce-side components built
- [ ] Testing criteria passed
- [ ] No critical bugs
- [ ] User can complete workflow end-to-end

### **Blockers to Watch:**
- Email/SMS delivery (for real invitations)
- GPS accuracy (for geofencing)
- Mobile browser compatibility
- Real-time notifications
- Multi-employer data separation

---

## 🚀 IMMEDIATE NEXT STEPS

### **Right Now:**
1. Update Lakeshore workplace to Belle River address
2. Verify 9 test worker profiles are complete
3. Create occupation profiles for test workers
4. Wait for family member details (for real invitations)

### **Then:**
5. Build worker invitation flow (Phase 1 - Priority 1)
6. Build job application flow (Phase 1 - Priority 2)
7. Update shift creation UI (Phase 2)
8. Build geofencing logic (Phase 3)
9. Prepare for Thursday physical test

---

**This plan ensures we build components in dependency order and test them in real workflow sequence!**
