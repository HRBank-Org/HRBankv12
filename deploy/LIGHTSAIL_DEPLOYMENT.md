# HR Bank — AWS Lightsail Container Service Deployment (Two-Container)

## Architecture
Two separate Docker containers managed via Lightsail Container Service GUI:
- **Frontend**: nginx serving React build + proxying `/api/` to backend
- **Backend**: FastAPI (uvicorn) on port 8001

Both containers share `localhost` networking inside Lightsail Container Service.

---

## Docker Hub Images
- `qnizami/hrbank-frontend:latest`
- `qnizami/hrbank-backend:latest`

---

## Step 1: Save Code to GitHub

Use the **"Save to GitHub"** button in the Emergent chat input.

---

## Step 2: Build Both Images (Docker Desktop on your local machine)

```bash
# Clone/pull the latest code
git clone https://github.com/YOUR_REPO/hrbank.git
cd hrbank

# Build FRONTEND image
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca \
  -t qnizami/hrbank-frontend:latest \
  ./frontend

# Build BACKEND image
docker build \
  -t qnizami/hrbank-backend:latest \
  ./backend
```

---

## Step 3: Push Both Images to Docker Hub

```bash
docker login -u qnizami

docker push qnizami/hrbank-frontend:latest
docker push qnizami/hrbank-backend:latest
```

---

## Step 4: Deploy via Lightsail Console GUI

1. Go to **AWS Lightsail Console** → **Containers**
2. Select your container service (or create one: **Medium** power recommended)
3. Click **"Create deployment"** (or **"Modify"** existing)

### Container 1: Backend
| Field | Value |
|-------|-------|
| Container name | `hrbank-backend` |
| Image | `qnizami/hrbank-backend:latest` |
| Port | `8001` (HTTP) |

**Environment variables** (set in the GUI):
```
MONGO_URL = mongodb+srv://USER:PASS@cluster.mongodb.net/hrbank_db
DB_NAME = hrbank_db
JWT_SECRET = YOUR_64_CHAR_SECRET
CORS_ORIGINS = https://hrbank.ca
FRONTEND_URL = https://hrbank.ca
BACKEND_URL = https://hrbank.ca
SENDGRID_API_KEY = SG.xxxxx
SENDGRID_FROM_EMAIL = notifications@hrbank.ca
GOOGLE_MAPS_API_KEY = AIzaSy...
GOOGLE_OAUTH_CLIENT_ID = 275785...
GOOGLE_OAUTH_CLIENT_SECRET = GOCSPX-...
GOOGLE_CLIENT_ID = 275785...
GOOGLE_CLIENT_SECRET = GOCSPX-...
STRIPE_API_KEY = sk_live_...
STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_SECRET_KEY = sk_live_...
TWILIO_ACCOUNT_SID = AC...
TWILIO_AUTH_TOKEN = ...
TWILIO_PHONE_NUMBER = +15137887844
ISSUER_WALLET_ADDRESS = 0x3d382B...
ISSUER_PRIVATE_KEY = 742dbb...
PINATA_API_KEY = de53a4...
PINATA_SECRET_KEY = 46b29a...
INFURA_API_KEY = 41c040...
POLYGON_MAINNET_RPC_URL = https://polygon-mainnet.infura.io/v3/...
BLOCKCHAIN_NETWORK = polygon_mainnet
VAPID_PUBLIC_KEY = BGky2h...
VAPID_PRIVATE_KEY = -HyjmD...
VAPID_CLAIMS_EMAIL = notifications@hrbank.ca
LINKEDIN_CLIENT_ID = 86dlbd...
LINKEDIN_CLIENT_SECRET = WPL_AP1...
GOOGLE_DISTANCE_MATRIX_API_KEY = AIzaSy...
GOOGLE_TIMEZONE_API_KEY = AIzaSy...
```

### Container 2: Frontend
| Field | Value |
|-------|-------|
| Container name | `hrbank-frontend` |
| Image | `qnizami/hrbank-frontend:latest` |
| Port | `80` (HTTP) |

No environment variables needed (all baked into the build).

### Public Endpoint
| Field | Value |
|-------|-------|
| Container | `hrbank-frontend` |
| Port | `80` |
| Health check path | `/health` |

4. Click **"Save and deploy"**

---

## Step 5: Verify

```bash
curl https://hrbank.ca/api/health
```

Expected:
```json
{"status": "healthy", "database": "connected", "service": "HR Bank API"}
```

---

## Quick Update Workflow

When you make code changes and want to redeploy:

### Update Frontend only:
```bash
# On your local machine
docker build --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca -t qnizami/hrbank-frontend:latest ./frontend
docker push qnizami/hrbank-frontend:latest
```
Then in Lightsail GUI → Modify deployment → Save (it pulls the latest image).

### Update Backend only:
```bash
# On your local machine
docker build -t qnizami/hrbank-backend:latest ./backend
docker push qnizami/hrbank-backend:latest
```
Then in Lightsail GUI → Modify deployment → Save.

### Update Both:
```bash
docker build --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca -t qnizami/hrbank-frontend:latest ./frontend
docker build -t qnizami/hrbank-backend:latest ./backend
docker push qnizami/hrbank-frontend:latest
docker push qnizami/hrbank-backend:latest
```
Then in Lightsail GUI → Modify deployment → Save.

---

## Custom Domain + SSL

1. In Lightsail Container Service → **Custom domains**
2. Click **Create certificate** → Enter `hrbank.ca`
3. Add the DNS validation CNAME record
4. Once validated, attach the certificate
5. Add a CNAME record: `hrbank.ca` → your Lightsail container service URL

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend loads but API calls fail | Check that backend container is running, verify env vars |
| 502 on API calls | Backend hasn't started — check container logs in GUI |
| Login not working | Verify `JWT_SECRET` matches, check DB `password_hash` |
| OAuth redirect fails | `FRONTEND_URL` must match your domain exactly |
| Blockchain errors | Check wallet MATIC balance, verify Infura key |
| Image pull fails | Ensure images are public on Docker Hub, or use access token |
| CSS/styles look wrong | Rebuild frontend with correct `REACT_APP_BACKEND_URL` |

---

## Estimated Costs

| Service | Monthly Cost |
|---------|-------------|
| Lightsail Container Service (Medium) | $40 |
| MongoDB Atlas M10 | $57 |
| Custom Domain + SSL | Free |
| **Total** | ~$97/month |
