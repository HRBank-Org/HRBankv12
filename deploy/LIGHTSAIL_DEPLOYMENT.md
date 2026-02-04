# HR Bank - AWS Lightsail Deployment Guide

## Overview
This guide covers deploying HR Bank to AWS Lightsail with Docker containers.

## Prerequisites
- AWS Account with Lightsail access
- Domain name (optional but recommended)
- MongoDB Atlas account (for managed database)
- All API keys configured (Stripe, SendGrid, etc.)

---

## Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster or upgrade for production
3. Create a database user with read/write access
4. Whitelist your Lightsail IP (or use 0.0.0.0/0 for testing)
5. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/hrbank_db
   ```

---

## Step 2: Create Lightsail Container Service

### Option A: Using AWS Console

1. Go to AWS Lightsail Console
2. Click "Containers" → "Create container service"
3. Choose your region (closest to your users)
4. Select power: **Medium** ($40/month) recommended for production
5. Scale: Start with 1, increase as needed
6. Name: `hrbank-production`

### Option B: Using AWS CLI

```bash
aws lightsail create-container-service \
  --service-name hrbank-production \
  --power medium \
  --scale 1
```

---

## Step 3: Build & Push Docker Image

### Build locally:
```bash
# Clone your repository
git clone your-repo-url
cd hrbank

# Create .env file from template
cp deploy/.env.template .env
# Edit .env with your production values

# Build the Docker image
docker build \
  --build-arg REACT_APP_BACKEND_URL=https://your-domain.com \
  -t hrbank:latest .
```

### Push to Lightsail:
```bash
# Get Lightsail container registry credentials
aws lightsail get-container-images --service-name hrbank-production

# Push image
aws lightsail push-container-image \
  --service-name hrbank-production \
  --label hrbank \
  --image hrbank:latest
```

---

## Step 4: Deploy Container

Create a deployment configuration file `lightsail-deployment.json`:

```json
{
  "serviceName": "hrbank-production",
  "containers": {
    "hrbank": {
      "image": ":hrbank-production.hrbank.latest",
      "environment": {
        "MONGO_URL": "mongodb+srv://...",
        "DB_NAME": "hrbank_db",
        "JWT_SECRET": "your-secret",
        "FRONTEND_URL": "https://your-domain.com",
        "BACKEND_URL": "https://your-domain.com",
        "CORS_ORIGINS": "https://your-domain.com",
        "STRIPE_API_KEY": "sk_live_...",
        "ISSUER_PRIVATE_KEY": "your-key",
        "PINATA_API_KEY": "your-key"
      },
      "ports": {
        "80": "HTTP"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "hrbank",
    "containerPort": 80,
    "healthCheck": {
      "healthyThreshold": 2,
      "unhealthyThreshold": 2,
      "timeoutSeconds": 5,
      "intervalSeconds": 30,
      "path": "/api/health",
      "successCodes": "200"
    }
  }
}
```

Deploy:
```bash
aws lightsail create-container-service-deployment \
  --cli-input-json file://lightsail-deployment.json
```

---

## Step 5: Configure Custom Domain (Optional)

1. In Lightsail Console, go to your container service
2. Click "Custom domains"
3. Add your domain (e.g., `app.hrbank.ca`)
4. Create a CNAME record in your DNS:
   - Name: `app`
   - Value: Your Lightsail container URL

---

## Step 6: Enable HTTPS

Lightsail provides free SSL certificates:

1. Go to your container service
2. Click "Custom domains" → "Create certificate"
3. Enter your domain name
4. Validate via DNS (add the CNAME record provided)
5. Attach certificate to your service

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (64+ chars) |
| `FRONTEND_URL` | ✅ | Your domain URL |
| `STRIPE_API_KEY` | ✅ | Stripe secret key |
| `ISSUER_PRIVATE_KEY` | ✅ | Polygon wallet private key |
| `PINATA_API_KEY` | ✅ | IPFS storage key |
| `SENDGRID_API_KEY` | ⚠️ | Email service |
| `TWILIO_ACCOUNT_SID` | ⚠️ | SMS/OTP service |

---

## Monitoring & Logs

### View logs:
```bash
aws lightsail get-container-log \
  --service-name hrbank-production \
  --container-name hrbank
```

### Health check:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "service": "HR Bank API"
}
```

---

## Scaling

To handle more traffic:

```bash
aws lightsail update-container-service \
  --service-name hrbank-production \
  --scale 2
```

---

## Estimated Costs

| Service | Monthly Cost |
|---------|-------------|
| Lightsail Medium (1 node) | $40 |
| MongoDB Atlas M10 | $57 |
| Custom Domain SSL | Free |
| **Total** | ~$97/month |

For higher traffic, scale to 2-3 nodes and upgrade MongoDB.

---

## Troubleshooting

### Container won't start
- Check environment variables are set correctly
- View container logs for errors
- Ensure MongoDB Atlas IP whitelist includes Lightsail

### Database connection errors
- Verify MONGO_URL is correct
- Check MongoDB Atlas network access settings
- Test connection from local machine first

### Blockchain transactions failing
- Ensure wallet has sufficient MATIC balance
- Verify INFURA_API_KEY is valid
- Check Polygon network status

### SSL certificate issues
- Verify DNS CNAME record is correct
- Wait up to 48 hours for DNS propagation
- Check certificate status in Lightsail console

---

## Support

For issues specific to:
- **Blockchain/Web3**: Check Polygon network status, wallet balance
- **Payments**: Stripe Dashboard → Developers → Logs
- **Email delivery**: SendGrid Activity Feed
- **SMS/OTP**: Twilio Console → Monitor → Logs
