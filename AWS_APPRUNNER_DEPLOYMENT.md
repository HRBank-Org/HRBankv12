# HR Bank - AWS App Runner Deployment Guide

## 🎯 Overview

This guide walks you through deploying HR Bank to AWS App Runner - the easiest way to run containers on AWS. By the end, you'll have:
- Backend API running on App Runner
- Frontend running on App Runner
- Automatic deployments via GitHub Actions

**Estimated Time:** 45-60 minutes

---

## 📋 Prerequisites Checklist

- [x] AWS Account with billing enabled
- [x] Code pushed to GitHub (HRBank-Org/HRBankv12)
- [ ] AWS CLI installed (we'll do this)
- [ ] Docker installed locally (optional, for testing)

---

## 🚀 Step-by-Step Deployment

### Step 1: Install AWS CLI (5 minutes)

**On Mac:**
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**On Windows:**
Download and run:https://awscli.amazonaws.com/AWSCLIV2.msi
 
**On Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify installation:**
```bash
aws --version
```

---

### Step 2: Create AWS IAM User (10 minutes)

1. Go to **AWS Console** → **IAM** → **Users** → **Create User**

2. **User name:** `hrbank-deploy`

3. Click **Next** → **Attach policies directly**

4. Search and select these policies:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AWSAppRunnerFullAccess`

5. Click **Create user**

6. Click on the user → **Security credentials** → **Create access key**

7. Select **Command Line Interface (CLI)** → **Next** → **Create**

8. **SAVE THESE KEYS** (you won't see them again):
   ```
   Access Key ID: AKIA...
   Secret Access Key: ...
   ```

---

### Step 3: Configure AWS CLI (2 minutes)

```bash
aws configure
```

Enter when prompted:
- **AWS Access Key ID:** (from Step 2)
- **AWS Secret Access Key:** (from Step 2)
- **Default region:** `us-east-1`
- **Default output format:** `json`

---

### Step 4: Create ECR Repositories (5 minutes)

Run these commands to create container registries:

```bash
# Create backend repository
aws ecr create-repository \
    --repository-name hrbank-backend \
    --region us-east-1

# Create frontend repository
aws ecr create-repository \
    --repository-name hrbank-frontend \
    --region us-east-1
```

**Save the repository URIs** from the output (looks like):
```
123456789012.dkr.ecr.us-east-1.amazonaws.com/hrbank-backend
123456789012.dkr.ecr.us-east-1.amazonaws.com/hrbank-frontend
```

---

### Step 5: Build and Push Docker Images (15 minutes)

#### 5a. Login to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```
(Replace `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID)

#### 5b. Clone your repo and build
```bash
git clone https://github.com/HRBank-Org/HRBankv12.git
cd HRBankv12

# Build and push backend
cd backend
docker build -t hrbank-backend .
docker tag hrbank-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-backend:latest

# Build and push frontend
cd ../frontend
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://your-backend-url.awsapprunner.com \
  --build-arg REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key \
  -t hrbank-frontend .
docker tag hrbank-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-frontend:latest
```

---

### Step 6: Create App Runner Services (15 minutes)

#### 6a. Create Backend Service

1. Go to **AWS Console** → **App Runner** → **Create service**

2. **Source:**
   - Repository type: **Container registry**
   - Provider: **Amazon ECR**
   - Container image URI: `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-backend:latest`

3. **Deployment settings:**
   - Deployment trigger: **Automatic**
   - ECR access role: **Create new service role**

4. **Configure service:**
   - Service name: `hrbank-backend`
   - CPU: **1 vCPU**
   - Memory: **2 GB**
   - Port: **8001**

5. **Environment variables** (click "Add environment variable" for each):

   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | Your MongoDB Atlas connection string |
   | `DB_NAME` | `hrbank_db` |
   | `JWT_SECRET` | Generate with: `openssl rand -hex 32` |
   | `FRONTEND_URL` | `https://your-frontend.awsapprunner.com` (update later) |
   | `BACKEND_URL` | `https://your-backend.awsapprunner.com` (update later) |
   | `CORS_ORIGINS` | `https://your-frontend.awsapprunner.com` (update later) |
   | `STRIPE_SECRET_KEY` | Your Stripe secret key |
   | `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key |
   | `SENDGRID_API_KEY` | Your SendGrid API key |
   | `SENDGRID_FROM_EMAIL` | `notifications@hrbank.ca` |
   | `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
   | `GOOGLE_MAPS_API_KEY` | Your Google Maps API key |
   | `INFURA_API_KEY` | Your Infura API key |
   | `PINATA_API_KEY` | Your Pinata API key |
   | `PINATA_SECRET_KEY` | Your Pinata secret key |
   | `POLYGON_MAINNET_RPC_URL` | Your Polygon RPC URL |
   | `ISSUER_WALLET_ADDRESS` | Your wallet address |
   | `ISSUER_PRIVATE_KEY` | Your wallet private key |
   | `EMERGENT_LLM_KEY` | Your Emergent LLM key |

6. **Health check:**
   - Path: `/api/health`
   - Protocol: **HTTP**

7. Click **Create & deploy**

8. **SAVE the service URL** (e.g., `https://abc123.us-east-1.awsapprunner.com`)

#### 6b. Create Frontend Service

1. Go to **App Runner** → **Create service**

2. **Source:**
   - Container image URI: `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-frontend:latest`

3. **Configure service:**
   - Service name: `hrbank-frontend`
   - CPU: **0.5 vCPU**
   - Memory: **1 GB**
   - Port: **80**

4. **Health check:**
   - Path: `/health`
   - Protocol: **HTTP**

5. Click **Create & deploy**

6. **SAVE the service URL** (e.g., `https://xyz789.us-east-1.awsapprunner.com`)

---

### Step 7: Update Environment Variables (5 minutes)

Now that you have both URLs, update the backend service:

1. Go to **App Runner** → **hrbank-backend** → **Configuration** → **Edit**

2. Update these environment variables:
   - `FRONTEND_URL` → Your frontend App Runner URL
   - `BACKEND_URL` → Your backend App Runner URL
   - `CORS_ORIGINS` → Your frontend App Runner URL

3. **Rebuild the frontend** with the correct backend URL:
```bash
cd frontend
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://YOUR-BACKEND.us-east-1.awsapprunner.com \
  --build-arg REACT_APP_GOOGLE_MAPS_API_KEY=your-key \
  -t hrbank-frontend .
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hrbank-frontend:latest
```

---

### Step 8: Set Up GitHub Actions (10 minutes)

Add secrets to your GitHub repository for automatic deployments:

1. Go to **GitHub** → **HRBankv12** → **Settings** → **Secrets and variables** → **Actions**

2. Click **New repository secret** for each:

   | Secret Name | Value |
   |-------------|-------|
   | `AWS_ACCESS_KEY_ID` | Your IAM access key |
   | `AWS_SECRET_ACCESS_KEY` | Your IAM secret key |
   | `BACKEND_SERVICE_ARN` | From App Runner console (arn:aws:apprunner:...) |
   | `FRONTEND_SERVICE_ARN` | From App Runner console |
   | `REACT_APP_BACKEND_URL` | Your backend App Runner URL |
   | `REACT_APP_GOOGLE_MAPS_API_KEY` | Your Google Maps key |
   | `REACT_APP_POSTHOG_KEY` | Your PostHog key |

3. The GitHub Action at `.github/workflows/deploy-aws.yml` will now automatically deploy when you push to `main`.

---

## ✅ Post-Deployment Checklist

### 1. Test Your Deployment
- [ ] Visit frontend URL - should see landing page
- [ ] Visit `backend-url/api/health` - should return `{"status": "healthy"}`
- [ ] Try logging in with test credentials
- [ ] Test credential issuance flow

### 2. Update Third-Party Services

**Google OAuth Console:**
- Add your new App Runner URLs to authorized origins and redirect URIs

**Stripe Dashboard:**
- Update webhook endpoint to: `https://your-backend.awsapprunner.com/api/webhook/stripe`

**MongoDB Atlas:**
- Add App Runner IP ranges to IP whitelist (or allow all: `0.0.0.0/0`)

### 3. Set Up Monitoring
- **AWS CloudWatch** - Already integrated with App Runner
- **App Runner Console** - View logs, metrics, and deployments

---

## 🔧 Troubleshooting

### "Service failed to start"
- Check CloudWatch logs in App Runner console
- Verify all environment variables are set correctly
- Ensure MongoDB Atlas allows connections from AWS

### "502 Bad Gateway"
- Backend might be starting up (wait 2-3 minutes)
- Check health check path is correct (`/api/health`)

### "CORS errors"
- Verify `CORS_ORIGINS` includes your frontend URL
- Make sure URLs don't have trailing slashes

### "Database connection failed"
- Check `MONGO_URL` is correct
- Add `0.0.0.0/0` to MongoDB Atlas IP whitelist

---

## 💰 Cost Estimate

| Service | Configuration | Est. Monthly Cost |
|---------|--------------|-------------------|
| App Runner (Backend) | 1 vCPU, 2GB | ~$30-50 |
| App Runner (Frontend) | 0.5 vCPU, 1GB | ~$15-25 |
| ECR Storage | ~1GB | ~$0.10 |
| Data Transfer | ~10GB | ~$1 |
| **Total** | | **~$50-80/month** |

*Costs vary based on traffic. App Runner scales to zero when idle.*

---

## 🎯 Next Steps

1. **Custom Domain:** Add your domain in App Runner settings
2. **SSL Certificate:** Automatic with App Runner
3. **Auto-Scaling:** Configure in App Runner settings
4. **Backup Strategy:** Set up MongoDB Atlas automated backups

---

## 📞 Need Help?

- **AWS Documentation:** https://docs.aws.amazon.com/apprunner/
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **App Runner Pricing:** https://aws.amazon.com/apprunner/pricing/
