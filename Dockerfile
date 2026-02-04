# HR Bank - Full Stack Application
# Dockerfile for AWS Lightsail Deployment

FROM node:18-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend/ ./
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# Production image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Copy nginx configuration
COPY deploy/nginx.conf /etc/nginx/sites-available/default

# Copy supervisor configuration
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create log directories
RUN mkdir -p /var/log/supervisor /app/backend/uploads

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
