# HR Bank Privacy Impact Assessment (PIA) Framework

## Document Control
- **Version:** 1.0
- **Effective Date:** January 28, 2026
- **Owner:** Privacy & Compliance Team
- **Review Frequency:** Annual

---

## 1. Introduction

### 1.1 Purpose
This Privacy Impact Assessment (PIA) Framework ensures HR Bank systematically evaluates privacy risks associated with new projects, systems, or processes that involve personal information.

### 1.2 Legal Basis
- Personal Information Protection and Electronic Documents Act (PIPEDA)
- SOC2 Privacy Trust Service Criteria
- Provincial privacy legislation (as applicable)

### 1.3 When is a PIA Required?

A PIA must be conducted when:
- Launching a new system that processes personal information
- Significantly modifying existing systems
- Introducing new data collection methods
- Sharing data with new third parties
- Implementing new technologies (AI/ML, biometrics, etc.)
- Expanding into new jurisdictions

---

## 2. PIA Process Overview

```
┌─────────────────┐
│  1. Initiation  │ → Project identified, PIA triggered
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. Data Mapping│ → Identify what data is collected/processed
└────────┬────────┘
         ↓
┌─────────────────┐
│ 3. Risk Analysis│ → Assess privacy risks
└────────┬────────┘
         ↓
┌─────────────────┐
│ 4. Mitigation   │ → Implement controls
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. Approval    │ → Privacy Officer sign-off
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. Monitoring  │ → Ongoing compliance
└─────────────────┘
```

---

## 3. PIA Questionnaire Template

### Section A: Project Information

| Field | Response |
|-------|----------|
| Project Name | |
| Project Owner | |
| Department | |
| Start Date | |
| Go-Live Date | |
| PIA Analyst | |
| Date Completed | |

### Section B: Project Description

1. **What is the purpose of this project?**
   
   [Describe the business need and objectives]

2. **What problem does this solve?**
   
   [Describe the issue being addressed]

3. **Who are the stakeholders?**
   
   [List internal and external stakeholders]

---

### Section C: Data Inventory

#### C.1 Personal Information Collected

| Data Element | Collected (Y/N) | Source | Purpose |
|-------------|-----------------|--------|---------|
| Full Name | | | |
| Email Address | | | |
| Phone Number | | | |
| Home Address | | | |
| Date of Birth | | | |
| SIN/SSN | | | |
| Government ID | | | |
| Financial Information | | | |
| Employment History | | | |
| Education Records | | | |
| Health Information | | | |
| Biometric Data | | | |
| Location Data | | | |
| Device Information | | | |
| Behavioral Data | | | |

#### C.2 Sensitive Data Categories

- [ ] Children's data (under 18)
- [ ] Health/medical information
- [ ] Financial/payment data
- [ ] Government identifiers (SIN, passport)
- [ ] Biometric data
- [ ] Criminal history
- [ ] Religious/political beliefs
- [ ] Sexual orientation
- [ ] Racial/ethnic origin

#### C.3 Data Volume

| Metric | Estimate |
|--------|----------|
| Number of individuals affected | |
| Records processed daily | |
| Total data stored | |

---

### Section D: Data Flow Analysis

#### D.1 Data Collection

| Question | Response |
|----------|----------|
| How is data collected? | [ ] Web forms [ ] Mobile app [ ] API [ ] Manual entry [ ] Third party |
| Is collection transparent to users? | [ ] Yes [ ] No |
| Is consent obtained? | [ ] Yes [ ] No [ ] N/A |
| What is the lawful basis? | [ ] Consent [ ] Contract [ ] Legal obligation [ ] Legitimate interest |

#### D.2 Data Storage

| Question | Response |
|----------|----------|
| Where is data stored? | [ ] MongoDB Atlas [ ] AWS S3 [ ] Local servers [ ] Third party |
| Geographic location(s) | |
| Encryption at rest? | [ ] Yes [ ] No |
| Access controls in place? | [ ] Yes [ ] No |
| Retention period | |

#### D.3 Data Processing

| Question | Response |
|----------|----------|
| What processing occurs? | |
| Automated decision-making? | [ ] Yes [ ] No |
| AI/ML algorithms used? | [ ] Yes [ ] No |
| Profiling conducted? | [ ] Yes [ ] No |

#### D.4 Data Sharing

| Recipient | Purpose | Legal Basis | DPA in Place |
|-----------|---------|-------------|--------------|
| | | | [ ] Yes [ ] No |
| | | | [ ] Yes [ ] No |
| | | | [ ] Yes [ ] No |

#### D.5 Data Retention & Disposal

| Question | Response |
|----------|----------|
| Retention period defined? | [ ] Yes [ ] No |
| Retention period | |
| Disposal method | [ ] Secure deletion [ ] Anonymization [ ] Archival |
| Disposal verification | [ ] Yes [ ] No |

---

### Section E: Privacy Risk Assessment

#### E.1 Risk Identification

| Risk Category | Potential Risks | Likelihood (1-5) | Impact (1-5) | Risk Score |
|--------------|-----------------|------------------|--------------|------------|
| Collection | Excessive data collection | | | |
| Collection | Lack of consent | | | |
| Storage | Unauthorized access | | | |
| Storage | Data breach | | | |
| Processing | Inaccurate data | | | |
| Processing | Unfair profiling | | | |
| Sharing | Unauthorized disclosure | | | |
| Sharing | Cross-border transfer risks | | | |
| Retention | Excessive retention | | | |
| Retention | Improper disposal | | | |

#### E.2 Risk Scoring Matrix

| | Impact: 1 | Impact: 2 | Impact: 3 | Impact: 4 | Impact: 5 |
|---|---|---|---|---|---|
| **Likelihood: 5** | Medium | Medium | High | Critical | Critical |
| **Likelihood: 4** | Low | Medium | Medium | High | Critical |
| **Likelihood: 3** | Low | Low | Medium | Medium | High |
| **Likelihood: 2** | Low | Low | Low | Medium | Medium |
| **Likelihood: 1** | Low | Low | Low | Low | Medium |

---

### Section F: Privacy Controls & Mitigations

#### F.1 Existing Controls

| Control | Implemented | Description |
|---------|-------------|-------------|
| Consent management | [ ] Yes [ ] No | |
| Access controls | [ ] Yes [ ] No | |
| Encryption | [ ] Yes [ ] No | |
| Audit logging | [ ] Yes [ ] No | |
| Data minimization | [ ] Yes [ ] No | |
| Retention policies | [ ] Yes [ ] No | |
| Breach notification | [ ] Yes [ ] No | |

#### F.2 Required Mitigations

| Risk | Mitigation | Owner | Due Date | Status |
|------|------------|-------|----------|--------|
| | | | | |
| | | | | |
| | | | | |

---

### Section G: Data Subject Rights

| Right | Supported | Implementation |
|-------|-----------|----------------|
| Access (view data) | [ ] Yes [ ] No | |
| Rectification (correct data) | [ ] Yes [ ] No | |
| Erasure (delete data) | [ ] Yes [ ] No | |
| Portability (export data) | [ ] Yes [ ] No | |
| Object (opt-out) | [ ] Yes [ ] No | |
| Restrict processing | [ ] Yes [ ] No | |
| Withdraw consent | [ ] Yes [ ] No | |

---

### Section H: Third-Party Assessment

For each third party with data access:

| Vendor | Service | Data Shared | SOC2/ISO27001 | DPA Signed | Last Review |
|--------|---------|-------------|---------------|------------|-------------|
| MongoDB Atlas | Database | All user data | Yes | Yes | 2026-01 |
| Stripe | Payments | Payment info | Yes (PCI) | Yes | 2026-01 |
| SendGrid | Email | Email addresses | Yes | Yes | 2026-01 |
| Twilio | SMS | Phone numbers | Yes | Yes | 2026-01 |
| Pinata | IPFS | Credential metadata | Pending | Yes | 2026-01 |

---

### Section I: Approval & Sign-Off

#### Residual Risk Assessment

After mitigations, the residual privacy risk is:
- [ ] Low - Acceptable
- [ ] Medium - Acceptable with monitoring
- [ ] High - Requires additional controls
- [ ] Critical - Do not proceed

#### Approvals

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Owner | | | |
| Privacy Officer | | | |
| Security Lead | | | |
| Legal (if required) | | | |

---

## 4. Completed PIAs

### 4.1 HR Bank Core Platform

| Field | Value |
|-------|-------|
| **Project** | HR Bank Core Platform |
| **Date Completed** | January 28, 2026 |
| **Risk Level** | Medium |
| **Status** | Approved |

**Summary:**
The HR Bank platform collects and processes personal information for credential verification, workforce management, and institutional partnerships. Key privacy controls include:

- Consent management system for all data processing
- Field-level encryption for sensitive data (SIN, bank accounts)
- Role-based access controls
- 7-year audit log retention
- PIPEDA-compliant data export and deletion
- Third-party vendor agreements in place

**Mitigations Implemented:**
1. ✅ Encryption service for PII fields
2. ✅ Consent tracking with version history
3. ✅ Data retention policies defined
4. ✅ Data subject rights endpoints (export, delete)
5. ✅ Third-party DPAs executed

---

### 4.2 Blockchain Credential System

| Field | Value |
|-------|-------|
| **Project** | Blockchain Credential Verification |
| **Date Completed** | January 28, 2026 |
| **Risk Level** | Medium |
| **Status** | Approved |

**Summary:**
Credential metadata is stored on IPFS (via Pinata) and anchored to Polygon blockchain for immutability.

**Privacy Considerations:**
- Only credential metadata stored on-chain (no PII)
- Credential holder consent required before issuance
- Immutable records cannot be deleted (by design)
- Verification requires credential ID (not searchable by PII)

**Mitigations:**
1. ✅ No PII stored on public blockchain
2. ✅ Consent captured before credential issuance
3. ✅ Credential revocation supported (marks as invalid)
4. ✅ Access to verification requires credential ID

---

## 5. PIA Review Schedule

| Project/System | Last PIA | Next Review | Owner |
|---------------|----------|-------------|-------|
| Core Platform | 2026-01-28 | 2027-01-28 | Privacy Team |
| Blockchain System | 2026-01-28 | 2027-01-28 | Privacy Team |
| Mobile App | TBD | TBD | Privacy Team |
| Analytics/Reporting | TBD | TBD | Privacy Team |

---

## 6. References

- PIPEDA: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
- OAIC PIA Guide: https://www.oaic.gov.au/privacy/guidance-and-advice/guide-to-undertaking-privacy-impact-assessments
- NIST Privacy Framework: https://www.nist.gov/privacy-framework

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Privacy Team | Initial version |
