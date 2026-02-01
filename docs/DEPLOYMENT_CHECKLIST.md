# HR Bank - Production Deployment Checklist

## Overview
This document provides a comprehensive checklist for deploying HR Bank to production. Follow each section carefully to ensure a successful deployment.

---

## 1. Environment Variables

### Backend (`/app/backend/.env`)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGO_URL` | MongoDB connection string | ✅ | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Database name | ✅ | `hrbank_production` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | ✅ | `your-super-secret-key-min-32-characters` |
| `JWT_ALGORITHM` | JWT signing algorithm | ✅ | `HS256` |
| `SENDGRID_API_KEY` | SendGrid API key for emails | ✅ | `SG.xxxx` |
| `SENDGRID_FROM_EMAIL` | Verified sender email | ✅ | `noreply@hrbank.ca` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | ✅ | `ACxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | ✅ | `xxxx` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | ✅ | `+1234567890` |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ | `sk_live_xxxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ | `whsec_xxxx` |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect OAuth client ID | ✅ | `ca_xxxx` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ | `GOCSPX-xxxx` |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | ⚠️ Optional | `xxxx` |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret | ⚠️ Optional | `xxxx` |
| `PINATA_API_KEY` | Pinata IPFS API key | ✅ | `xxxx` |
| `PINATA_SECRET_KEY` | Pinata IPFS secret | ✅ | `xxxx` |
| `INFURA_PROJECT_ID` | Infura project ID for blockchain | ✅ | `xxxx` |
| `POLYGON_PRIVATE_KEY` | Wallet private key for blockchain | ✅ | `0xxxxx` |
| `CONTRACT_ADDRESS` | Deployed smart contract address | ✅ | `0xxxxx` |
| `ENCRYPTION_KEY` | AES-256 encryption key (32 bytes base64) | ✅ | `xxxx` |
| `CORS_ORIGINS` | Allowed CORS origins | ✅ | `https://hrbank.ca,https://www.hrbank.ca` |

### Frontend (`/app/frontend/.env`)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | ✅ | `https://api.hrbank.ca` |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ | `xxxx.apps.googleusercontent.com` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps API key | ⚠️ Optional | `AIzaxxxx` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | ✅ | `pk_live_xxxx` |

---

## 2. External Services Setup

### 2.1 MongoDB Atlas
- [ ] Create production cluster (M10+ recommended)
- [ ] Enable encryption at rest
- [ ] Configure IP whitelist for production servers
- [ ] Create database user with least privilege
- [ ] Enable audit logging
- [ ] Set up automated backups (daily, 7-day retention minimum)

### 2.2 SendGrid
- [ ] Verify sender domain (DNS records)
- [ ] Create API key with Mail Send permission only
- [ ] Set up email templates (optional)
- [ ] Configure bounce/spam webhook (optional)

### 2.3 Twilio
- [ ] Purchase production phone number
- [ ] Verify caller ID
- [ ] Set up usage alerts
- [ ] Configure geographic permissions

### 2.4 Stripe
- [ ] Complete business verification
- [ ] Enable Stripe Connect (for employer payouts)
- [ ] Configure webhook endpoint: `https://api.hrbank.ca/api/payments/webhook`
- [ ] Set up webhook events: `payment_intent.succeeded`, `checkout.session.completed`, `account.updated`

### 2.5 Google Cloud
- [ ] Create OAuth 2.0 credentials
- [ ] Configure authorized redirect URIs
- [ ] Enable Google Maps API (if using GPS features)
- [ ] Set up API key restrictions

### 2.6 Pinata (IPFS)
- [ ] Create API keys
- [ ] Set up pinning policy
- [ ] Configure gateway (optional custom domain)

### 2.7 Infura/Polygon
- [ ] Create Infura project
- [ ] Fund wallet with MATIC for gas fees
- [ ] Deploy smart contract to Polygon mainnet
- [ ] Verify contract on Polygonscan

---

## 3. Infrastructure Requirements

### 3.1 Compute
- **Backend**: 2 vCPU, 4GB RAM minimum (Node: 4 vCPU, 8GB recommended)
- **Frontend**: Static hosting (Vercel, Netlify, CloudFront)
- **Workers**: 1 vCPU, 2GB RAM for background jobs

### 3.2 Database
- **MongoDB**: M10+ cluster with 10GB+ storage
- **Redis**: 1GB for session/cache (optional but recommended)

### 3.3 Networking
- [ ] SSL/TLS certificates (Let's Encrypt or commercial)
- [ ] CDN for static assets
- [ ] DDoS protection (Cloudflare recommended)
- [ ] WAF rules configured

### 3.4 DNS Configuration
```
hrbank.ca          A      → Load balancer IP
www.hrbank.ca      CNAME  → hrbank.ca
api.hrbank.ca      A      → Backend server IP
```

---

## 4. Security Checklist

### 4.1 Application Security
- [ ] All secrets stored in environment variables (not in code)
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation on all user inputs
- [ ] SQL/NoSQL injection prevention verified
- [ ] XSS prevention (React handles by default)
- [ ] CSRF protection enabled

### 4.2 Infrastructure Security
- [ ] Firewall rules: only 80/443 exposed
- [ ] SSH key-based authentication only
- [ ] Fail2ban or equivalent configured
- [ ] Security groups/network policies configured
- [ ] No debug endpoints in production

### 4.3 Data Security
- [ ] Database encryption at rest enabled
- [ ] TLS for all connections (MongoDB, Redis, APIs)
- [ ] PII encryption using AES-256
- [ ] Audit logging enabled
- [ ] Backup encryption enabled

### 4.4 Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] PIPEDA compliance verified
- [ ] Data retention policies configured

---

## 5. Monitoring & Observability

### 5.1 Application Monitoring
- [ ] Error tracking (Sentry recommended)
- [ ] APM configured (New Relic, Datadog, or similar)
- [ ] Custom metrics for business KPIs

### 5.2 Infrastructure Monitoring
- [ ] CPU/Memory/Disk alerts configured
- [ ] Database connection pool monitoring
- [ ] API latency monitoring
- [ ] Uptime monitoring (status page)

### 5.3 Logging
- [ ] Centralized logging (ELK, CloudWatch, etc.)
- [ ] Log retention: 90 days minimum, 7 years for audit logs
- [ ] Sensitive data redacted from logs

### 5.4 Alerting
- [ ] On-call rotation configured
- [ ] Escalation policies defined
- [ ] Alert channels: Slack, PagerDuty, email

---

## 6. Deployment Process

### 6.1 Pre-Deployment
```bash
# 1. Run tests
cd /app/backend && pytest
cd /app/frontend && yarn test

# 2. Lint code
cd /app/backend && ruff check .
cd /app/frontend && yarn lint

# 3. Build frontend
cd /app/frontend && yarn build

# 4. Database migrations (if any)
cd /app/backend && python migrations/run.py
```

### 6.2 Deployment Commands
```bash
# Backend (Docker)
docker build -t hrbank-backend:v1.0.0 -f Dockerfile.backend .
docker push registry.hrbank.ca/hrbank-backend:v1.0.0

# Frontend (Static)
cd /app/frontend
yarn build
# Upload build/ to CDN/static hosting

# Database indexes
cd /app/backend && python scripts/create_indexes.py
```

### 6.3 Post-Deployment Verification
- [ ] Health check endpoint returns 200: `GET /api/health`
- [ ] Login flow works end-to-end
- [ ] Payment flow works (test mode first)
- [ ] Email delivery verified
- [ ] SMS delivery verified
- [ ] Blockchain transactions working

---

## 7. Rollback Procedure

### 7.1 Quick Rollback
```bash
# Revert to previous Docker image
docker pull registry.hrbank.ca/hrbank-backend:v0.9.0
docker-compose up -d

# Revert frontend
# Deploy previous build from CDN backup
```

### 7.2 Database Rollback
```bash
# Restore from backup (MongoDB Atlas)
# 1. Go to Atlas Console → Backups
# 2. Select point-in-time or snapshot
# 3. Restore to new cluster, then swap connection string
```

---

## 8. Launch Day Checklist

### Morning of Launch
- [ ] All team members on standby
- [ ] Monitoring dashboards open
- [ ] Communication channels ready (Slack/Discord)
- [ ] Customer support briefed

### Deployment
- [ ] Deploy backend first
- [ ] Verify API health
- [ ] Deploy frontend
- [ ] Verify full flow
- [ ] Enable production traffic

### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check database performance
- [ ] Review user feedback
- [ ] Document any issues

---

## 9. Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | TBD | TBD |
| DevOps | TBD | TBD |
| Database Admin | TBD | TBD |
| Security | TBD | TBD |

---

## 10. Post-Launch Tasks

### Week 1
- [ ] Complete penetration testing
- [ ] Update SOC2 badge to "Certified" after audit
- [ ] Performance optimization based on real traffic
- [ ] User feedback collection

### Month 1
- [ ] First security audit review
- [ ] Database optimization
- [ ] Cost optimization
- [ ] Feature prioritization based on usage data

---

*Document Version: 1.0*
*Last Updated: February 1, 2026*
*Next Review: Post-Launch*
