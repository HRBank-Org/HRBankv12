# HR Bank Incident Response Playbook

## Document Control
- **Version:** 1.0
- **Effective Date:** January 28, 2026
- **Owner:** Security Team
- **Review Frequency:** Quarterly

---

## 1. Incident Response Team

### Contact Information
| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | Qasim Nizami | +1-519-999-0001 | qnizami@hrbank.ca |
| Security Lead | Qasim Nizami | +1-519-999-0001 | security@hrbank.ca |
| Engineering Lead | HR Bank Engineering | +1-519-999-0002 | engineering@hrbank.ca |
| Communications | HR Bank Communications | +1-519-999-0003 | comms@hrbank.ca |
| Legal Counsel | HR Bank Legal | +1-519-999-0004 | legal@hrbank.ca |

### Escalation Matrix
| Severity | Initial Response | Escalation |
|----------|-----------------|------------|
| Critical | Security Lead (15 min) | CEO + Legal (1 hour) |
| High | Security Lead (1 hour) | CTO (4 hours) |
| Medium | On-call Engineer (4 hours) | Security Lead (24 hours) |
| Low | Ticket System (24 hours) | Engineering Lead (72 hours) |

---

## 2. Incident Classification

### 2.1 Severity Levels

#### CRITICAL (P0)
- Confirmed data breach
- Active intrusion/compromise
- Ransomware/malware infection
- Complete system outage
- **Response Time:** 15 minutes

#### HIGH (P1)
- Unauthorized access detected
- Credential compromise suspected
- DDoS attack
- Partial system outage
- **Response Time:** 1 hour

#### MEDIUM (P2)
- Policy violation detected
- Suspicious activity patterns
- Failed penetration attempt
- Vulnerability discovered
- **Response Time:** 4 hours

#### LOW (P3)
- Security misconfigurations
- Minor policy violations
- False positive alerts
- **Response Time:** 24 hours

---

## 3. Incident Response Phases

### Phase 1: Detection & Identification

**Automated Detection Sources:**
- Audit log alerts (`/api/compliance/audit-logs`)
- Failed login monitoring (5+ failures = lockout)
- Rate limiting alerts
- Anomaly detection in security_controls.py

**Manual Detection:**
- User reports via support tickets
- Security team monitoring
- Third-party notifications

**Initial Assessment Checklist:**
- [ ] What systems/data are affected?
- [ ] Is the incident ongoing?
- [ ] What is the potential impact?
- [ ] Who needs to be notified?
- [ ] What evidence should be preserved?

### Phase 2: Containment

**Immediate Actions:**

```bash
# Force logout compromised user
curl -X POST "$API/api/compliance/admin/terminate-user-sessions/{user_id}" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Lock compromised account
# (Account auto-locks after 5 failed attempts, or via direct DB update)

# Check active sessions
curl "$API/api/compliance/security/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Containment Strategies:**

| Incident Type | Containment Action |
|--------------|-------------------|
| Credential Compromise | Force logout, password reset, session termination |
| Data Breach | Isolate affected systems, revoke API keys |
| DDoS Attack | Enable rate limiting, block IPs |
| Malware | Isolate infected systems, disconnect from network |
| Insider Threat | Suspend account, revoke access |

### Phase 3: Eradication

**Root Cause Analysis:**
1. Review audit logs for incident timeline
2. Analyze attack vectors
3. Identify all affected systems
4. Document findings

**Remediation Actions:**
- Patch vulnerabilities
- Reset all potentially compromised credentials
- Update firewall/security rules
- Remove malicious code/access

### Phase 4: Recovery

**System Recovery Checklist:**
- [ ] Verify system integrity
- [ ] Restore from clean backups if needed
- [ ] Re-enable disabled services
- [ ] Verify security controls active
- [ ] Monitor for recurrence

**Recovery Verification:**
```bash
# Verify system health
curl "$API/api/health"

# Check security status
curl "$API/api/compliance/security/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Review recent audit logs
curl "$API/api/compliance/audit-logs?severity=error&limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Phase 5: Post-Incident

**Post-Incident Report Template:**
1. Executive Summary
2. Incident Timeline
3. Root Cause Analysis
4. Impact Assessment
5. Response Actions
6. Lessons Learned
7. Recommendations

**Improvement Actions:**
- Update detection rules
- Enhance monitoring
- Revise policies if needed
- Conduct additional training
- Schedule follow-up review

---

## 4. Specific Incident Playbooks

### 4.1 Credential Compromise

**Indicators:**
- Multiple failed login attempts
- Login from unusual location
- Unauthorized data access
- User reports suspicious activity

**Response Steps:**
1. Terminate all user sessions
2. Lock the account
3. Reset password via secure channel
4. Review audit logs for unauthorized actions
5. Check for data exfiltration
6. Notify user of compromise
7. Enable additional MFA if not active

### 4.2 Data Breach

**Indicators:**
- Unusual data exports
- Bulk API access patterns
- Unauthorized database queries
- External reports of data exposure

**Response Steps:**
1. Identify scope of breach
2. Preserve evidence (audit logs, access logs)
3. Contain further exposure
4. Assess regulatory notification requirements
5. Prepare customer notifications
6. Engage legal counsel
7. File regulatory reports (within 72 hours)

### 4.3 DDoS Attack

**Indicators:**
- Rate limit exceeded alerts
- Unusual traffic patterns
- Service degradation
- API timeout errors

**Response Steps:**
1. Enable aggressive rate limiting
2. Block attacking IPs
3. Scale infrastructure if needed
4. Engage CDN/DDoS protection
5. Monitor for secondary attacks
6. Document attack patterns

### 4.4 Insider Threat

**Indicators:**
- Unusual data access patterns
- Access outside normal hours
- Data exports to personal accounts
- Policy violations

**Response Steps:**
1. Do not alert the individual
2. Preserve evidence
3. Review all access logs
4. Engage HR and Legal
5. Suspend access when authorized
6. Conduct forensic investigation
7. Document for potential legal action

---

## 5. Communication Templates

### Internal Notification
```
Subject: [SEVERITY] Security Incident - [Brief Description]

Team,

A security incident has been detected requiring immediate attention.

Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Time Detected: [TIMESTAMP]
Systems Affected: [LIST]
Initial Assessment: [BRIEF DESCRIPTION]

Current Status: [INVESTIGATING/CONTAINED/RESOLVED]

Action Required: [SPECIFIC ACTIONS]

Incident Commander: [NAME]
Next Update: [TIME]
```

### Customer Notification (Data Breach)
```
Subject: Important Security Notice from HR Bank

Dear [CUSTOMER NAME],

We are writing to inform you of a security incident that may have 
affected your information.

What Happened:
[BRIEF, CLEAR DESCRIPTION]

What Information Was Involved:
[SPECIFIC DATA TYPES]

What We Are Doing:
[REMEDIATION STEPS]

What You Can Do:
[RECOMMENDED ACTIONS]

For More Information:
[CONTACT DETAILS]

We sincerely apologize for any inconvenience and are committed to 
protecting your information.

HR Bank Security Team
```

---

## 6. Regulatory Reporting

### PIPEDA Requirements
- Report to Privacy Commissioner within 72 hours
- Document the breach
- Notify affected individuals
- Maintain records for 24 months

### Report Contents:
- Description of the breach
- Date/time of breach
- Types of information involved
- Number of individuals affected
- Steps taken to reduce harm
- Contact for questions

---

## 7. Evidence Preservation

### Data to Preserve:
- [ ] Audit logs (export immediately)
- [ ] System logs
- [ ] Network traffic logs
- [ ] Database query logs
- [ ] User session data
- [ ] Email communications
- [ ] Screenshots of indicators

### Preservation Commands:
```bash
# Export audit logs
curl "$API/api/compliance/audit-logs?start_date=YYYY-MM-DD&limit=10000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > incident_audit_logs.json

# Export security events
curl "$API/api/compliance/audit-logs?event_type=security&limit=10000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > security_events.json
```

---

## 8. Post-Incident Checklist

- [ ] Incident report completed
- [ ] Root cause identified
- [ ] Remediation actions implemented
- [ ] Customer notifications sent (if required)
- [ ] Regulatory reports filed (if required)
- [ ] Lessons learned documented
- [ ] Policies updated if needed
- [ ] Team debriefing conducted
- [ ] Monitoring enhanced
- [ ] Follow-up review scheduled

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Security Team | Initial version |
