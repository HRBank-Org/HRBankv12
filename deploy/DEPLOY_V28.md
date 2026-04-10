# HR Bank — v28 Deployment Guide
# AWS Lightsail Container Service (Two-Container)

## What's New in v28
- **Cohort End-Date Notification Scheduler** — auto-reminds institutions to issue credentials
- **Workforce Notifications** — in-app + email on credential receipt, enrollment, and invites
- **19 Languages** — expanded from 7, with browser auto-detect and backend sync
- **Bug Fix** — institution profile lookup for credential authorization
- **Bug Fix** — institution type corrected for SafestWork (training_center)

---

## Architecture
Two Docker containers in one Lightsail Container Service:
- **Frontend** (`hrbank-frontend`): nginx → React build + proxies `/api/` to backend
- **Backend** (`hrbank-backend`): FastAPI (uvicorn) on port 8001

Both share `localhost` networking inside Lightsail.

---

## Step 1: Save Code to GitHub

Use **"Save to GitHub"** in the Emergent chat input.

---

## Step 2: Pull Latest Code (on your local machine)

```bash
cd hrbank          # or wherever your repo lives
git pull origin main
```

---

## Step 3: Build Both Images

```bash
# Build FRONTEND (bakes in production URL)
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca \
  -t qaisijoe/hrbank-frontend:v28 \
  ./frontend

# Build BACKEND
docker build \
  -t qaisijoe/hrbank-backend:v28 \
  ./backend
```

---

## Step 4: Push to Docker Hub

```bash
docker login -u qaisijoe

docker push qaisijoe/hrbank-frontend:v28
docker push qaisijoe/hrbank-backend:v28
```

---

## Step 5: Deploy via Lightsail Console

1. Go to **AWS Lightsail Console** → **Containers** → `hrbank-backend` service
2. Click **"Modify your deployment"**

### Update Container 1: Backend
| Field | Value |
|-------|-------|
| Image | `qaisijoe/hrbank-backend:v28` |

Environment variables — **no changes needed** (same as v27).

### Update Container 2: Frontend
| Field | Value |
|-------|-------|
| Image | `qaisijoe/hrbank-frontend:v28` |

3. Click **"Save and deploy"**
4. Wait ~5 minutes for deployment to complete

---

## Step 6: Verify

```bash
# API health
curl https://hrbank.ca/api/health

# Test notification system
curl https://hrbank.ca/api/notifications/my-notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test language endpoint
curl -X PUT https://hrbank.ca/api/users/preferred-language \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"preferred_language":"fr"}'
```

---

## Quick Reference — Docker Commands

```bash
# Full rebuild + push (both containers)
docker build --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca -t qaisijoe/hrbank-frontend:v28 ./frontend && \
docker build -t qaisijoe/hrbank-backend:v28 ./backend && \
docker push qaisijoe/hrbank-frontend:v28 && \
docker push qaisijoe/hrbank-backend:v28
```

Then: Lightsail Console → Modify → update image tags to `:v28` → Save and deploy.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cohort notifications not sending | Check backend logs in Lightsail, verify SENDGRID_API_KEY |
| Language selector shows only 7 | Frontend image not updated — rebuild with v28 |
| Credential issuance blocked | Institution type must be `training_center` (not `other`) |
| 502 on deploy | Backend startup failed — check Lightsail container logs |
