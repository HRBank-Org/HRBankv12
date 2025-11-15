from fastapi import FastAPI, APIRouter
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

# Import routes
from routes import auth, users, credentials, admin, workforce, employer, occupations, jobs, messaging, ratings, attendance, institutions, invites, tasks, notifications, payments, blockchain_credentials, translation, partner_logos, calendar, workforce_management, eula, documents, admin_management

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'hrbank_db')]

# Create the main app without a prefix
app = FastAPI(title="HR Bank API", version="1.0.0")

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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()