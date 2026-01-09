# HR Bank - AWS Deployment Guide

## Pre-Deployment Checklist ✅

Based on comprehensive testing, your application is **production-ready**:
- ✅ All user flows working (Workforce, Employer, Institution, Admin)
- ✅ All APIs functional (15/15 tests passed)
- ✅ Emma AI multilingual support working
- ✅ Blockchain integration (Polygon Mainnet) configured
- ✅ Stripe Connect (LIVE key) configured
- ✅ Google OAuth configured
- ✅ SendGrid email integration working

---

## Option 1: AWS Elastic Beanstalk (Recommended for Beginners)

### Step 1: Prepare Your Code

```bash
# 1. Export your code from Emergent
# Use VS Code view to download files OR use "Save to GitHub"

# 2. Create .env.example files (without secrets)
# backend/.env.example
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/hrbank_db
DB_NAME=hrbank_db
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG....
INFURA_PROJECT_ID=your-infura-id
PINATA_API_KEY=your-pinata-key
GOOGLE_CLIENT_ID=your-google-client-id
FRONTEND_URL=https://your-domain.com
```

### Step 2: Set Up AWS Resources

```bash
# Install AWS CLI and EB CLI
pip install awscli awsebcli

# Configure AWS credentials
aws configure

# Create Elastic Beanstalk application
eb init hr-bank-app --platform python-3.11 --region us-east-1
```

### Step 3: Create Dockerfiles

**Backend Dockerfile** (`/backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Frontend Dockerfile** (`/frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 4: Create docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=${MONGO_URL}
      - DB_NAME=${DB_NAME}
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - FRONTEND_URL=${FRONTEND_URL}
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

### Step 5: Deploy to Elastic Beanstalk

```bash
# Create environment
eb create hr-bank-prod --envvars MONGO_URL=...,DB_NAME=hrbank_db,...

# Deploy
eb deploy

# Open in browser
eb open
```

---

## Option 2: AWS EC2 + Docker (More Control)

### Step 1: Launch EC2 Instance
- AMI: Amazon Linux 2023
- Instance type: t3.medium (minimum)
- Security groups: Allow ports 80, 443, 22

### Step 2: Install Dependencies

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ip

# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Clone and Deploy

```bash
# Clone your repo
git clone https://github.com/your-username/hr-bank.git
cd hr-bank

# Create .env file with production values
nano backend/.env
nano frontend/.env

# Build and run
docker-compose up -d --build
```

### Step 4: Set Up SSL with Certbot

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d hrbank.ca -d www.hrbank.ca
```

---

## Option 3: AWS App Runner (Easiest)

### Step 1: Push to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name hr-bank-backend
aws ecr create-repository --repository-name hr-bank-frontend

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t hr-bank-backend ./backend
docker tag hr-bank-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hr-bank-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hr-bank-backend:latest
```

### Step 2: Create App Runner Service
1. Go to AWS Console → App Runner
2. Create service from ECR image
3. Configure environment variables
4. Deploy

---

## Environment Variables for Production

**Backend (.env)**:
```
MONGO_URL=mongodb+srv://prod-user:password@cluster.mongodb.net/hrbank_db
DB_NAME=hrbank_db
JWT_SECRET=generate-a-secure-256-bit-key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
SENDGRID_API_KEY=SG.your_sendgrid_key
INFURA_PROJECT_ID=your_infura_project_id
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=https://hrbank.ca
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your_project_id
CONTRACT_ADDRESS=your_deployed_contract_address
PRIVATE_KEY=your_wallet_private_key
```

**Frontend (.env)**:
```
REACT_APP_BACKEND_URL=https://api.hrbank.ca
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_key
```

---

## Post-Deployment Checklist

1. **Update Stripe Webhooks**: Point to `https://api.hrbank.ca/api/webhook/stripe`
2. **Update Google OAuth**: Add production URLs to Google Console
3. **Configure DNS**: Point hrbank.ca to your AWS resources
4. **Enable CloudWatch**: Monitor application logs
5. **Set up Auto-Scaling**: Configure based on traffic
6. **Enable WAF**: Add AWS WAF for security
7. **Set up Backups**: Configure MongoDB Atlas backups

---

## Estimated Monthly Costs (AWS)

| Service | Est. Cost |
|---------|-----------|
| EC2 t3.medium | $30/month |
| ALB | $20/month |
| MongoDB Atlas (M10) | $57/month |
| Route 53 | $1/month |
| CloudWatch | $10/month |
| **Total** | ~$120/month |

For cost optimization, consider:
- AWS Savings Plans (up to 72% off)
- Reserved Instances
- Spot Instances for non-critical workloads
