from fastapi import FastAPI, APIRouter, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

# Rate limiting
from utils.rate_limiter import limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Import routes
from routes import auth, users, credentials, admin, workforce, employer, occupations, jobs, messaging, ratings, attendance, institutions, invites, tasks, notifications, payments, translation, partner_logos, calendar, workforce_management, eula, documents, admin_management, google_calendar, shift_scheduling, admin_occupations, admin_certifications, otp_verification, file_upload, validation, institution_classes, credential_verification, compliance, payroll, rosters, workforce_roster, emma, job_matching, admin_credentials, shift_management, calendar_scheduling, notification_preferences, time_off, live_attendance, dashboard, shift_ratings, qr_attendance, workplace_roles, employer_invitations, workforce_monitoring, fee_calculator_api, minimum_wage_admin, timesheets, payroll_management, weekly_timesheets, occupation_templates, admin_id_verification, workforce_profile_update, interviews, address, service_tasks, external_bookings, match_engine, admin_seeding, transcripts, auto_dispatch, super_admin, career_profile, credential_payments, stripe_connect, leaderboard, institution_directory, admin_document_expiry, support_tickets, partner_api, invoices, workpassport, linkedin, fundraisers, field_service, employer_billing, payroll_export, payroll_sync, blockchain_credentials, admin_messaging, geo_access_admin, employer_insurance, jurisdiction_authorization, institution_programs

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'hrbank_db')]

# Create the main app without a prefix
app = FastAPI(title="HR Bank API", version="1.0.0")

# Add rate limiter to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add session middleware for OAuth (must be added before routes)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get('JWT_SECRET', 'your-secret-key')
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

# Health check endpoint for Kubernetes - at root level (not /api)
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    try:
        # Quick database ping to verify connectivity
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "service": "HR Bank API"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.get("/api/health/detailed")
async def detailed_health_check():
    """
    SOC2-compliant detailed health check for monitoring and availability tracking.
    Returns comprehensive system status including all components.
    """
    from datetime import datetime, timezone
    import platform
    
    status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "HR Bank API",
        "version": "1.0.0",
        "environment": os.environ.get("ENVIRONMENT", "production"),
        "components": {}
    }
    
    # Database check
    try:
        start = datetime.now(timezone.utc)
        await db.command("ping")
        latency = (datetime.now(timezone.utc) - start).total_seconds() * 1000
        status["components"]["database"] = {
            "status": "healthy",
            "type": "MongoDB",
            "latency_ms": round(latency, 2)
        }
    except Exception as e:
        status["status"] = "degraded"
        status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Session service check
    try:
        from services.session_manager import session_manager
        session_counts = await session_manager.get_active_sessions_count()
        status["components"]["sessions"] = {
            "status": "healthy",
            "active_sessions": session_counts
        }
    except Exception as e:
        status["components"]["sessions"] = {
            "status": "degraded",
            "error": str(e)
        }
    
    # Audit logging check
    try:
        recent_logs = await db.audit_logs.count_documents({})
        status["components"]["audit_logging"] = {
            "status": "healthy",
            "total_logs": recent_logs
        }
    except Exception as e:
        status["components"]["audit_logging"] = {
            "status": "degraded",
            "error": str(e)
        }
    
    # Security controls check
    try:
        locked_accounts = await db.account_lockouts.count_documents({})
        status["components"]["security"] = {
            "status": "healthy",
            "locked_accounts": locked_accounts
        }
    except Exception as e:
        status["components"]["security"] = {
            "status": "degraded",
            "error": str(e)
        }
    
    # System metrics
    status["system"] = {
        "python_version": platform.python_version(),
        "platform": platform.system(),
        "architecture": platform.machine()
    }
    
    # Check if any component is unhealthy
    unhealthy_components = [
        k for k, v in status["components"].items() 
        if v.get("status") != "healthy"
    ]
    
    if unhealthy_components:
        status["status"] = "degraded"
        status["unhealthy_components"] = unhealthy_components
    
    return status

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

# Include auth routes
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(credentials.router, prefix="/api", tags=["credentials"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(workforce.router, prefix="/api", tags=["workforce"])
app.include_router(employer.router, prefix="/api", tags=["employer"])
app.include_router(occupations.router, prefix="/api", tags=["occupations"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(messaging.router, prefix="/api", tags=["messaging"])
app.include_router(ratings.router, prefix="/api", tags=["ratings"])
app.include_router(attendance.router, prefix="/api", tags=["attendance"])
app.include_router(institutions.router, prefix="/api", tags=["institutions"])
app.include_router(invites.router, prefix="/api", tags=["invites"])
app.include_router(tasks.router, prefix="/api", tags=["tasks"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(blockchain_credentials.router, prefix="/api", tags=["blockchain_credentials"])
app.include_router(translation.router, prefix="/api", tags=["translation"])
app.include_router(partner_logos.router, tags=["partner-logos"])
app.include_router(calendar.router, tags=["calendar"])
app.include_router(workforce_management.router, tags=["workforce_management"])
app.include_router(eula.router, tags=["eula"])
app.include_router(documents.router, tags=["documents"])
app.include_router(admin_management.router, tags=["admin_management"])
app.include_router(google_calendar.router, tags=["google_calendar"])
app.include_router(shift_scheduling.router, tags=["shift_scheduling"])
app.include_router(admin_occupations.router, tags=["admin_occupations"])
app.include_router(admin_certifications.router, tags=["admin_certifications"])
app.include_router(admin_credentials.router, prefix="/api", tags=["admin_credentials"])
app.include_router(otp_verification.router, prefix="/api/otp", tags=["otp_verification"])
app.include_router(file_upload.router, prefix="/api", tags=["file_upload"])
app.include_router(validation.router, prefix="/api/validation", tags=["validation"])
app.include_router(institution_classes.router, tags=["institution_classes"])
app.include_router(institution_programs.router, tags=["institution_programs"])
app.include_router(credential_verification.router, tags=["credential_verification"])
app.include_router(compliance.router, prefix="/api", tags=["compliance"])
app.include_router(payroll.router, prefix="/api", tags=["payroll"])
app.include_router(rosters.router, prefix="/api", tags=["rosters"])
app.include_router(workforce_roster.router, prefix="/api", tags=["workforce_roster"])
app.include_router(emma.router, tags=["emma"])
app.include_router(job_matching.router, tags=["job_matching"])
app.include_router(shift_management.router, tags=["shift_management"])
app.include_router(calendar_scheduling.router, tags=["calendar_scheduling"])
app.include_router(notification_preferences.router, tags=["notification_preferences"])
app.include_router(time_off.router, tags=["time_off"])
app.include_router(live_attendance.router, tags=["live_attendance"])
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(shift_ratings.router, tags=["shift_ratings"])
app.include_router(qr_attendance.router, tags=["qr_attendance"])
app.include_router(workplace_roles.router, tags=["workplace_roles"])
app.include_router(employer_invitations.router, tags=["employer_invitations"])
app.include_router(employer_invitations.invite_workers_router, tags=["employer_invite_workers"])
app.include_router(workforce_monitoring.router, tags=["workforce_monitoring"])
app.include_router(fee_calculator_api.router, tags=["fee_calculator"])
app.include_router(minimum_wage_admin.router, tags=["minimum_wage_admin"])
app.include_router(timesheets.router, tags=["timesheets"])
app.include_router(payroll_management.router, tags=["payroll_management"])
app.include_router(weekly_timesheets.router, tags=["weekly_timesheets"])
app.include_router(occupation_templates.router, tags=["occupation_templates"])
app.include_router(admin_id_verification.router, tags=["admin_id_verification"])
app.include_router(workforce_profile_update.router, tags=["workforce_profile_update"])

app.include_router(interviews.router, tags=["interviews"])
app.include_router(address.router, tags=["address"])
app.include_router(service_tasks.router, prefix="/api", tags=["service_tasks"])
app.include_router(external_bookings.router, prefix="/api", tags=["external_bookings"])
app.include_router(match_engine.router, tags=["match_engine"])
app.include_router(admin_seeding.router, prefix="/api", tags=["admin_seeding"])
app.include_router(transcripts.router, prefix="/api", tags=["transcripts"])
app.include_router(auto_dispatch.router, prefix="/api", tags=["auto_dispatch"])
app.include_router(super_admin.router, prefix="/api", tags=["super_admin"])
app.include_router(career_profile.router, prefix="/api", tags=["career_profile"])
app.include_router(credential_payments.router, prefix="/api", tags=["credential_payments"])
app.include_router(stripe_connect.router, prefix="/api", tags=["stripe_connect"])
app.include_router(leaderboard.router, prefix="/api", tags=["leaderboard"])
app.include_router(institution_directory.router, prefix="/api", tags=["institution_directory"])
app.include_router(admin_document_expiry.router, prefix="/api", tags=["admin_document_expiry"])
app.include_router(support_tickets.router, prefix="/api", tags=["support_tickets"])
app.include_router(partner_api.router, prefix="/api", tags=["partner_api"])
app.include_router(invoices.router, prefix="/api", tags=["invoices"])
app.include_router(workpassport.router, prefix="/api", tags=["workpassport"])
app.include_router(linkedin.router, prefix="/api", tags=["linkedin"])
app.include_router(fundraisers.router, prefix="/api", tags=["fundraisers"])
app.include_router(field_service.router, tags=["field_service"])
app.include_router(employer_billing.router, tags=["employer_billing"])
app.include_router(payroll_export.router, tags=["payroll_export"])
app.include_router(payroll_sync.router, tags=["payroll_sync"])
app.include_router(admin_messaging.router, prefix="/api", tags=["admin_messaging"])
app.include_router(geo_access_admin.router, prefix="/api", tags=["geo_access"])
app.include_router(employer_insurance.router, prefix="/api", tags=["employer_insurance"])
app.include_router(jurisdiction_authorization.router, tags=["jurisdiction_authorization"])

# Stripe webhook at root /api level
@app.post("/api/webhook/stripe")
async def stripe_webhook_handler(request: Request):
    """Handle Stripe webhook events"""
    from routes.credential_payments import stripe_webhook
    return await stripe_webhook(request, db)

# Mount static files for uploaded photos
from pathlib import Path
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware for SOC2/Pentest compliance
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    # XSS protection (legacy browsers)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Enforce HTTPS
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Control referrer information
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Restrict browser features
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(self), camera=(self)"
    # Cache control for sensitive data
    if "/api/" in str(request.url):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
    return response


# Geo-access control middleware
from utils.geo_access import geo_access_middleware
app.middleware("http")(geo_access_middleware)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Document expiry scheduler
from services.document_scheduler import start_scheduler, stop_scheduler

@app.on_event("startup")
async def startup_tasks():
    """Initialize background tasks on startup"""
    logger.info("Starting HR Bank API...")
    
    # Start document expiry reminder scheduler
    try:
        start_scheduler(db)
        logger.info("Document expiry scheduler initialized successfully")
    except Exception as e:
        logger.error(f"Failed to start document expiry scheduler: {str(e)}")
    
    # Start session cleanup scheduler
    try:
        import asyncio
        from services.session_manager import session_manager
        
        async def session_cleanup_task():
            """Run session cleanup every 15 minutes"""
            while True:
                try:
                    await asyncio.sleep(900)  # 15 minutes
                    results = await session_manager.run_security_cleanup()
                    if results["total_cleaned"] > 0:
                        logger.info(f"Session cleanup: {results['total_cleaned']} stale sessions removed")
                except Exception as e:
                    logger.error(f"Session cleanup error: {e}")
        
        asyncio.create_task(session_cleanup_task())
        logger.info("Session cleanup scheduler initialized (runs every 15 minutes)")
    except Exception as e:
        logger.error(f"Failed to start session cleanup scheduler: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    logger.info("Shutting down HR Bank API...")
    
    # Stop scheduler
    try:
        stop_scheduler()
        logger.info("Document expiry scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")
    
    # Close database connection
    client.close()