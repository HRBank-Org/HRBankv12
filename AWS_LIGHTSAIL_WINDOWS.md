# HR Bank - AWS Lightsail Deployment (Windows Guide)

## 🎯 What You'll Get
- Backend API running on Lightsail Container
- Frontend running on Lightsail Container  
- Both accessible via public URLs
- ~$14/month total cost

**Time Required:** 30-45 minutes

---

## Step 1: Install Required Tools (10 mins)

### 1A. Install Docker Desktop

1. Download: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
2. Run the installer
3. Restart your computer when prompted
4. Open Docker Desktop and wait for it to start (whale icon in taskbar turns steady)

### 1B. Install AWS CLI

1. Download: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer, click Next through all steps
3. Open **PowerShell** (search "PowerShell" in Start menu)
4. Verify installation:
```powershell
aws --version
```
Should show: `aws-cli/2.x.x Windows/10...`

### 1C. Install Lightsail Plugin

Open **PowerShell as Administrator** (right-click → Run as Administrator):
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "C:\Program Files\Amazon\AWSCLIV2"

# Download lightsailctl
Invoke-WebRequest -Uri "https://s3.us-west-2.amazonaws.com/lightsailctl/latest/windows-amd64/lightsailctl.exe" -OutFile "C:\Program Files\Amazon\AWSCLIV2\lightsailctl.exe"

# Verify it works
lightsailctl --version
```

---

## Step 2: Create AWS Access Keys (5 mins)

1. Go to: https://console.aws.amazon.com/iam/
2. Click **Users** → **Create user**
3. User name: `hrbank-deploy` → **Next**
4. Select **Attach policies directly**
5. Search and check these policies:
   - `AmazonLightsailFullAccess`
6. Click **Next** → **Create user**
7. Click on the user → **Security credentials** → **Create access key**
8. Select **Command Line Interface (CLI)** → **Next** → **Create access key**
9. **SAVE BOTH KEYS** (you won't see them again!)

---

## Step 3: Configure AWS CLI (2 mins)

Open **PowerShell** and run:
```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID: AKIA________________ (paste your key)
AWS Secret Access Key: ________________ (paste your secret)
Default region name: us-east-1
Default output format: json
```

Test it works:
```powershell
aws lightsail get-container-services
```
Should return `[]` or list of services (not an error)

---

## Step 4: Clone Your Repository (2 mins)

```powershell
# Go to a folder where you want the code
cd C:\Users\YourName\Documents

# Clone the repo
git clone https://github.com/HRBank-Org/HRBankv12.git

# Enter the folder
cd HRBankv12
```

---

## Step 5: Create Lightsail Container Services (5 mins)

### Option A: Using AWS Console (Easier)

1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/containers
2. Click **Create container service**
3. Fill in:
   - **Location:** Virginia (us-east-1)
   - **Capacity:** Nano (512 MB RAM, 0.25 vCPUs) - $7/month
   - **Scale:** 1
   - **Service name:** `hrbank-backend`
4. Click **Create container service**
5. **Repeat** for `hrbank-frontend`

Wait 2-3 minutes until both show **"Ready"** status.

### Option B: Using PowerShell
```powershell
# Create backend service
aws lightsail create-container-service --service-name hrbank-backend --power nano --scale 1 --region us-east-1

# Create frontend service  
aws lightsail create-container-service --service-name hrbank-frontend --power nano --scale 1 --region us-east-1
```

---

## Step 6: Build & Push Backend (10 mins)

Open **PowerShell** in your project folder:

```powershell
# Make sure Docker Desktop is running!

# Go to backend folder
cd C:\Users\YourName\Documents\HRBankv12\backend

# Build the Docker image
docker build -t hrbank-backend .

# Push to Lightsail (this takes 2-3 mins)
aws lightsail push-container-image --service-name hrbank-backend --label backend --image hrbank-backend:latest --region us-east-1
```

**IMPORTANT:** Copy the image name from the output. It looks like:
```
:hrbank-backend.backend.1
```

---

## Step 7: Deploy Backend in Console (10 mins)

1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/containers
2. Click **hrbank-backend**
3. Click **Create your first deployment** (or **Deployments** → **Create deployment**)

4. **Container 1:**
   - Container name: `backend`
   - Image: Choose **Stored images** → Select your pushed image
   - Add open port: `8001` → Protocol: `HTTP`

5. **Add Environment Variables** (click **Add environment variable** for each):

| Variable | Value |
|----------|-------|
| `MONGO_URL` | `mongodb+srv://username:password@cluster.mongodb.net/hrbank_db` |
| `DB_NAME` | `hrbank_db` |
| `JWT_SECRET` | (generate at https://randomkeygen.com - use 256-bit key) |
| `FRONTEND_URL` | `https://hrbank-frontend.xxxxxx.us-east-1.cs.amazonlightsail.com` |
| `BACKEND_URL` | `https://hrbank-backend.xxxxxx.us-east-1.cs.amazonlightsail.com` |
| `CORS_ORIGINS` | `https://hrbank-frontend.xxxxxx.us-east-1.cs.amazonlightsail.com` |
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxx` |
| `SENDGRID_API_KEY` | `SG.xxxx` |
| `SENDGRID_FROM_EMAIL` | `notifications@hrbank.ca` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `GOOGLE_MAPS_API_KEY` | Your Google Maps API key |
| `INFURA_API_KEY` | Your Infura API key |
| `PINATA_API_KEY` | Your Pinata API key |
| `PINATA_SECRET_KEY` | Your Pinata secret key |
| `POLYGON_MAINNET_RPC_URL` | `https://polygon-mainnet.infura.io/v3/your_key` |
| `ISSUER_WALLET_ADDRESS` | Your wallet address |
| `ISSUER_PRIVATE_KEY` | Your wallet private key |
| `EMERGENT_LLM_KEY` | Your Emergent LLM key |

6. **Public endpoint:**
   - Container: `backend`
   - Port: `8001`

7. Click **Save and deploy**

8. Wait 3-5 minutes. Copy your **Public domain** URL when ready.

---

## Step 8: Build & Push Frontend (5 mins)

```powershell
# Go to frontend folder
cd C:\Users\YourName\Documents\HRBankv12\frontend

# Build with your ACTUAL backend URL from Step 7
docker build --build-arg REACT_APP_BACKEND_URL=https://hrbank-backend.xxxxxx.us-east-1.cs.amazonlightsail.com -t hrbank-frontend .

# Push to Lightsail
aws lightsail push-container-image --service-name hrbank-frontend --label frontend --image hrbank-frontend:latest --region us-east-1
```

---

## Step 9: Deploy Frontend in Console (5 mins)

1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/containers
2. Click **hrbank-frontend**
3. Click **Create your first deployment**

4. **Container 1:**
   - Container name: `frontend`
   - Image: Choose **Stored images** → Select your pushed image
   - Add open port: `80` → Protocol: `HTTP`

5. **Public endpoint:**
   - Container: `frontend`
   - Port: `80`

6. Click **Save and deploy**

7. Wait 3-5 minutes for deployment.

---

## Step 10: Update Backend with Real URLs (5 mins)

Now that you have both URLs:

1. Go to **hrbank-backend** → **Deployments**
2. Click **Modify your deployment**
3. Update these environment variables with your REAL frontend URL:
   - `FRONTEND_URL`
   - `CORS_ORIGINS`
4. Click **Save and deploy**

---

## ✅ Test Your Deployment

Open these URLs in your browser:

1. **Backend Health Check:**
   ```
   https://hrbank-backend.xxxxxx.us-east-1.cs.amazonlightsail.com/api/health
   ```
   Should show: `{"status": "healthy", "database": "connected"}`

2. **Frontend:**
   ```
   https://hrbank-frontend.xxxxxx.us-east-1.cs.amazonlightsail.com
   ```
   Should show the HR Bank landing page

3. **Test Login:**
   - Employer: `demo@swanpizza.ca` / `Demo123!`
   - Workforce: `alex.johnson@email.com` / `Demo123!`

---

## 🔧 Troubleshooting

### "Docker command not found"
- Make sure Docker Desktop is running (check taskbar for whale icon)
- Restart PowerShell after installing Docker

### "aws: command not found"
- Restart PowerShell after installing AWS CLI
- Check installation: `where.exe aws`

### "lightsailctl: command not found"
- Make sure you ran PowerShell as Administrator when installing
- Add to PATH: `$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"`

### "Container failed to start"
1. Go to Lightsail → Your service → **Deployments** → **Logs**
2. Check for error messages
3. Common issues:
   - Missing environment variable
   - Wrong `MONGO_URL`
   - Port mismatch

### "CORS errors in browser"
- Make sure `CORS_ORIGINS` matches your frontend URL exactly
- No trailing slash!

### "Cannot connect to database"
1. Go to MongoDB Atlas
2. **Network Access** → **Add IP Address**
3. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`)

---

## 💰 Monthly Cost

| Service | Cost |
|---------|------|
| Backend (Nano) | $7 |
| Frontend (Nano) | $7 |
| **Total** | **$14/month** |

---

## 📝 Quick Reference Commands (PowerShell)

```powershell
# Check service status
aws lightsail get-container-services --service-name hrbank-backend

# View deployment logs
aws lightsail get-container-log --service-name hrbank-backend --container-name backend

# List all services
aws lightsail get-container-services

# Delete a service (if needed)
aws lightsail delete-container-service --service-name hrbank-backend
```

---

## 🎉 Done!

Your HR Bank is now live on AWS Lightsail!

**Your URLs:**
- Frontend: `https://hrbank-frontend.____________.us-east-1.cs.amazonlightsail.com`
- Backend: `https://hrbank-backend.____________.us-east-1.cs.amazonlightsail.com`

**Next Steps:**
1. Set up a custom domain (optional)
2. Configure MongoDB Atlas backups
3. Monitor usage in Lightsail dashboard
