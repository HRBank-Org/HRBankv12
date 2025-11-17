from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import PartnerLogo, PartnerLogoCreate, PartnerLogoResponse
from database import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/partner-logos", tags=["partner-logos"])

@router.get("/")
async def get_partner_logos():
    """
    Get all active institution partner logos from institution_profiles for the carousel
    """
    try:
        db = await get_database()
        
        # Fetch institutions that have logos uploaded
        institutions = await db.institution_profiles.find(
            {
                "institution_logo_url": {"$exists": True, "$ne": ""},
                "onboarding_completed": True
            },
            {
                "_id": 0,
                "institution_id": 1,
                "institution_name": 1,
                "institution_logo_url": 1
            }
        ).limit(20).to_list(20)
        
        # Format response for carousel
        partner_logos = []
        for inst in institutions:
            partner_logos.append({
                "id": inst.get("institution_id", ""),
                "institution_name": inst.get("institution_name", "Partner Institution"),
                "logo_url": inst.get("institution_logo_url", "")
            })
        
        return partner_logos
    except Exception as e:
        logger.error(f"Error fetching partner logos: {str(e)}")
        # Return empty list on error instead of raising exception (for graceful degradation)
        return []

@router.post("/", response_model=PartnerLogoResponse)
async def create_partner_logo(logo_data: PartnerLogoCreate, institution_id: str):
    """
    Upload a new partner logo (only for institutions)
    """
    try:
        db = await get_database()
        
        # Create logo object
        logo = PartnerLogo(
            institution_id=institution_id,
            institution_name=logo_data.institution_name,
            logo_url=logo_data.logo_url
        )
        
        # Save to database
        await db.partner_logos.insert_one(logo.dict())
        
        return PartnerLogoResponse(**logo.dict())
    except Exception as e:
        logger.error(f"Error creating partner logo: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload partner logo")

@router.delete("/{logo_id}")
async def delete_partner_logo(logo_id: str, institution_id: str):
    """
    Delete or deactivate a partner logo
    """
    try:
        db = await get_database()
        
        # Verify ownership
        logo = await db.partner_logos.find_one({"id": logo_id, "institution_id": institution_id})
        if not logo:
            raise HTTPException(status_code=404, detail="Logo not found or unauthorized")
        
        # Soft delete by setting is_active to False
        await db.partner_logos.update_one(
            {"id": logo_id},
            {"$set": {"is_active": False}}
        )
        
        return {"message": "Logo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting partner logo: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete partner logo")
