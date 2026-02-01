# HR Bank Incident Response Playbook

## Document Control
- **Version:** 1.0
- **Effective Date:** January 31, 2026
- **Owner:** Security & Engineering Team
- **Review Frequency:** Quarterly
- **Classification:** Internal

---

## 1. Incident Classification

### Severity Levels

| Level | Name | Description | Response Time | Examples |
|-------|------|-------------|---------------|----------|
| SEV-1 | Critical | Complete service outage or data breach | 15 minutes | Database down, security breach, all users affected |
| SEV-2 | High | Major feature unavailable, data at risk | 30 minutes | Payment processing down, auth failures, partial outage |
| SEV-3 | Medium | Degraded service, workaround available | 2 hours | Slow performance, minor feature broken, email delays |
| SEV-4 | Low | Minor issue, no user impact | 24 hours | UI bugs, documentation errors, non-critical logs |

---

## 2. Incident Response Team

### Roles

| Role | Responsibility | Backup |
|------|----------------|--------|
| **Incident Commander (IC)** | Coordinates response, makes decisions | Engineering Lead |
| **Technical Lead** | Diagnoses and implements fix | Senior Developer |
| **Communications Lead** | Internal/external updates | Product Manager |
| **Scribe** | Documents timeline and actions | Any team member |

### On-Call Rotation
- Primary: Check PagerDuty schedule
- Escalation: After 15 minutes without response

---

## 3. Incident Response Phases

### Phase 1: Detection & Triage (0-15 minutes)

```
[ ] Alert received (monitoring, user report, automated)
[ ] Acknowledge alert within 5 minutes
[ ] Assess severity level
[ ] Assign Incident Commander
[ ] Create incident channel (#incident-YYYY-MM-DD)
[ ] Page appropriate team members
[ ] Begin incident timeline documentation
```

### Phase 2: Containment (15-60 minutes)

```
[ ] Identify affected systems/users
[ ] Implement immediate containment:
    [ ] Enable maintenance mode if needed
    [ ] Isolate compromised systems
    [ ] Revoke compromised credentials
[ ] Preserve evidence (logs, snapshots)
[ ] Communicate status to stakeholders
```

### Phase 3: Eradication (1-4 hours)

```
[ ] Identify root cause
[ ] Develop remediation plan
[ ] Implement fix
[ ] Test fix in staging (if possible)
[ ] Deploy fix to production
[ ] Verify fix resolves issue
```

### Phase 4: Recovery (4-24 hours)

```
[ ] Restore affected systems
[ ] Verify data integrity
[ ] Re-enable user access
[ ] Monitor for recurrence
[ ] Update status page
[ ] Notify affected users
```

### Phase 5: Post-Incident (24-72 hours)

```
[ ] Schedule post-mortem meeting
[ ] Complete incident report
[ ] Identify preventive measures
[ ] Create action items with owners
[ ] Update runbooks/documentation
[ ] Close incident
```

---

## 4. Communication Templates

### Internal - Incident Declared
```
🚨 INCIDENT DECLARED - SEV-[X]

Issue: [Brief description]
Impact: [Who/what is affected]
Status: Investigating
IC: [Name]
Channel: #incident-YYYY-MM-DD

Updates every [15/30/60] minutes
```

### Internal - Status Update
```
📊 INCIDENT UPDATE - SEV-[X]

Time: [HH:MM UTC]
Status: [Investigating/Identified/Implementing Fix/Monitoring]
Update: [What changed]
ETA: [Estimated resolution time]
Next update: [Time]
```

### Internal - Resolved
```
✅ INCIDENT RESOLVED - SEV-[X]

Duration: [X hours Y minutes]
Root Cause: [Brief description]
Resolution: [What fixed it]
Impact: [Users affected, data impact]
Post-mortem: [Date/Time]
```

### External - Status Page
```
[Investigating] We are aware of issues affecting [service].
We are actively investigating and will provide updates.

[Identified] The issue has been identified. Our team is implementing a fix.
Expected resolution: [Time estimate]

[Resolved] This incident has been resolved. All services are operating normally.
We apologize for any inconvenience.
```

---

## 5. Runbooks by Incident Type

### 5.1 Database Connectivity Failure

**Detection:** API returns 500 errors, "database connection failed" in logs

**Steps:**
1. Check MongoDB Atlas status: https://status.mongodb.com
2. Verify Atlas dashboard: https://cloud.mongodb.com
3. Check IP whitelist hasn't changed
4. Verify MONGO_URL environment variable
5. Restart backend: `sudo supervisorctl restart backend`
6. If Atlas issue, enable maintenance mode
7. For data corruption, initiate PITR recovery

### 5.2 Authentication Failure (Mass Logout)

**Detection:** Multiple users reporting login failures, JWT validation errors

**Steps:**
1. Check JWT secret hasn't changed
2. Verify Google OAuth credentials valid
3. Check session cleanup didn't terminate valid sessions
4. Review recent deployments for auth changes
5. If compromised, rotate JWT secret and force re-login

### 5.3 Payment Processing Failure

**Detection:** Stripe webhook errors, payment completion failures

**Steps:**
1. Check Stripe status: https://status.stripe.com
2. Verify Stripe API keys haven't been rotated
3. Check webhook signature verification
4. Enable payment queue (graceful degradation)
5. Monitor for Stripe recovery
6. Process queued payments after restoration

### 5.4 Security Breach / Unauthorized Access

**Detection:** Unusual audit log patterns, external notification, user reports

**Steps:**
1. **IMMEDIATELY**: Activate incident response team
2. Isolate: Disable external API access if needed
3. Terminate all sessions: `POST /api/admin/security/cleanup-sessions`
4. Revoke OAuth tokens
5. Reset database credentials
6. Review audit logs: `GET /api/compliance/audit-logs`
7. Identify scope of access
8. Notify legal/compliance
9. Prepare breach notification (72 hours for PIPEDA)
10. Engage forensics if needed

### 5.5 High CPU/Memory Usage

**Detection:** Slow response times, monitoring alerts

**Steps:**
1. Check system resources: `top`, `htop`
2. Check supervisor processes: `sudo supervisorctl status`
3. Review recent traffic patterns
4. Check for infinite loops in logs
5. Restart affected service
6. Scale if needed

### 5.6 Third-Party Service Degradation

**Detection:** Specific feature failures, third-party errors in logs

| Service | Status Page | Degradation Action |
|---------|------------|-------------------|
| SendGrid | status.sendgrid.com | Queue emails for retry |
| Twilio | status.twilio.com | Use email-only OTP |
| Stripe | status.stripe.com | Queue payments |
| MongoDB Atlas | status.mongodb.com | Enable maintenance mode |

---

## 6. Contact Information

### Internal Contacts
| Role | Contact Method |
|------|---------------|
| Engineering | Slack #engineering |
| Security | Slack #security |
| Leadership | Slack #leadership + Phone |

### External Contacts
| Service | Support URL |
|---------|------------|
| AWS Support | AWS Console |
| MongoDB Atlas | cloud.mongodb.com/support |
| Stripe | dashboard.stripe.com/support |
| SendGrid | sendgrid.com/support |

### Emergency Contacts
| Situation | Contact |
|-----------|---------|
| Legal counsel | [Company legal contact] |
| PR/Communications | [PR contact] |
| Cyber insurance | [Insurance provider] |

---

## 7. Post-Incident Report Template

```markdown
# Post-Incident Report: [Title]

## Summary
- **Incident ID:** INC-YYYY-MM-DD-XXX
- **Severity:** SEV-X
- **Duration:** X hours Y minutes
- **Impact:** [Users/systems affected]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | [Event description] |

## Root Cause
[Detailed explanation of why the incident occurred]

## Resolution
[What was done to fix it]

## Impact Assessment
- Users affected: X
- Data impact: [None/Minimal/Significant]
- Financial impact: [Estimated]
- Reputation impact: [Assessment]

## What Went Well
- [Point 1]
- [Point 2]

## What Could Be Improved
- [Point 1]
- [Point 2]

## Action Items
| Priority | Action | Owner | Due Date |
|----------|--------|-------|----------|
| High | [Action] | [Name] | [Date] |

## Lessons Learned
[Key takeaways]
```

---

## 8. Compliance Requirements

### PIPEDA Breach Notification
- **Timeline:** Report to Privacy Commissioner within 72 hours if real risk of significant harm
- **Content:** Nature of breach, PII involved, steps taken, contact info
- **Records:** Keep records of all breaches for 24 months

### SOC2 Incident Documentation
- All SEV-1 and SEV-2 incidents must be documented
- Post-incident reports retained for 7 years
- Evidence of remediation required

---

## Appendix: Quick Reference Commands

```bash
# Check service status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View recent logs
tail -n 200 /var/log/supervisor/backend.err.log

# Check database connectivity
curl -s http://localhost:8001/api/health | python3 -c "import sys,json; print(json.load(sys.stdin))"

# Force terminate all sessions (emergency)
curl -X POST "$API_URL/api/admin/security/cleanup-sessions" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check system resources
top -bn1 | head -20

# Health check
curl -s "$API_URL/api/health/detailed"
```

---

*Document Version: 1.0*
*Last Updated: January 31, 2026*
*Next Review: April 30, 2026*
