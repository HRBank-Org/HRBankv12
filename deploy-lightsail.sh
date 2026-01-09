#!/bin/bash

# HR Bank - AWS Lightsail Deployment Script
# This script automates the deployment process

set -e

echo "🚀 HR Bank Lightsail Deployment"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed. Please install it first."
    echo "   Mac: brew install awscli"
    echo "   Windows: Download from https://awscli.amazonaws.com/AWSCLIV2.msi"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed. Please install Docker Desktop first."
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Get configuration
echo ""
echo "📝 Configuration"
echo "----------------"
read -p "Enter your MongoDB URL: " MONGO_URL
read -p "Enter your JWT Secret (or press Enter to generate): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT Secret: $JWT_SECRET"
fi

# Create container services
echo ""
echo -e "${YELLOW}Creating Lightsail container services...${NC}"

aws lightsail create-container-service \
    --service-name hrbank-backend \
    --power nano \
    --scale 1 \
    --region us-east-1 2>/dev/null || echo "Backend service may already exist"

aws lightsail create-container-service \
    --service-name hrbank-frontend \
    --power nano \
    --scale 1 \
    --region us-east-1 2>/dev/null || echo "Frontend service may already exist"

echo -e "${GREEN}✓ Container services created${NC}"

# Wait for services to be ready
echo ""
echo -e "${YELLOW}Waiting for services to be ready (this may take 2-3 minutes)...${NC}"
sleep 30

# Build and push backend
echo ""
echo -e "${YELLOW}Building backend...${NC}"
cd backend
docker build -t hrbank-backend .

echo -e "${YELLOW}Pushing backend to Lightsail...${NC}"
BACKEND_IMAGE=$(aws lightsail push-container-image \
    --service-name hrbank-backend \
    --label backend \
    --image hrbank-backend:latest \
    --query 'imageDigest' --output text)

echo -e "${GREEN}✓ Backend image pushed: $BACKEND_IMAGE${NC}"

# Get backend URL
BACKEND_URL=$(aws lightsail get-container-services \
    --service-name hrbank-backend \
    --query 'containerServices[0].url' --output text)

echo "Backend URL will be: $BACKEND_URL"

# Build and push frontend
echo ""
echo -e "${YELLOW}Building frontend...${NC}"
cd ../frontend
docker build \
    --build-arg REACT_APP_BACKEND_URL=https://$BACKEND_URL \
    -t hrbank-frontend .

echo -e "${YELLOW}Pushing frontend to Lightsail...${NC}"
FRONTEND_IMAGE=$(aws lightsail push-container-image \
    --service-name hrbank-frontend \
    --label frontend \
    --image hrbank-frontend:latest \
    --query 'imageDigest' --output text)

echo -e "${GREEN}✓ Frontend image pushed: $FRONTEND_IMAGE${NC}"

# Get frontend URL
FRONTEND_URL=$(aws lightsail get-container-services \
    --service-name hrbank-frontend \
    --query 'containerServices[0].url' --output text)

echo ""
echo "================================"
echo -e "${GREEN}🎉 Images pushed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://lightsail.aws.amazon.com/ls/webapp/home/containers"
echo "2. Click on 'hrbank-backend' → Create deployment"
echo "3. Add the environment variables (see AWS_LIGHTSAIL_GUIDE.md)"
echo "4. Set public endpoint to port 8001"
echo "5. Deploy frontend similarly with port 80"
echo ""
echo "Your URLs:"
echo "  Backend:  https://$BACKEND_URL"
echo "  Frontend: https://$FRONTEND_URL"
