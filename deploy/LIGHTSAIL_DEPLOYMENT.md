# HR Bank — AWS Lightsail Deployment via Docker Desktop

## Architecture
Single Docker container running both frontend (nginx) and backend (FastAPI) managed by supervisor.
Deployed to an AWS Lightsail **Ubuntu Instance** behind an AWS **Load Balancer** with SSL.

---

## Prerequisites
- **Docker Desktop** installed on your local machine
- **Docker Hub** account (you: `qnizami`)
- AWS Lightsail Ubuntu instance running with Docker installed
- SSH access to the instance
- MongoDB Atlas connection string

---

## Step 1: Save Code to GitHub

Use the **"Save to GitHub"** button in the Emergent chat input to push the latest code.

---

## Step 2: Build the Docker Image (on your local machine)

Open a terminal in Docker Desktop or PowerShell/Terminal:

```bash
# Clone your repo (or pull latest)
git clone https://github.com/YOUR_REPO/hrbank.git
cd hrbank

# Build the image with your production URL
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca \
  -t qnizami/hrbank:latest .
```

> **Note:** Replace `https://hrbank.ca` with your actual production domain.
> The build takes ~3-5 minutes (installs Node + Python deps, builds React app).

---

## Step 3: Push to Docker Hub

```bash
# Login to Docker Hub (if not already)
docker login -u qnizami

# Push the image
docker push qnizami/hrbank:latest
```

---

## Step 4: Deploy on Lightsail Instance

SSH into your Lightsail Ubuntu instance:

```bash
ssh -i LightsailDefaultKey-ca-central-1.pem ubuntu@YOUR_LIGHTSAIL_IP
```

Then on the instance:

```bash
# Pull the latest image
docker pull qnizami/hrbank:latest

# Stop the old container (if running)
docker stop hrbank 2>/dev/null
docker rm hrbank 2>/dev/null

# Create/update the .env file with production values
cat > /home/ubuntu/.env << 'EOF'
MONGO_URL=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/hrbank_db
DB_NAME=hrbank_db
JWT_SECRET=YOUR_JWT_SECRET
CORS_ORIGINS=https://hrbank.ca
FRONTEND_URL=https://hrbank.ca
BACKEND_URL=https://hrbank.ca
SENDGRID_API_KEY=YOUR_KEY
SENDGRID_FROM_EMAIL=notifications@hrbank.ca
GOOGLE_MAPS_API_KEY=YOUR_KEY
GOOGLE_OAUTH_CLIENT_ID=YOUR_KEY
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_KEY
GOOGLE_CLIENT_ID=YOUR_KEY
GOOGLE_CLIENT_SECRET=YOUR_KEY
STRIPE_API_KEY=YOUR_KEY
STRIPE_PUBLISHABLE_KEY=YOUR_KEY
STRIPE_SECRET_KEY=YOUR_KEY
TWILIO_ACCOUNT_SID=YOUR_KEY
TWILIO_AUTH_TOKEN=YOUR_KEY
TWILIO_PHONE_NUMBER=YOUR_NUMBER
ISSUER_WALLET_ADDRESS=YOUR_ADDRESS
ISSUER_PRIVATE_KEY=YOUR_KEY
PINATA_API_KEY=YOUR_KEY
PINATA_SECRET_KEY=YOUR_KEY
INFURA_API_KEY=YOUR_KEY
POLYGON_MAINNET_RPC_URL=YOUR_URL
BLOCKCHAIN_NETWORK=polygon_mainnet
VAPID_PUBLIC_KEY=YOUR_KEY
VAPID_PRIVATE_KEY=YOUR_KEY
VAPID_CLAIMS_EMAIL=notifications@hrbank.ca
LINKEDIN_CLIENT_ID=YOUR_KEY
LINKEDIN_CLIENT_SECRET=YOUR_KEY
EOF

# Run the new container
docker run -d \
  --name hrbank \
  --restart unless-stopped \
  -p 80:80 \
  --env-file /home/ubuntu/.env \
  -v hrbank-uploads:/app/backend/uploads \
  qnizami/hrbank:latest
```

---

## Step 5: Verify Deployment

```bash
# Check container is running
docker ps

# Check health endpoint
curl http://localhost/api/health

# Check logs if needed
docker logs hrbank --tail 50
```

Expected health response:
```json
{"status": "healthy", "database": "connected", "service": "HR Bank API"}
```

---

## Quick Update Workflow (future deploys)

Once set up, updating is just 3 commands:

**On your local machine:**
```bash
docker build --build-arg REACT_APP_BACKEND_URL=https://hrbank.ca -t qnizami/hrbank:latest .
docker push qnizami/hrbank:latest
```

**On your Lightsail instance:**
```bash
docker pull qnizami/hrbank:latest && docker stop hrbank && docker rm hrbank && docker run -d --name hrbank --restart unless-stopped -p 80:80 --env-file /home/ubuntu/.env -v hrbank-uploads:/app/backend/uploads qnizami/hrbank:latest
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Container won't start | `docker logs hrbank` to see errors |
| MongoDB connection error | Check Atlas IP whitelist includes Lightsail IP |
| 502 Bad Gateway | Backend hasn't started yet — wait 30s, check `docker logs hrbank` |
| CSS/styles missing | Rebuild with correct `REACT_APP_BACKEND_URL` |
| Blockchain errors | Check wallet balance, Infura key validity |
| Login not working | Verify `JWT_SECRET` matches, check `password_hash` in DB |

---

## Important Notes
- The `.env` file on the server should have your **production** values (not the preview ones)
- The `GOOGLE_OAUTH_REDIRECT_URI` and `LINKEDIN_REDIRECT_URI` will be auto-derived from the request URL (dynamic redirect) — no need to set them
- Uploads persist in the `hrbank-uploads` Docker volume across container restarts
- The Load Balancer handles HTTPS/SSL — the container only needs to expose port 80
