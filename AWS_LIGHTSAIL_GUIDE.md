# HR Bank - AWS Lightsail Deployment (Simple Guide)

## 🎯 What You'll Get
- Backend API running on Lightsail Container
- Frontend running on Lightsail Container  
- Both accessible via public URLs
- ~$15-25/month total cost

**Time Required:** 30-45 minutes

---

## Step 1: Open AWS Lightsail (2 mins)

1. Go to: https://lightsail.aws.amazon.com
2. Sign in with your AWS account
3. Click **"Containers"** in the left menu

---

## Step 2: Install AWS CLI & Lightsail Plugin (5 mins)

### On Mac:
```bash
# Install AWS CLI
brew install awscli

# Install Lightsail plugin
sudo curl "https://s3.us-west-2.amazonaws.com/lightsailctl/latest/darwin-amd64/lightsailctl" -o "/usr/local/bin/lightsailctl"
sudo chmod +x /usr/local/bin/lightsailctl
```

### On Windows (PowerShell as Admin):
```powershell
# Download AWS CLI installer from: https://awscli.amazonaws.com/AWSCLIV2.msi
# Run the installer

# Install Lightsail plugin
Invoke-WebRequest -Uri "https://s3.us-west-2.amazonaws.com/lightsailctl/latest/windows-amd64/lightsailctl.exe" -OutFile "C:\Program Files\Amazon\AWSCLIV2\lightsailctl.exe"
```

### Configure AWS CLI:
```bash
aws configure
```
Enter:
- Access Key ID: (from IAM)
- Secret Access Key: (from IAM)  
- Region: `us-east-1`
- Output: `json`

---

## Step 3: Create Container Services (5 mins)

### Via AWS Console (Easier):

1. Go to **Lightsail** → **Containers** → **Create container service**

2. **For Backend:**
   - Service name: `hrbank-backend`
   - Region: `Virginia (us-east-1)`
   - Capacity: **Nano** ($7/month) - 512MB RAM, 0.25 vCPU
   - Scale: 1
   - Click **Create container service**

3. **For Frontend:**
   - Service name: `hrbank-frontend`
   - Same settings as backend
   - Click **Create container service**

Wait 2-3 minutes for services to be created (status: "Ready")

---

## Step 4: Build & Push Docker Images (10 mins)

### Clone your repo (if not already):
```bash
git clone https://github.com/HRBank-Org/HRBankv12.git
cd HRBankv12
```

### Build and Push Backend:
```bash
cd backend

# Build the image
docker build -t hrbank-backend .

# Push to Lightsail
aws lightsail push-container-image \
  --service-name hrbank-backend \
  --label backend \
  --image hrbank-backend:latest
```

**Save the image name** from output (looks like `:hrbank-backend.backend.X`)

### Build and Push Frontend:
```bash
cd ../frontend

# Build with environment variables
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://hrbank-backend.xxxx.us-east-1.cs.amazonlightsail.com \
  -t hrbank-frontend .

# Push to Lightsail  
aws lightsail push-container-image \
  --service-name hrbank-frontend \
  --label frontend \
  --image hrbank-frontend:latest
```

**Save the image name** from output

---

## Step 5: Deploy Backend (10 mins)

1. Go to **Lightsail** → **Containers** → **hrbank-backend**

2. Click **"Create your first deployment"**

3. **Container entry:**
   - Container name: `backend`
   - Image: Select your pushed image (`:hrbank-backend.backend.X`)
   - Open ports: `8001` → `HTTP`

4. **Environment variables** (click "Add environment variable" for each):

```
MONGO_URL = mongodb+srv://your-connection-string
DB_NAME = hrbank_db
JWT_SECRET = your-secret-key-here
FRONTEND_URL = https://hrbank-frontend.xxxx.us-east-1.cs.amazonlightsail.com
BACKEND_URL = https://hrbank-backend.xxxx.us-east-1.cs.amazonlightsail.com
CORS_ORIGINS = https://hrbank-frontend.xxxx.us-east-1.cs.amazonlightsail.com
STRIPE_SECRET_KEY = sk_live_your_key
STRIPE_PUBLISHABLE_KEY = pk_live_your_key
SENDGRID_API_KEY = SG.your_key
SENDGRID_FROM_EMAIL = notifications@hrbank.ca
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
GOOGLE_MAPS_API_KEY = your_maps_key
INFURA_API_KEY = your_infura_key
PINATA_API_KEY = your_pinata_key
PINATA_SECRET_KEY = your_pinata_secret
POLYGON_MAINNET_RPC_URL = https://polygon-mainnet.infura.io/v3/your_key
ISSUER_WALLET_ADDRESS = your_wallet_address
ISSUER_PRIVATE_KEY = your_private_key
EMERGENT_LLM_KEY = your_emergent_key
```

5. **Public endpoint:**
   - Container name: `backend`
   - Port: `8001`

6. Click **"Save and deploy"**

7. Wait 3-5 minutes. Copy the **Public domain** URL.

---

## Step 6: Deploy Frontend (5 mins)

1. Go to **Lightsail** → **Containers** → **hrbank-frontend**

2. Click **"Create your first deployment"**

3. **Container entry:**
   - Container name: `frontend`
   - Image: Select your pushed image
   - Open ports: `80` → `HTTP`

4. **Public endpoint:**
   - Container name: `frontend`
   - Port: `80`

5. Click **"Save and deploy"**

6. Wait 3-5 minutes. Copy the **Public domain** URL.

---

## Step 7: Update URLs & Redeploy (5 mins)

Now that you have both URLs, update the backend:

1. Go to **hrbank-backend** → **Deployments** → **Modify**

2. Update these environment variables with real URLs:
   - `FRONTEND_URL` = Your frontend Lightsail URL
   - `CORS_ORIGINS` = Your frontend Lightsail URL

3. Rebuild and push frontend with correct backend URL:
```bash
cd frontend
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://hrbank-backend.xxxxx.us-east-1.cs.amazonlightsail.com \
  -t hrbank-frontend .

aws lightsail push-container-image \
  --service-name hrbank-frontend \
  --label frontend \
  --image hrbank-frontend:latest
```

4. Update frontend deployment with new image

---

## ✅ Verification Checklist

- [ ] Backend health: `https://your-backend-url/api/health`
- [ ] Frontend loads: `https://your-frontend-url`
- [ ] Can login as employer
- [ ] Can login as workforce

---

## 💰 Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Backend Container | Nano | $7 |
| Frontend Container | Nano | $7 |
| **Total** | | **~$14/month** |

*Upgrade to "Micro" ($12.50/container) if you need more resources*

---

## 🔧 Common Issues

### "Container failed to start"
- Check environment variables are set correctly
- View logs in Lightsail console → Deployments → Logs

### "CORS errors"
- Make sure `CORS_ORIGINS` includes your frontend URL
- No trailing slash in URLs

### "Database connection failed"  
- Add `0.0.0.0/0` to MongoDB Atlas IP whitelist
- Verify `MONGO_URL` is correct

### "502 Bad Gateway"
- Container is still starting (wait 2-3 mins)
- Check if port matches (8001 for backend, 80 for frontend)

---

## 📞 Quick Reference

**Lightsail Console:** https://lightsail.aws.amazon.com

**Your URLs (fill in after deployment):**
- Backend: `https://hrbank-backend.____________.us-east-1.cs.amazonlightsail.com`
- Frontend: `https://hrbank-frontend.____________.us-east-1.cs.amazonlightsail.com`

**Useful Commands:**
```bash
# View container services
aws lightsail get-container-services

# View deployment status
aws lightsail get-container-service-deployments --service-name hrbank-backend

# View logs
aws lightsail get-container-log --service-name hrbank-backend --container-name backend
```
