# HR Bank System Architecture Philosophy
## Anti-Abuse & Compliance-First Design

---

## 🎯 **CORE PRINCIPLE:**

**Every job posting must be tied to REAL business operations, preventing fake jobs, resume harvesting, and worker exploitation.**

---

## 🏗️ **STRUCTURAL HIERARCHY (Enforced Dependencies)**

```
┌─────────────────────────────────────────────────────┐
│ 1. EMPLOYER REGISTRATION (Foundation)              │
│    └─ Company Name, Address, Province              │
│    └─ Legal verification required                  │
│    └─ Payment method on file                       │
└─────────────────────────────────────────────────────┘
                    ↓ REQUIRED
┌─────────────────────────────────────────────────────┐
│ 2. WORKPLACE CREATION (Physical Location)          │
│    └─ Specific address (not PO Box)                │
│    └─ Geolocation coordinates                      │
│    └─ Cannot delete if active shifts exist         │
└─────────────────────────────────────────────────────┘
                    ↓ REQUIRED
┌─────────────────────────────────────────────────────┐
│ 3. ROLE DEFINITION (From Occupation Templates)     │
│    └─ Linked to super-admin approved occupations   │
│    └─ Provincial minimum wage ENFORCED             │
│    └─ Occupation minimum rate ENFORCED             │
│    └─ Required certifications defined              │
└─────────────────────────────────────────────────────┘
                    ↓ REQUIRED
┌─────────────────────────────────────────────────────┐
│ 4. WORKER INVITATION (Role-Specific)               │
│    └─ Must reference existing role                 │
│    └─ Creates employment relationship on accept    │
│    └─ 14-day shift requirement enforced            │
└─────────────────────────────────────────────────────┘
                    ↓ REQUIRED
┌─────────────────────────────────────────────────────┐
│ 5. SHIFT SCHEDULING (Actual Work)                  │
│    └─ Linked to workplace                          │
│    └─ Linked to employed worker                    │
│    └─ Rate validated against minimums              │
│    └─ Geofencing for attendance verification       │
└─────────────────────────────────────────────────────┘
                    ↓ REQUIRED
┌─────────────────────────────────────────────────────┐
│ 6. JOB POSTING (Match Engine)                      │
│    └─ Must originate from unfilled role            │
│    └─ Tied to real workplace                       │
│    └─ Rate compliance pre-validated                │
│    └─ Employer has proven track record             │
└─────────────────────────────────────────────────────┘
```

---

## 🛡️ **ANTI-ABUSE MECHANISMS**

### **1. EMPLOYER ACCOUNTABILITY**

**Problem Prevented:** Fake companies posting jobs to harvest resumes

**Our Solution:**
- ✅ Company registration with legal business name
- ✅ Physical address required (not PO Box)
- ✅ Payment method verification
- ✅ Provincial compliance (minimum wage by location)
- ✅ Audit trail of all employer actions
- ✅ Cannot delete account with pending obligations

**Validation Points:**
```python
# Employer profile required fields
- company_name (verified against business registry)
- address (physical location)
- province (determines minimum wage)
- contact_name, phone, email (verified)
- payment_method (card on file)
```

---

### **2. WORKPLACE VERIFICATION**

**Problem Prevented:** Fake locations, remote job scams, non-existent workplaces

**Our Solution:**
- ✅ Specific street address required
- ✅ Geolocation coordinates stored
- ✅ Address validation via API
- ✅ Cannot be deleted if active shifts scheduled
- ✅ Geofencing used for attendance verification
- ✅ Workers can report location discrepancies

**Business Rules:**
```javascript
// Workplace cannot be deleted if:
- Has shifts scheduled in next 30 days
- Has active employment relationships
- Has pending shift applications
- Has incomplete payment obligations
```

---

### **3. ROLE-BASED HIRING (No Generic "Hiring")**

**Problem Prevented:** Vague job postings, bait-and-switch tactics

**Our Solution:**
- ✅ Roles must be created from super-admin occupation templates
- ✅ Specific occupation titles (e.g., "Chef" not "General Labor")
- ✅ Required certifications defined upfront
- ✅ Hourly rate MUST meet occupation minimum
- ✅ Hourly rate MUST meet provincial minimum wage
- ✅ Role tied to specific workplace (not company-wide)

**Rate Enforcement:**
```python
# System validates BEFORE role creation
effective_minimum = MAX(
    provincial_minimum_wage,  # e.g., ON: $16.55
    occupation_minimum_rate   # e.g., Chef: $22.00
)

if employer_proposed_rate < effective_minimum:
    REJECT with compliance error message
```

---

### **4. DUAL HIRING PATHWAYS (Invitation + Match Engine)**

**Problem Prevented:** Fake workers, unqualified candidates, no-show employees

**Our Solution - TWO VALIDATED PATHWAYS:**

#### **Pathway A: Employer Invitation**
- ✅ Employer invites specific workers they know
- ✅ Invitation tied to specific role with defined rate
- ✅ 7-day token expiry (prevents indefinite "recruiting")
- ✅ Email + SMS verification (real contact info required)
- ✅ Employment relationship auto-created on acceptance
- ✅ Worker profile completeness verified

#### **Pathway B: Match Engine (Platform-Validated)**
- ✅ Workers validated by HR Bank staff BEFORE entering pool
- ✅ Experience verification required
- ✅ Work eligibility checked by platform staff
- ✅ Licenses validated (issued by institution user type)
- ✅ Credentials verified through institution accounts
- ✅ Workers matched to jobs based on qualifications
- ✅ Both parties commit to job before scheduling

**Worker Accountability (Match Engine):**
```
Worker registers → HR Bank validates → Credentials verified by institutions
    ↓                      ↓                           ↓
Experience checked    Work eligibility confirmed    Licenses validated
Background verified   Skills assessed              Profile approved
    ↓                      ↓                           ↓
Available in workforce pool → Matched to jobs → Must attend or face penalties
```

---

### **5. 14-DAY SHIFT REQUIREMENT (Prevents Hiring Without Work)**

**Problem Prevented:** Employers "hiring" for resume access, never scheduling work

**Our Solution:**
- ✅ Worker MUST receive shift within 14 days
- ✅ 10-day warning notification sent
- ✅ Day 14: Worker automatically returned to pool
- ✅ Employer loses access to worker
- ✅ Worker becomes available to other employers
- ✅ Platform protects worker from exploitation

**Automated Enforcement:**
```python
# Cron job runs daily
for employment_relationship in active_relationships:
    days_without_shift = calculate_days_since_last_shift()
    
    if days_without_shift == 10:
        send_warning_to_employer()
        send_notification_to_worker()
    
    if days_without_shift >= 14:
        relationship.status = 'inactive'
        relationship.termination_reason = 'auto_return_to_pool'
        worker.available_for_matching = True
        notify_both_parties()
```

---

### **6. SHIFT SCHEDULING VALIDATION (Real Work Verification)**

**Problem Prevented:** Posting jobs with no intention to schedule work

**Our Solution:**
- ✅ Shifts linked to real workplace address
- ✅ Shifts linked to employed workers only
- ✅ Geofencing validates worker attendance
- ✅ QR code check-in at workplace
- ✅ Rate cannot be changed below minimum after scheduling
- ✅ Payment processing tied to shift completion

**Attendance Verification:**
```python
# Worker must check-in within geofence
if worker_location within workplace_geofence:
    shift_start_allowed = True
else:
    raise LocationVerificationError()

# QR code must be scanned at workplace
qr_code.workplace_id == shift.workplace_id
```

---

### **7. MATCH ENGINE RESTRICTIONS (Qualified Postings Only)**

**Problem Prevented:** Spam postings, fake jobs flooding the platform

**Our Solution:**
- ✅ Jobs can ONLY be posted from existing unfilled roles
- ✅ Role must have passed all compliance validations
- ✅ Workplace must exist and be active
- ✅ Employer must have payment method on file
- ✅ Employer track record considered in matching
- ✅ Workers can report suspicious postings

**Job Posting Requirements:**
```python
# To post job to match engine:
requirements = {
    'unfilled_role': True,              # Must have created role first
    'workplace_active': True,           # Workplace exists and operational
    'rate_validated': True,             # Meets all minimum wage requirements
    'certifications_defined': True,     # Required certs specified
    'employer_payment_method': True,    # Payment method verified
    'no_outstanding_violations': True   # Clean compliance record
}
```

---

### **8. PAYMENT ENFORCEMENT (Fair Compensation)**

**Problem Prevented:** Under-the-table deals, below-minimum-wage exploitation

**Our Solution:**
- ✅ Provincial minimum wage enforced by system
- ✅ Occupation minimum rates enforced
- ✅ Platform fees transparent and predictable
- ✅ Payroll processor integration (ADP, Rippling)
- ✅ Workers receive gross pay before platform fees
- ✅ Tax compliance handled by payroll processors
- ✅ Payment cannot be reduced after shift completion

**Fee Structure (Transparent):**
```
Minimum Wage Jobs ($16.55 - Occupation Min):
- Worker receives: Full hourly rate (no platform fee)
- Employer pays: Rate + $1/hr platform fee
- Platform revenue: $1/hr

Above Minimum Wage Jobs:
- Worker receives: Rate - $1/hr platform fee
- Employer pays: Rate + $1/hr platform fee
- Platform revenue: $2/hr

No hidden fees. No surprise deductions.
```

---

## 📊 **VALIDATION CASCADE**

Every action flows through validation layers:

```
┌─────────────────────────────────────────────┐
│ Layer 1: User Authentication               │
│ └─ Valid employer account                  │
│ └─ Active subscription status              │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Business Entity Validation        │
│ └─ Company registration complete           │
│ └─ Payment method verified                 │
│ └─ No outstanding violations               │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ Layer 3: Workplace Validation              │
│ └─ Workplace exists and active             │
│ └─ Address verified                        │
│ └─ Geolocation valid                       │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ Layer 4: Role & Rate Compliance            │
│ └─ Role from approved occupation template  │
│ └─ Rate ≥ Provincial minimum wage          │
│ └─ Rate ≥ Occupation minimum               │
│ └─ Required certifications defined         │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ Layer 5: Worker Eligibility                │
│ └─ Worker profile complete                 │
│ └─ Required certifications verified        │
│ └─ Background checks passed (if required)  │
│ └─ Available for employment                │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ Layer 6: Operational Validation            │
│ └─ Shift scheduled within 14 days          │
│ └─ Geofence attendance verified            │
│ └─ Payment processed correctly             │
│ └─ Compliance maintained                   │
└─────────────────────────────────────────────┘
```

---

## 🚫 **WHAT WE PREVENT**

### **Fake Job Postings**
❌ Cannot post job without creating role first
❌ Cannot create role without workplace
❌ Cannot create workplace without company registration

### **Resume Harvesting**
❌ No blind applications allowed
❌ Employer must invite specific workers
❌ Employment relationship created immediately
❌ 14-day rule forces actual work or release

### **Below-Minimum-Wage Exploitation**
❌ System enforces provincial minimum wage
❌ System enforces occupation minimums
❌ Rate cannot be changed below minimum after posting
❌ Automatic compliance validation at every step

### **Bait-and-Switch Tactics**
❌ Role details locked after invitation sent
❌ Worker accepts specific role with specific rate
❌ Rate cannot be reduced after acceptance
❌ Workplace location cannot be changed after scheduling

### **Ghost Jobs (No Actual Work)**
❌ 14-day shift requirement enforced
❌ Worker returned to pool if no work given
❌ Employer loses worker permanently
❌ Pattern tracked for employer reputation

### **Payment Fraud**
❌ Payment method required before posting jobs
❌ Platform fees automatically calculated
❌ Payroll processors ensure tax compliance
❌ Workers paid before platform takes fees

---

## 💪 **PLATFORM ADVANTAGES**

### **For Workers:**
- ✅ Only see REAL job opportunities
- ✅ Guaranteed minimum wage compliance
- ✅ Protected from exploitation (14-day rule)
- ✅ Transparent pay rates upfront
- ✅ Verified workplaces with geolocation
- ✅ Automatic return to pool if no work

### **For Legitimate Employers:**
- ✅ Access to verified, certified workers
- ✅ Structured hiring process
- ✅ Compliance built-in (no legal risks)
- ✅ Reputation system rewards good actors
- ✅ Retention management tools
- ✅ Fair competition (no wage undercutting)

### **For Platform:**
- ✅ High-quality job marketplace
- ✅ Legal compliance protection
- ✅ Reduced fraud and abuse
- ✅ Better worker outcomes
- ✅ Employer accountability
- ✅ Sustainable business model

---

## 🎯 **ACCOUNTABILITY AT EVERY LEVEL**

```
Super-Admin Level:
├─ Sets occupation templates with minimum rates
├─ Updates provincial minimum wages
├─ Monitors platform-wide compliance
└─ Can audit any employer or job posting

Employer Level:
├─ Must register real company
├─ Must create real workplaces
├─ Must define specific roles
├─ Must pay compliant rates
├─ Must schedule shifts within 14 days
└─ Actions tracked in audit log

Worker Level:
├─ Must complete profile
├─ Must have required certifications
├─ Must check-in via geofence/QR
├─ Can report workplace issues
└─ Protected by 14-day rule

Platform Level:
├─ Validates every transaction
├─ Enforces compliance automatically
├─ Tracks all employer actions
├─ Returns workers to pool if neglected
└─ Maintains audit trail for legal protection
```

---

## 📈 **BUSINESS IMPACT**

**Traditional Job Platforms:**
- 60-70% of job postings are fake or ghost jobs
- Workers apply blindly, wasting time
- No rate transparency
- No accountability for employers
- Resume harvesting common

**HR Bank Platform:**
- ✅ 100% of jobs tied to real business operations
- ✅ Workers only see validated opportunities
- ✅ Full rate transparency upfront
- ✅ Employer accountability enforced
- ✅ Anti-abuse systems prevent exploitation

---

## 🔐 **COMPLIANCE & LEGAL PROTECTION**

### **For Employers:**
- Automatic minimum wage compliance
- Provincial law adherence
- Payroll tax handling
- Worker classification protection
- Audit trail for disputes

### **For Workers:**
- Wage theft prevention
- Minimum wage guarantee
- Work opportunity protection
- Fair scheduling enforcement
- Grievance mechanisms

### **For Platform:**
- Legal liability protection
- Regulatory compliance
- Audit readiness
- Anti-fraud defense
- Sustainable operations

---

## 🎯 **SUMMARY**

**Every piece of the system architecture exists to ensure:**

1. **Real Companies** → Verified registration
2. **Real Workplaces** → Physical locations
3. **Real Roles** → Defined from templates
4. **Real Rates** → Compliance enforced
5. **Real Workers** → Certified and verified
6. **Real Shifts** → 14-day requirement
7. **Real Jobs** → Match engine posting only from validated roles

**Result:** A marketplace of GENUINE employment opportunities where workers are protected, employers are accountable, and the platform maintains integrity.

---

**This is not just a job board. This is a compliance-first, worker-protection, anti-abuse employment platform.**
