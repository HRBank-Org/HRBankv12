#!/bin/bash

# HR Bank - Lightsail Deployment Script
# Usage: ./deploy.sh [build|push|deploy|all]

set -e

SERVICE_NAME="hrbank-production"
IMAGE_NAME="hrbank"
REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed. Please install it first."
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Copy deploy/.env.template to .env and configure it."
        exit 1
    fi
    
    log_info "Prerequisites OK"
}

build_image() {
    log_info "Building Docker image..."
    
    # Load environment variables
    source .env
    
    if [ -z "$REACT_APP_BACKEND_URL" ]; then
        log_error "REACT_APP_BACKEND_URL not set in .env"
        exit 1
    fi
    
    docker build \
        --build-arg REACT_APP_BACKEND_URL="$REACT_APP_BACKEND_URL" \
        -t "$IMAGE_NAME:latest" .
    
    log_info "Docker image built successfully"
}

push_image() {
    log_info "Pushing image to Lightsail..."
    
    aws lightsail push-container-image \
        --region "$REGION" \
        --service-name "$SERVICE_NAME" \
        --label "$IMAGE_NAME" \
        --image "$IMAGE_NAME:latest"
    
    log_info "Image pushed successfully"
}

deploy_service() {
    log_info "Deploying to Lightsail..."
    
    # Load environment variables
    source .env
    
    # Get the latest image
    LATEST_IMAGE=$(aws lightsail get-container-images \
        --region "$REGION" \
        --service-name "$SERVICE_NAME" \
        --query 'containerImages[0].image' \
        --output text)
    
    log_info "Using image: $LATEST_IMAGE"
    
    # Create deployment JSON
    cat > /tmp/deployment.json << EOF
{
    "serviceName": "$SERVICE_NAME",
    "containers": {
        "hrbank": {
            "image": "$LATEST_IMAGE",
            "environment": {
                "MONGO_URL": "$MONGO_URL",
                "DB_NAME": "${DB_NAME:-hrbank_db}",
                "JWT_SECRET": "$JWT_SECRET",
                "CORS_ORIGINS": "${CORS_ORIGINS:-*}",
                "FRONTEND_URL": "$FRONTEND_URL",
                "BACKEND_URL": "$BACKEND_URL",
                "SENDGRID_API_KEY": "$SENDGRID_API_KEY",
                "SENDGRID_FROM_EMAIL": "${SENDGRID_FROM_EMAIL:-notifications@hrbank.ca}",
                "GOOGLE_MAPS_API_KEY": "$GOOGLE_MAPS_API_KEY",
                "GOOGLE_DISTANCE_MATRIX_API_KEY": "$GOOGLE_DISTANCE_MATRIX_API_KEY",
                "GOOGLE_TIMEZONE_API_KEY": "$GOOGLE_TIMEZONE_API_KEY",
                "GOOGLE_OAUTH_CLIENT_ID": "$GOOGLE_OAUTH_CLIENT_ID",
                "GOOGLE_OAUTH_CLIENT_SECRET": "$GOOGLE_OAUTH_CLIENT_SECRET",
                "GOOGLE_OAUTH_REDIRECT_URI": "$GOOGLE_OAUTH_REDIRECT_URI",
                "GOOGLE_CLIENT_ID": "$GOOGLE_CLIENT_ID",
                "GOOGLE_CLIENT_SECRET": "$GOOGLE_CLIENT_SECRET",
                "STRIPE_API_KEY": "$STRIPE_API_KEY",
                "STRIPE_PUBLISHABLE_KEY": "$STRIPE_PUBLISHABLE_KEY",
                "STRIPE_SECRET_KEY": "$STRIPE_SECRET_KEY",
                "TWILIO_ACCOUNT_SID": "$TWILIO_ACCOUNT_SID",
                "TWILIO_AUTH_TOKEN": "$TWILIO_AUTH_TOKEN",
                "TWILIO_PHONE_NUMBER": "$TWILIO_PHONE_NUMBER",
                "ISSUER_WALLET_ADDRESS": "$ISSUER_WALLET_ADDRESS",
                "ISSUER_PRIVATE_KEY": "$ISSUER_PRIVATE_KEY",
                "BLOCKCHAIN_NETWORK": "${BLOCKCHAIN_NETWORK:-polygon_mainnet}",
                "POLYGON_MAINNET_RPC_URL": "$POLYGON_MAINNET_RPC_URL",
                "INFURA_API_KEY": "$INFURA_API_KEY",
                "PINATA_API_KEY": "$PINATA_API_KEY",
                "PINATA_SECRET_KEY": "$PINATA_SECRET_KEY",
                "VAPID_PUBLIC_KEY": "$VAPID_PUBLIC_KEY",
                "VAPID_PRIVATE_KEY": "$VAPID_PRIVATE_KEY",
                "VAPID_CLAIMS_EMAIL": "${VAPID_CLAIMS_EMAIL:-notifications@hrbank.ca}",
                "LINKEDIN_CLIENT_ID": "$LINKEDIN_CLIENT_ID",
                "LINKEDIN_CLIENT_SECRET": "$LINKEDIN_CLIENT_SECRET",
                "LINKEDIN_REDIRECT_URI": "$LINKEDIN_REDIRECT_URI",
                "EMERGENT_LLM_KEY": "$EMERGENT_LLM_KEY"
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
            "timeoutSeconds": 10,
            "intervalSeconds": 30,
            "path": "/api/health",
            "successCodes": "200"
        }
    }
}
EOF
    
    aws lightsail create-container-service-deployment \
        --region "$REGION" \
        --cli-input-json file:///tmp/deployment.json
    
    rm /tmp/deployment.json
    
    log_info "Deployment initiated. Monitor progress in AWS Lightsail Console."
}

check_status() {
    log_info "Checking deployment status..."
    
    aws lightsail get-container-services \
        --region "$REGION" \
        --service-name "$SERVICE_NAME" \
        --query 'containerServices[0].{State:state,URL:url,Power:power,Scale:scale}' \
        --output table
}

show_usage() {
    echo "HR Bank Lightsail Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build    - Build Docker image"
    echo "  push     - Push image to Lightsail"
    echo "  deploy   - Deploy to Lightsail"
    echo "  status   - Check deployment status"
    echo "  all      - Build, push, and deploy"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured with credentials"
    echo "  - Docker installed and running"
    echo "  - .env file with all required variables"
}

# Main
case "${1:-}" in
    build)
        check_prerequisites
        build_image
        ;;
    push)
        check_prerequisites
        push_image
        ;;
    deploy)
        check_prerequisites
        deploy_service
        ;;
    status)
        check_status
        ;;
    all)
        check_prerequisites
        build_image
        push_image
        deploy_service
        ;;
    *)
        show_usage
        ;;
esac
