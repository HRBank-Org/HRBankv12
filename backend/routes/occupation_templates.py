"""
Occupation Templates Management
Super-admin creates/manages standardized occupation templates
Employers use these when creating shifts
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone
from auth.dependencies import require_role
from models.occupation_template import (
    OccupationTemplate,
    OccupationTemplateCreate,
    OccupationTemplateUpdate
)
import uuid

router = APIRouter(prefix="/api/occupation-templates", tags=["Occupation Templates"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

# PUBLIC ENDPOINTS (for employers creating shifts)

@router.get("/list", response_model=Dict)
async def list_occupation_templates(
    category: str = Query(None, description="Filter by category"),
    search: str = Query(None, description="Search by title"),
    db = Depends(get_db)
):
    """
    List all active occupation templates
    Used by employers when creating shifts
    """
    
    query = {"is_active": True}
    
    if category:
        query["occupation_category"] = category
    
    if search:
        query["occupation_title"] = {"$regex": search, "$options": "i"}
    
    templates = await db.occupation_templates.find(
        query,
        {"_id": 0}
    ).sort("occupation_title", 1).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "total": len(templates)
        }
    }

@router.get("/categories", response_model=Dict)
async def get_categories(db = Depends(get_db)):
    """
    Get list of all occupation categories
    """
    
    categories = await db.occupation_templates.distinct("occupation_category", {"is_active": True})
    
    return {
        "success": True,
        "data": {
            "categories": sorted(categories)
        }
    }

@router.get("/{template_id}", response_model=Dict)
async def get_template_details(
    template_id: str,
    province: str = Query(None, description="Get suggested rate for specific province"),
    db = Depends(get_db)
):
    """
    Get detailed information about an occupation template
    """
    
    template = await db.occupation_templates.find_one(
        {"template_id": template_id, "is_active": True},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # If province specified, extract the rate for that province
    if province and template.get('suggested_rates'):
        template['suggested_rate_for_province'] = template['suggested_rates'].get(province)
    
    return {
        "success": True,
        "data": template
    }

# ADMIN ENDPOINTS

@router.post("/admin/create", response_model=Dict)
async def create_occupation_template(
    template_data: OccupationTemplateCreate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Super-admin creates a new occupation template
    """
    
    # Check if template with same title already exists
    existing = await db.occupation_templates.find_one({
        "occupation_title": template_data.occupation_title,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with title '{template_data.occupation_title}' already exists"
        )
    
    template_id = f"occ_tpl_{uuid.uuid4().hex[:12]}"
    
    template = {
        "template_id": template_id,
        **template_data.dict(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user['user_id']
    }
    
    await db.occupation_templates.insert_one(template)
    
    return {
        "success": True,
        "data": {
            "template_id": template_id,
            "occupation_title": template_data.occupation_title
        },
        "message": "Occupation template created successfully"
    }

@router.put("/admin/{template_id}", response_model=Dict)
async def update_occupation_template(
    template_id: str,
    update_data: OccupationTemplateUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Super-admin updates an occupation template
    """
    
    template = await db.occupation_templates.find_one({"template_id": template_id})
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Build update dict (only include non-None fields)
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.occupation_templates.update_one(
        {"template_id": template_id},
        {"$set": update_dict}
    )
    
    return {
        "success": True,
        "message": "Template updated successfully",
        "data": {
            "template_id": template_id
        }
    }

@router.delete("/admin/{template_id}", response_model=Dict)
async def deactivate_occupation_template(
    template_id: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Super-admin deactivates an occupation template
    (Soft delete - sets is_active to False)
    """
    
    template = await db.occupation_templates.find_one({"template_id": template_id})
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    await db.occupation_templates.update_one(
        {"template_id": template_id},
        {"$set": {
            "is_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Template deactivated successfully"
    }

@router.get("/admin/list-all", response_model=Dict)
async def admin_list_all_templates(
    include_inactive: bool = Query(False, description="Include inactive templates"),
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Super-admin views all occupation templates (including inactive)
    """
    
    query = {} if include_inactive else {"is_active": True}
    
    templates = await db.occupation_templates.find(
        query,
        {"_id": 0}
    ).sort("occupation_title", 1).to_list(1000)
    
    return {
        "success": True,
        "data": {
            "templates": templates,
            "total": len(templates)
        }
    }

@router.post("/admin/seed-defaults", response_model=Dict)
async def seed_default_templates(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Seed the database with default occupation templates
    Common hospitality, retail, and service positions
    """
    
    default_templates = [
        {
            "occupation_title": "Server",
            "occupation_category": "Food Service",
            "description": "Provides table service in restaurants, takes orders, serves food and beverages",
            "suggested_rates": {
                "ON": 18.50,
                "BC": 19.00,
                "AB": 18.00,
                "QC": 17.50
            },
            "required_skills": ["Customer Service", "Food Safety", "POS Systems"],
            "required_certifications": ["Smart Serve", "Food Handler"],
            "min_experience_years": 0,
            "typical_duties": [
                "Greet and seat guests",
                "Take food and drink orders",
                "Serve meals and beverages",
                "Process payments",
                "Maintain table cleanliness"
            ]
        },
        {
            "occupation_title": "Bartender",
            "occupation_category": "Food Service",
            "description": "Prepares and serves alcoholic and non-alcoholic beverages",
            "suggested_rates": {
                "ON": 20.00,
                "BC": 21.00,
                "AB": 19.50,
                "QC": 19.00
            },
            "required_skills": ["Mixology", "Customer Service", "Cash Handling"],
            "required_certifications": ["Smart Serve", "Mixology Certificate"],
            "min_experience_years": 1,
            "typical_duties": [
                "Mix and serve drinks",
                "Check identification",
                "Manage bar inventory",
                "Handle cash and payments",
                "Maintain bar cleanliness"
            ]
        },
        {
            "occupation_title": "Line Cook",
            "occupation_category": "Food Service",
            "description": "Prepares food items according to recipes and standards",
            "suggested_rates": {
                "ON": 22.00,
                "BC": 23.00,
                "AB": 21.50,
                "QC": 20.50
            },
            "required_skills": ["Food Preparation", "Knife Skills", "Kitchen Safety"],
            "required_certifications": ["Food Handler"],
            "min_experience_years": 1,
            "typical_duties": [
                "Prepare ingredients",
                "Cook menu items",
                "Maintain food quality standards",
                "Keep workstation clean",
                "Follow recipes and procedures"
            ]
        },
        {
            "occupation_title": "Dishwasher",
            "occupation_category": "Food Service",
            "description": "Cleans dishes, utensils, and kitchen equipment",
            "suggested_rates": {
                "ON": 17.00,
                "BC": 17.50,
                "AB": 16.50,
                "QC": 16.00
            },
            "required_skills": ["Physical Stamina", "Time Management"],
            "required_certifications": [],
            "min_experience_years": 0,
            "typical_duties": [
                "Wash dishes and utensils",
                "Clean kitchen equipment",
                "Maintain dishwashing area",
                "Dispose of garbage",
                "Support kitchen staff"
            ]
        },
        {
            "occupation_title": "Cashier",
            "occupation_category": "Retail",
            "description": "Handles customer transactions and provides service",
            "suggested_rates": {
                "ON": 17.50,
                "BC": 18.00,
                "AB": 17.00,
                "QC": 16.50
            },
            "required_skills": ["Cash Handling", "Customer Service", "POS Systems"],
            "required_certifications": [],
            "min_experience_years": 0,
            "typical_duties": [
                "Process transactions",
                "Handle cash and cards",
                "Provide customer service",
                "Maintain register accuracy",
                "Answer customer questions"
            ]
        },
        {
            "occupation_title": "Host/Hostess",
            "occupation_category": "Food Service",
            "description": "Greets guests and manages seating arrangements",
            "suggested_rates": {
                "ON": 17.50,
                "BC": 18.00,
                "AB": 17.00,
                "QC": 16.50
            },
            "required_skills": ["Customer Service", "Communication", "Organization"],
            "required_certifications": [],
            "min_experience_years": 0,
            "typical_duties": [
                "Greet and welcome guests",
                "Manage reservations",
                "Coordinate seating",
                "Maintain waiting list",
                "Answer phone inquiries"
            ]
        }
    ]
    
    created_count = 0
    
    for template_data in default_templates:
        # Check if already exists
        existing = await db.occupation_templates.find_one({
            "occupation_title": template_data["occupation_title"],
            "is_active": True
        })
        
        if not existing:
            template_id = f"occ_tpl_{uuid.uuid4().hex[:12]}"
            
            template = {
                "template_id": template_id,
                **template_data,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user['user_id']
            }
            
            await db.occupation_templates.insert_one(template)
            created_count += 1
    
    return {
        "success": True,
        "message": f"Created {created_count} default occupation templates",
        "data": {
            "created_count": created_count,
            "total_templates": len(default_templates)
        }
    }
