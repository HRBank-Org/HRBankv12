from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict
from datetime import datetime
from database import get_database
from auth.dependencies import get_current_user
from models.occupation_templates import (
    OccupationTemplate,
    CreateOccupationTemplateRequest,
    UpdateOccupationTemplateRequest,
    MinimumRequirements,
    CertificationRequirement,
    SkillRequirement,
    ExperienceRequirement,
    PhysicalRequirement,
    OtherRequirement
)
import uuid

router = APIRouter()

# Helper function to seed initial templates
async def seed_occupation_templates(db, admin_id: str):
    """Seed database with 5 example occupation templates"""
    
    # Check if templates already exist
    existing = await db.occupation_templates.count_documents({})
    if existing > 0:
        return  # Already seeded
    
    templates = [
        {
            "template_id": str(uuid.uuid4()),
            "name": "Security Guard",
            "category": "Security",
            "description": "Monitors premises, patrols property, responds to incidents, and ensures safety and security of people and assets.",
            "minimum_requirements": {
                "certifications": [
                    {"name": "Security Guard License", "required": True, "expiry_tracked": True},
                    {"name": "First Aid/CPR", "required": True, "expiry_tracked": True}
                ],
                "skills": [
                    {"name": "Conflict Resolution", "required": True, "proficiency_level": "intermediate"},
                    {"name": "Report Writing", "required": True, "proficiency_level": "basic"}
                ],
                "experience": {
                    "minimum_months": 6,
                    "preferred_months": 12
                },
                "physical_requirements": [
                    {"name": "Able to stand for 8+ hours", "required": True},
                    {"name": "Able to lift 25 lbs", "required": False}
                ],
                "other_requirements": [
                    {"name": "Clean criminal record check", "required": True},
                    {"name": "Valid driver's license", "required": False}
                ]
            },
            "created_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "active": True
        },
        {
            "template_id": str(uuid.uuid4()),
            "name": "Bartender",
            "category": "Hospitality",
            "description": "Prepares and serves beverages, provides customer service, manages cash, and maintains bar cleanliness and inventory.",
            "minimum_requirements": {
                "certifications": [
                    {"name": "Smart Serve", "required": True, "expiry_tracked": True},
                    {"name": "Food Handler Certificate", "required": True, "expiry_tracked": True}
                ],
                "skills": [
                    {"name": "Mixology", "required": True, "proficiency_level": "intermediate"},
                    {"name": "Customer Service", "required": True, "proficiency_level": "advanced"},
                    {"name": "Cash Handling", "required": True, "proficiency_level": "basic"}
                ],
                "experience": {
                    "minimum_months": 3,
                    "preferred_months": 12
                },
                "physical_requirements": [
                    {"name": "Able to stand for 8+ hours", "required": True},
                    {"name": "Able to lift 50 lbs (kegs)", "required": True}
                ],
                "other_requirements": []
            },
            "created_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "active": True
        },
        {
            "template_id": str(uuid.uuid4()),
            "name": "Driver (Truck)",
            "category": "Transportation",
            "description": "Operates commercial vehicles, transports goods, performs vehicle inspections, and maintains delivery schedules and documentation.",
            "minimum_requirements": {
                "certifications": [
                    {"name": "Class A/AZ License", "required": True, "expiry_tracked": True},
                    {"name": "Dangerous Goods Certificate", "required": False, "expiry_tracked": True}
                ],
                "skills": [
                    {"name": "Route Planning", "required": True, "proficiency_level": "basic"},
                    {"name": "Vehicle Inspection", "required": True, "proficiency_level": "intermediate"}
                ],
                "experience": {
                    "minimum_months": 12,
                    "preferred_months": 24
                },
                "physical_requirements": [
                    {"name": "Able to sit for 8+ hours", "required": True},
                    {"name": "Able to lift 50 lbs", "required": True}
                ],
                "other_requirements": [
                    {"name": "Clean driving record", "required": True},
                    {"name": "Cross-border clearance", "required": False}
                ]
            },
            "created_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "active": True
        },
        {
            "template_id": str(uuid.uuid4()),
            "name": "PSW (Personal Support Worker)",
            "category": "Healthcare",
            "description": "Provides personal care and support to clients, assists with daily activities, administers medications, and maintains documentation.",
            "minimum_requirements": {
                "certifications": [
                    {"name": "PSW Certificate", "required": True, "expiry_tracked": False},
                    {"name": "First Aid/CPR", "required": True, "expiry_tracked": True},
                    {"name": "Vulnerable Sector Check", "required": True, "expiry_tracked": True}
                ],
                "skills": [
                    {"name": "Patient Care", "required": True, "proficiency_level": "advanced"},
                    {"name": "Medication Administration", "required": True, "proficiency_level": "intermediate"},
                    {"name": "Documentation", "required": True, "proficiency_level": "basic"}
                ],
                "experience": {
                    "minimum_months": 6,
                    "preferred_months": 12
                },
                "physical_requirements": [
                    {"name": "Able to lift 50+ lbs (patient transfers)", "required": True},
                    {"name": "Able to stand/walk for 8+ hours", "required": True}
                ],
                "other_requirements": [
                    {"name": "Clean criminal record check", "required": True},
                    {"name": "Immunization records", "required": True}
                ]
            },
            "created_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "active": True
        },
        {
            "template_id": str(uuid.uuid4()),
            "name": "Construction Labourer",
            "category": "Construction",
            "description": "Performs manual labor tasks, operates basic tools and equipment, assists skilled trades, and maintains site safety and cleanliness.",
            "minimum_requirements": {
                "certifications": [
                    {"name": "WHMIS", "required": True, "expiry_tracked": True},
                    {"name": "Working at Heights", "required": True, "expiry_tracked": True},
                    {"name": "Fall Protection", "required": False, "expiry_tracked": True}
                ],
                "skills": [
                    {"name": "Basic Hand Tools", "required": True, "proficiency_level": "intermediate"},
                    {"name": "Safety Protocols", "required": True, "proficiency_level": "basic"}
                ],
                "experience": {
                    "minimum_months": 3,
                    "preferred_months": 12
                },
                "physical_requirements": [
                    {"name": "Able to lift 50+ lbs regularly", "required": True},
                    {"name": "Able to work outdoors in all weather", "required": True},
                    {"name": "Able to climb ladders and scaffolding", "required": True}
                ],
                "other_requirements": [
                    {"name": "Steel-toed boots", "required": True}
                ]
            },
            "created_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "active": True
        }
    ]
    
    await db.occupation_templates.insert_many(templates)
    print(f"✓ Seeded {len(templates)} occupation templates")


@router.post("/admin/occupation-templates/seed")
async def seed_templates(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Seed database with example occupation templates (Admin only)"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await seed_occupation_templates(db, current_user["user_id"])
    
    return {
        "success": True,
        "message": "Occupation templates seeded successfully"
    }


@router.get("/occupation-templates")
async def get_all_templates(
    active_only: bool = True,
    db = Depends(get_database)
):
    """Get all occupation templates (public endpoint for dropdowns)"""
    query = {"active": True} if active_only else {}
    
    templates = await db.occupation_templates.find(
        query,
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    return {
        "success": True,
        "data": templates
    }


@router.get("/occupation-templates/{template_id}")
async def get_template_by_id(
    template_id: str,
    db = Depends(get_database)
):
    """Get single occupation template by ID"""
    template = await db.occupation_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "success": True,
        "data": template
    }


@router.post("/admin/occupation-templates")
async def create_template(
    request: CreateOccupationTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create new occupation template (Admin only)"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if template with same name exists
    existing = await db.occupation_templates.find_one({"name": request.name})
    if existing:
        raise HTTPException(status_code=400, detail="Template with this name already exists")
    
    template = {
        "template_id": str(uuid.uuid4()),
        "name": request.name,
        "category": request.category,
        "description": request.description,
        "minimum_requirements": request.minimum_requirements.dict(),
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "active": True
    }
    
    await db.occupation_templates.insert_one(template)
    
    return {
        "success": True,
        "data": template,
        "message": "Template created successfully"
    }


@router.put("/admin/occupation-templates/{template_id}")
async def update_template(
    template_id: str,
    request: UpdateOccupationTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update occupation template (Admin only)"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    template = await db.occupation_templates.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {}
    if request.name is not None:
        update_data["name"] = request.name
    if request.category is not None:
        update_data["category"] = request.category
    if request.description is not None:
        update_data["description"] = request.description
    if request.minimum_requirements is not None:
        update_data["minimum_requirements"] = request.minimum_requirements.dict()
    if request.active is not None:
        update_data["active"] = request.active
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.occupation_templates.update_one(
        {"template_id": template_id},
        {"$set": update_data}
    )
    
    # Get updated template
    updated = await db.occupation_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "data": updated,
        "message": "Template updated successfully"
    }


@router.delete("/admin/occupation-templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Soft delete occupation template (Admin only) - marks as inactive"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    template = await db.occupation_templates.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Soft delete - mark as inactive
    await db.occupation_templates.update_one(
        {"template_id": template_id},
        {"$set": {"active": False, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "message": "Template marked as inactive"
    }
