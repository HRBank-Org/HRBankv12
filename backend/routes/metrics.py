from fastapi import APIRouter, HTTPException
from models import MetricsData
from database import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/", response_model=MetricsData)
async def get_metrics():
    """
    Get platform metrics for the landing page
    """
    try:
        db = await get_database()
        
        # Count users by type
        workforce_count = await db.users.count_documents({"user_type": "workforce"})
        employer_count = await db.users.count_documents({"user_type": "employer"})
        institution_count = await db.users.count_documents({"user_type": "institution"})
        
        # Mock job count and compliance rate for now
        # In production, these would come from actual job postings and compliance data
        job_count = 2500
        compliance_rate = 95.0
        
        return MetricsData(
            workforce_count=workforce_count,
            employer_count=employer_count,
            institution_count=institution_count,
            job_count=job_count,
            compliance_rate=compliance_rate
        )
    except Exception as e:
        logger.error(f"Error fetching metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch metrics")
