# 🎯 Employer Recruitment Workflow - Testing Guide

## Overview
The recruitment workflow has two tiers:
1. **Internal Matching**: Show existing employees from employer's roster
2. **External Matching**: Show platform-wide candidates via matching engine

---

## 📋 Pre-Testing Setup Verification

### ✅ Data Verification (Backend)
Run these checks before testing:

```bash
# 1. Verify 20 test workforce profiles exist
curl -X GET "http://localhost:8001/api/workforce/list" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Total workforce profiles: {len(data.get('data', {}).get('workers', []))}\")"

# 2. Verify occupation templates are loaded
curl -X GET "http://localhost:8001/api/occupation-templates/list" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Total templates: {len(data.get('data', {}).get('templates', []))}\")"

# 3. Verify provincial minimum wages are initialized
curl -X GET "http://localhost:8001/api/admin/minimum-wages/list" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Provinces configured: {data.get('data', {}).get('total', 0)}\")"

# 4. Check employer has workplaces configured
# (Login as employer first, then check dashboard)
```

---

## 🧪 Test Scenario 1: Create Shift with Occupation Template

### Test Steps:
1. **Login as Employer**
   - Navigate to `/employer/dashboard`
   - Click on "Schedule" tab or "Calendar" view

2. **Open Create Shift Modal**
   - Click "Create New Shift" button
   - OR: Click on a date in the calendar view

3. **Select Occupation Template**
   - **Test Point 1**: Dropdown should show all available occupation templates (Bartender, Server, Chef, etc.)
   - **Test Point 2**: Selecting a template should auto-populate:
     - Position Title
     - Hourly Rate (based on province + occupation minimum)
     - Required Skills (from template)
     - Required Certifications (from template)

4. **Verify Wage Validation**
   - **Test Point 3**: Try entering an hourly rate BELOW the minimum
     - Should show error: "Hourly rate $X.XX is below the required minimum of $Y.YY"
   - **Test Point 4**: Enter a valid hourly rate (at or above minimum)
     - Should accept and allow submission

5. **Configure Shift Details**
   - Select workplace
   - Set date & time
   - Set positions needed (e.g., 3)
   - Add any additional notes

6. **Submit Shift**
   - **Test Point 5**: Shift should be created successfully
   - **Test Point 6**: Should redirect to calendar or refresh to show new shift

---

## 🧪 Test Scenario 2: Internal Employee Matching (Roster)

### Prerequisites:
- Employer has invited and approved at least 3 workers
- Workers have occupation profiles matching the shift requirements

### Test Steps:
1. **View Created Shift**
   - Click on the shift you created in Scenario 1
   - Shift detail modal/page should open

2. **Check "Assign Workers" or "Find Candidates" Section**
   - **Test Point 7**: Should show a list of "Your Team" or "Assigned Workers" FIRST
   - **Test Point 8**: Workers should be filtered/matched by:
     - ✅ Occupation title matches shift position
     - ✅ Has required certifications
     - ✅ Has required skills
     - ✅ Availability matches shift time

3. **Verify Match Indicators**
   - **Test Point 9**: Each worker card should show:
     - Name & photo
     - Occupation title(s)
     - Match percentage or score
     - Skills matched (e.g., "4/5 skills")
     - Certifications status (e.g., "All required certs ✓")
     - Distance from workplace (if address verified)
     - Behavior rating/stars

4. **Assign Internal Worker**
   - **Test Point 10**: Click "Assign" button on a matched internal worker
   - **Test Point 11**: Worker should be assigned to the shift
   - **Test Point 12**: Shift status should update (e.g., "1/3 positions filled")

---

## 🧪 Test Scenario 3: External Candidate Matching (Platform-Wide)

### Prerequisites:
- Not enough internal workers to fill all positions
- OR: View "Browse More Candidates" option

### Test Steps:
1. **Trigger External Matching**
   - After assigning internal workers, if positions remain:
     - **Test Point 13**: Should show "Find More Candidates" or "Browse Platform" button
   - OR: Click "View All Candidates" to see platform-wide matches

2. **View External Match Results**
   - **Test Point 14**: Should show candidates from the 20 test profiles
   - **Test Point 15**: Candidates should be RANKED by match score (best matches first)

3. **Verify Match Scoring Logic**
   Each candidate card should show breakdown:
   - **Test Point 16**: Distance Score (35% weight)
     - 0-5km = Excellent match
     - 5-10km = Great match
     - 10-15km = Good match
     - 15-20km = Fair match
     - >20km = Poor match (if within max distance)
   
   - **Test Point 17**: Availability Score (35% weight)
     - Employment status: "Available" vs "Currently Employed"
     - Availability hours overlap with shift time
   
   - **Test Point 18**: Certification Match (20% weight)
     - Shows which required certs the candidate has
     - Red flag if missing critical certs (e.g., Smart Serve for Bartender)
   
   - **Test Point 19**: Skills Match (10% weight)
     - Shows "X/Y skills matched"

4. **Filter & Sort Candidates**
   - **Test Point 20**: Filter by:
     - Distance (5km, 10km, 20km, 50km)
     - Availability
     - Minimum rating
     - Specific certifications
   
   - **Test Point 21**: Sort by:
     - Best Match (default)
     - Closest
     - Highest Rated
     - Most Available

5. **View Candidate Profile**
   - **Test Point 22**: Click on a candidate to view full profile
   - Should show:
     - Full work history
     - All certifications (verified status)
     - All skills
     - Availability calendar
     - Ratings & reviews
     - Distance from workplace

6. **Send Interview Invitation or Job Offer**
   - **Test Point 23**: Click "Invite to Interview" or "Make Offer"
   - **Test Point 24**: Should open form to configure:
     - Interview date/time or Shift details
     - Personal message
   - **Test Point 25**: Submit invitation
   - **Test Point 26**: Candidate should receive notification

---

## 🧪 Test Scenario 4: Address Verification & Proximity Matching

### Critical Security Feature Test

### Test Steps:
1. **Check Worker Address Status**
   - Navigate to employer's workforce tab
   - **Test Point 27**: Each worker should show "Address Verified ✓" or "Address Unverified ⚠️"
   - **Test Point 28**: Unverified workers should show "Proximity unavailable until address verified"

2. **Verify Address Lock System**
   - As a worker with unverified address:
     - **Test Point 29**: Try to edit address in profile
     - Should allow changes UNTIL verified
   
   - As admin (Super Admin Panel):
     - **Test Point 30**: Verify a worker's address via `/api/admin/id-verification/verify`
     - Once verified, worker should NOT be able to change address
     - **Test Point 31**: Worker attempting to change locked address should see error

3. **Proximity-Based Matching**
   - **Test Point 32**: Verified workers should show accurate distance in match results
   - **Test Point 33**: Unverified workers should either:
     - Not appear in proximity-based sorting, OR
     - Appear with "Distance unavailable" label

---

## 🧪 Test Scenario 5: Template Inheritance & Standardization

### Verify Occupation Template System

### Test Steps:
1. **Create Shift with Template**
   - Select "Bartender" template
   - **Test Point 34**: Should auto-include:
     - Required Certifications: "Smart Serve Ontario", "Safe Food Handling Certificate"
     - Minimum Rate: $17.50/hr (or provincial minimum, whichever is higher)

2. **Worker Profile Template Linkage**
   - View a worker's occupation profile
   - **Test Point 35**: Should show which template it's linked to (e.g., "Server / Waiter / Waitress")
   - **Test Point 36**: Changing rates or certs in super-admin templates should NOT retroactively change existing shift rates
   - **Test Point 37**: NEW shifts created after template update SHOULD use new rates

3. **Template Management (Super Admin)**
   - Login as super admin
   - Navigate to occupation templates management
   - **Test Point 38**: Should be able to edit:
     - Minimum hourly rate for occupation
     - Required certifications
     - Suggested skills
   - **Test Point 39**: Changes should take effect for NEW shifts immediately

---

## 🧪 Test Scenario 6: Platform Fee Calculation

### Verify $1/hr Fee Structure

### Test Steps:
1. **View Shift Cost Breakdown**
   - Create or view a shift with hourly rate
   - **Test Point 40**: If rate = provincial minimum (e.g., $16.55):
     - Worker receives: $16.55/hr
     - Employer pays: $16.55/hr + $1.00/hr platform fee = $17.55/hr total
     - Platform collects: $1.00/hr
   
   - **Test Point 41**: If rate > provincial minimum (e.g., $20.00):
     - Worker receives: $20.00/hr
     - Employer pays: $20.00/hr + $1.00/hr = $21.00/hr
     - Platform collects: $1.00/hr from employer + $1.00/hr from worker = $2.00/hr total
     - Worker net: $19.00/hr after platform fee

2. **Verify Fee Display**
   - **Test Point 42**: Cost breakdown should be clearly shown:
     - "Hourly Rate: $20.00"
     - "Platform Fee (Employer): +$1.00"
     - "Platform Fee (Worker): -$1.00" (if applicable)
     - "Total Cost to You: $21.00/hr"
     - "Worker Receives: $19.00/hr net" (if applicable)

---

## 🧪 Test Scenario 7: Edge Cases & Error Handling

### Test Steps:
1. **No Matching Candidates**
   - Create a shift with very specific requirements (rare certifications, specific skills, low rate)
   - **Test Point 43**: Should show "No candidates found matching your requirements"
   - **Test Point 44**: Should suggest:
     - Increase hourly rate
     - Remove optional requirements
     - Expand search radius

2. **All Internal Workers Unavailable**
   - Create shift when all roster workers are already booked
   - **Test Point 45**: Should skip directly to external candidate search
   - **Test Point 46**: Should show message: "Your team is fully booked. Showing candidates from HR Bank network."

3. **Worker Accepts/Declines Invitation**
   - Send invitation to external candidate
   - **Test Point 47**: Employer should see status: "Invitation Sent"
   - When worker accepts:
     - **Test Point 48**: Employer gets notification
     - **Test Point 49**: Shift shows worker as "Confirmed"
   - When worker declines:
     - **Test Point 50**: Employer gets notification
     - **Test Point 51**: Position reopens for other candidates

---

## ✅ Success Criteria Summary

### Must Pass:
- ✅ All 51 test points pass
- ✅ Match scoring logic works correctly (distance, availability, certs, skills)
- ✅ Address verification blocks proximity fraud
- ✅ Template inheritance standardizes roles
- ✅ Fee structure calculates correctly
- ✅ Internal employees shown BEFORE external candidates

### Performance Metrics:
- Match results load in < 2 seconds
- UI responsive on mobile devices
- No console errors or warnings

---

## 🐛 Known Issues to Watch For

Based on handoff summary:
1. ⚠️ Create Occupation Profile page (worker side) may have React rendering issue - verify with testing agent if needed
2. ⚠️ Google OAuth login complexity - may need to test with real credentials
3. ⚠️ Provincial minimum wage API was empty - NOW FIXED ✅

---

## 📝 Reporting Issues

When reporting issues, please include:
1. Test Point Number (e.g., "Test Point 15 failed")
2. Expected behavior
3. Actual behavior
4. Screenshots/screen recordings
5. Console errors (F12 → Console tab)
6. User type (employer/worker/admin)

---

## 🚀 Next Steps After Testing

Once recruitment workflow passes all tests:
1. ✅ Mark recruitment workflow as complete
2. Move to: Notifications & Messages UI implementation
3. Move to: Invitation System E2E testing
4. Move to: Data schema enhancements (SIN, payroll account)
5. Prepare for production deployment

---

**Testing Tools Available:**
- Screenshot tool: For visual verification
- Backend testing agent: For API endpoint testing
- Frontend testing agent: For E2E playwright automation
- Curl commands: For quick API checks

**Need Help?** 
- Ask me to run automated tests using the testing agents
- Request specific curl commands for API verification
- Need help debugging specific test points
