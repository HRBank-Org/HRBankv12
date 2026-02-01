# HR Bank Disaster Recovery Plan

## Document Control
- **Version:** 1.1
- **Effective Date:** January 28, 2026
- **Last Updated:** January 31, 2026
- **Owner:** Engineering & Operations Team
- **Review Frequency:** Annual (or after any disaster event)
- **Last Tested:** January 31, 2026 (Tabletop Exercise - PASS)

---

## 1. Executive Summary

This Disaster Recovery Plan (DRP) ensures business continuity for HR Bank in the event of system failures, data loss, or infrastructure disasters. It defines recovery objectives, procedures, and responsibilities.

### Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | 4 hours | Maximum acceptable downtime |
| **RPO** (Recovery Point Objective) | 1 hour | Maximum acceptable data loss |
| **MTTR** (Mean Time to Recovery) | 2 hours | Average recovery time target |

---

## 2. System Architecture Overview

### Production Environment
- **Cloud Provider:** AWS (Primary: us-east-1)
- **Deployment:** AWS Lightsail Container Service
- **Database:** MongoDB Atlas (M10+ cluster)
- **DNS:** Route 53
- **CDN/SSL:** Cloudflare

### Critical Components

| Component | Technology | Recovery Priority |
|-----------|------------|-------------------|
| Database | MongoDB Atlas | P0 - Critical |
| Backend API | FastAPI (Python) | P0 - Critical |
| Frontend | React SPA | P1 - High |
| File Storage | S3 | P1 - High |
| Email Service | SendGrid | P2 - Medium |
| SMS Service | Twilio | P2 - Medium |
| Payment Processing | Stripe | P2 - Medium |

---

## 3. Backup Strategy

### 3.1 Database Backups (MongoDB Atlas)

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Continuous Backup | Real-time | 24 hours point-in-time | Atlas Cloud |
| Daily Snapshots | Every 24 hours | 7 days | Atlas Cloud |
| Weekly Snapshots | Every 7 days | 4 weeks | Atlas Cloud |
| Monthly Snapshots | Monthly | 12 months | Atlas Cloud + S3 |

**MongoDB Atlas Features:**
- Automated continuous backups with point-in-time recovery
- Cross-region replication (planned)
- Encrypted at rest (AES-256)

### 3.2 Application Code Backups

| Component | Method | Location | Retention |
|-----------|--------|----------|-----------|
| Source Code | Git | GitHub | Indefinite |
| Docker Images | Container Registry | AWS ECR | 30 versions |
| Configuration | Encrypted backup | S3 | 90 days |
| Environment Variables | Secrets Manager | AWS | Current + 1 previous |

### 3.3 Data Export Schedule

| Data Type | Frequency | Format | Destination |
|-----------|-----------|--------|-------------|
| User Data | Daily | JSON | S3 (encrypted) |
| Financial Records | Daily | CSV | S3 (encrypted) |
| Audit Logs | Daily | JSON | S3 (encrypted) |
| Credentials | Daily | JSON | S3 (encrypted) |

---

## 4. Disaster Scenarios & Response

### Scenario 1: Database Failure

**Symptoms:**
- API returns 500 errors
- "Database connection failed" in logs
- MongoDB Atlas alerts triggered

**Recovery Steps:**
1. Verify issue via MongoDB Atlas dashboard
2. Check Atlas status page for outages
3. If Atlas issue: Wait for Atlas resolution, enable maintenance mode
4. If connection issue: 
   - Verify network connectivity
   - Check IP whitelist
   - Rotate database credentials if compromised
5. If data corruption:
   - Initiate point-in-time recovery
   - Select recovery point (within RPO)
   - Create new cluster from backup
   - Update connection strings
6. Verify data integrity
7. Resume operations

**Estimated Recovery Time:** 30 minutes - 2 hours

### Scenario 2: Complete Infrastructure Failure

**Symptoms:**
- Website unreachable
- All services down
- AWS status shows regional outage

**Recovery Steps:**
1. Activate incident response team
2. Enable maintenance page (Cloudflare)
3. Assess scope of failure
4. If regional outage:
   - Deploy to secondary region (us-west-2)
   - Update DNS to point to DR site
5. If Lightsail issue:
   - Redeploy containers
   - Restore from latest working image
6. Restore database connection
7. Verify all services operational
8. Remove maintenance page
9. Monitor for 24 hours

**Estimated Recovery Time:** 2 - 4 hours

### Scenario 3: Security Breach / Data Compromise

**Symptoms:**
- Unusual activity in audit logs
- External breach notification
- Security alerts triggered

**Recovery Steps:**
1. Activate incident response team
2. Isolate affected systems
3. Revoke all API keys and tokens
4. Force logout all users (terminate all sessions)
5. Reset database credentials
6. Deploy from known-good backup
7. Restore data from pre-breach backup
8. Conduct forensic analysis
9. Notify affected users (if data breach)
10. File regulatory reports as required
11. Implement additional security controls
12. Resume operations with monitoring

**Estimated Recovery Time:** 4 - 24 hours

### Scenario 4: Third-Party Service Failure

**Symptoms:**
- Stripe payments failing
- SendGrid emails not sending
- Twilio SMS not delivering

**Recovery Steps:**
1. Identify failing service
2. Check service status page
3. Enable graceful degradation:
   - Stripe: Queue payments, show "processing" status
   - SendGrid: Log emails for retry
   - Twilio: Skip SMS, rely on email OTP only
4. Notify users of temporary limitations
5. Monitor service restoration
6. Process queued operations
7. Resume normal operations

**Estimated Recovery Time:** 1 - 4 hours

---

## 5. Recovery Procedures

### 5.1 Database Recovery from Backup

```bash
# MongoDB Atlas Point-in-Time Recovery
# Via Atlas UI:
# 1. Navigate to Clusters > ... > Restore
# 2. Select "Point in Time" 
# 3. Choose timestamp within RPO
# 4. Select target cluster
# 5. Begin restore

# After restore, update application:
# 1. Update MONGO_URL in backend/.env
# 2. Restart backend service
# 3. Verify connectivity
```

### 5.2 Application Redeployment

```bash
# Redeploy from GitHub
# 1. SSH to Lightsail instance
# 2. Pull latest code
git pull origin main

# 3. Rebuild and restart
docker-compose build
docker-compose up -d

# 4. Verify services
curl https://vault.hrbank.ca/api/health
```

### 5.3 DNS Failover

```bash
# Route 53 Health Check Failover
# Primary: vault.hrbank.ca -> us-east-1 IP
# Secondary: vault.hrbank.ca -> us-west-2 IP

# Manual failover:
# 1. Log into AWS Route 53
# 2. Navigate to Hosted Zone
# 3. Update A record to DR site IP
# 4. Set TTL to 60 seconds during incident
```

### 5.4 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary On-Call | Qasim Nizami | +1-519-999-0001 | oncall@hrbank.ca |
| Engineering Lead | HR Bank Engineering | +1-519-999-0002 | engineering@hrbank.ca |
| Database Admin | HR Bank DBA | +1-519-999-0005 | dba@hrbank.ca |
| AWS Support | - | - | AWS Support Console |
| MongoDB Atlas Support | - | - | Atlas Support Portal |

---

## 6. Communication Plan

### Internal Communication

| Event | Notify | Channel | Timeline |
|-------|--------|---------|----------|
| Service Degradation | Engineering Team | Slack #incidents | Immediate |
| Major Outage | All Staff | Slack + Email | 15 minutes |
| Security Incident | Leadership + Security | Phone + Encrypted Email | Immediate |

### External Communication

| Event | Notify | Channel | Timeline |
|-------|--------|---------|----------|
| Planned Maintenance | All Users | Email + Banner | 48 hours before |
| Unplanned Outage | All Users | Status Page + Email | 30 minutes |
| Security Breach | Affected Users | Email | 72 hours (legal req) |

### Status Page
- URL: status.hrbank.ca (planned)
- Updates: Every 30 minutes during incidents

---

## 7. Testing Schedule

### DR Test Types

| Test Type | Frequency | Description |
|-----------|-----------|-------------|
| Tabletop Exercise | Quarterly | Walk through scenarios verbally |
| Backup Restoration | Monthly | Restore backup to test environment |
| Failover Test | Semi-annually | Test DR site activation |
| Full DR Drill | Annually | Complete disaster simulation |

### Test Documentation
- All tests must be documented
- Include: Date, participants, scenario, results, lessons learned
- Store in: `/app/docs/dr-test-reports/`

---

## 8. Post-Incident Review

After every disaster or DR test:

1. **Incident Timeline** - Document what happened and when
2. **Response Analysis** - What worked, what didn't
3. **Root Cause** - Why did this happen?
4. **Impact Assessment** - Users affected, data lost, revenue impact
5. **Action Items** - Improvements to prevent recurrence
6. **Plan Updates** - Update this DRP as needed

---

## 9. Compliance Considerations

### SOC2 Requirements
- Annual DR testing documented
- Backup verification logs maintained
- Recovery procedures reviewed quarterly
- Access controls during recovery

### PIPEDA Requirements
- Data breach notification within 72 hours
- Maintain records of recovery actions
- Ensure encrypted backups

---

## 10. Document Maintenance

| Action | Frequency | Responsible |
|--------|-----------|-------------|
| Review & Update DRP | Quarterly | Engineering Lead |
| Update Contact List | Monthly | Operations |
| Verify Backup Status | Weekly | DBA |
| Test Recovery Scripts | Monthly | DevOps |

---

## Appendix A: Quick Reference Card

### Critical URLs
- Production: https://vault.hrbank.ca
- MongoDB Atlas: https://cloud.mongodb.com
- AWS Console: https://console.aws.amazon.com
- Cloudflare: https://dash.cloudflare.com
- Status Page: https://status.hrbank.ca (planned)

### Emergency Commands
```bash
# Check service health
curl https://vault.hrbank.ca/api/health/detailed

# Force restart backend
sudo supervisorctl restart backend

# View recent logs
tail -n 100 /var/log/supervisor/backend.err.log

# Enable maintenance mode
# (Update Cloudflare Page Rule)
```

---

*Document Version: 1.0*
*Last Updated: January 28, 2026*
*Next Review: April 28, 2026*
