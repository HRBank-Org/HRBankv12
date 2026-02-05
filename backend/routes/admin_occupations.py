from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
from auth.dependencies import get_current_user, require_role
import json
import os

router = APIRouter(prefix="/api/admin/occupations", tags=["Admin - Occupations Management"])

# Path to occupation categories file
CATEGORIES_FILE = os.path.join(os.path.dirname(__file__), '..', 'utils', 'occupation_categories.py')

def get_db():
    from server import db
    return db

def read_categories_file():
    """Read and parse the occupation categories file"""
    from utils.occupation_categories import OCCUPATION_CATEGORIES
    return OCCUPATION_CATEGORIES

def write_categories_file(categories_dict):
    """Write updated categories back to file"""
    content = '''"""
Comprehensive occupation categories and titles for HR Bank
Organized by industry sectors with common job titles
"""

# Platform-wide minimum wage (Ontario default)
MINIMUM_WAGE = 17.20

# Platform fee structure
PLATFORM_FEE_PER_HOUR = 1.00  # $1.00 per worked hour
PLATFORM_FEE_PER_STOP = 0.25  # $0.25 per stop for route-based workers

OCCUPATION_CATEGORIES = '''
    content += json.dumps(categories_dict, indent=4, ensure_ascii=False)
    content += '''

def get_all_categories():
    """Return list of all category names"""
    return list(OCCUPATION_CATEGORIES.keys())

def get_category_occupations(category):
    """Return occupations for a specific category"""
    return OCCUPATION_CATEGORIES.get(category, {}).get("occupations", [])

def get_all_occupations():
    """Return flat list of all occupations"""
    all_occupations = []
    for category_data in OCCUPATION_CATEGORIES.values():
        all_occupations.extend(category_data.get("occupations", []))
    return all_occupations
'''
    
    with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

@router.get("/manage", response_model=Dict)
async def get_occupation_categories_admin(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Get all occupation categories for admin management"""
    categories = read_categories_file()
    
    return {
        "success": True,
        "data": {
            "categories": categories,
            "total_categories": len(categories)
        }
    }

@router.post("/categories", response_model=Dict)
async def add_occupation_category(
    category_data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Add a new occupation category (Super Admin only)"""
    
    # Check if super admin - check user_type from current_user
    if current_user.get("user_type") != "super_admin":
        # Also check admins collection as fallback
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can add categories"
            )
    
    name = category_data.get('name')
    icon = category_data.get('icon', '📋')
    description = category_data.get('description', '')
    
    if not name or not description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and description are required"
        )
    
    # Load existing categories
    categories = read_categories_file()
    
    # Check if already exists
    if name in categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists"
        )
    
    # Add new category
    categories[name] = {
        "icon": icon,
        "description": description,
        "occupations": []
    }
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Category '{name}' added successfully"
    }

@router.delete("/categories/{category_name}", response_model=Dict)
async def delete_occupation_category(
    category_name: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Delete an occupation category (Super Admin only)"""
    
    # Check if super admin
    if current_user.get("user_type") != "super_admin":
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can delete categories"
            )
    
    # Load existing categories
    categories = read_categories_file()
    
    if category_name not in categories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Delete category
    del categories[category_name]
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Category '{category_name}' deleted successfully"
    }

@router.post("/add", response_model=Dict)
async def add_occupation_to_category(
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Add an occupation to a category (Super Admin only)"""
    
    # Check if super admin
    if current_user.get("user_type") != "super_admin":
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can add occupations"
            )
    
    category = data.get('category')
    occupation_title = data.get('occupation')
    minimum_hourly_rate = data.get('minimum_hourly_rate', 17.20)  # Default to Ontario minimum
    required_certifications = data.get('required_certifications', [])
    
    if not category or not occupation_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category and occupation are required"
        )
    
    if not minimum_hourly_rate or float(minimum_hourly_rate) <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid minimum hourly rate is required"
        )
    
    # Load existing categories
    categories = read_categories_file()
    
    if category not in categories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if occupation already exists (check both string format and dict format)
    occupations_list = categories[category]["occupations"]
    for occ in occupations_list:
        # Handle both old string format and new dict format
        occ_title = occ if isinstance(occ, str) else occ.get("title", "")
        if occ_title == occupation_title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Occupation already exists in this category"
            )
    
    # Add occupation as object with rate and certifications
    occupation_obj = {
        "title": occupation_title,
        "minimum_hourly_rate": float(minimum_hourly_rate),
        "required_certifications": required_certifications
    }
    categories[category]["occupations"].append(occupation_obj)
    
    # Also update occupation_templates collection in database
    from datetime import datetime, timezone
    from uuid import uuid4
    await db.occupation_templates.update_one(
        {"title": occupation_title},
        {"$set": {
            "template_id": f"occ_{str(uuid4())[:8]}",
            "title": occupation_title,
            "category": category,
            "minimum_rate": float(minimum_hourly_rate),
            "required_certifications": required_certifications,
            "updated_at": datetime.now(timezone.utc),
            "is_active": True
        }},
        upsert=True
    )
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Occupation '{occupation_title}' added to '{category}'"
    }

@router.delete("/remove", response_model=Dict)
async def remove_occupation_from_category(
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """Remove an occupation from a category (Super Admin only)"""
    
    # Check if super admin
    if current_user.get("user_type") != "super_admin":
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can remove occupations"
            )
    
    category = data.get('category')
    occupation = data.get('occupation')
    
    if not category or not occupation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category and occupation are required"
        )
    
    # Load existing categories
    categories = read_categories_file()
    
    if category not in categories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Remove occupation (handle both string and dict formats)
    occupations_list = categories[category]["occupations"]
    found = False
    for i, occ in enumerate(occupations_list):
        occ_title = occ if isinstance(occ, str) else occ.get("title", "")
        if occ_title == occupation:
            del occupations_list[i]
            found = True
            break
    
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Occupation not found in this category"
        )
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Occupation '{occupation}' removed from '{category}'"
    }


@router.post("/migrate-to-object-format", response_model=Dict)
async def migrate_occupations_to_object_format(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Auto-migrate occupations from string format to object format with smart certification matching
    This is a one-time migration to add certification requirements to occupations
    """
    
    # Check if super admin
    if current_user.get("user_type") != "super_admin":
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can run migrations"
            )
    
    # Smart matching rules - map occupation titles to certification names
    # This matches common occupation names to their typical certifications
    smart_matches = {
        # Healthcare
        "Registered Nurse (RN)": ["Registered Nurse (RN)", "CPR/First Aid Certification"],
        "Licensed Practical Nurse (LPN)": ["Registered Practical Nurse (RPN)", "CPR/First Aid Certification"],
        "Registered Practical Nurse (RPN)": ["Registered Practical Nurse (RPN)", "CPR/First Aid Certification"],
        "Personal Support Worker (PSW)": ["Personal Support Worker (PSW) Certificate", "CPR/First Aid Certification"],
        "Caregiver": ["Personal Support Worker (PSW) Certificate", "CPR/First Aid Certification"],
        "Home Care Aide": ["Personal Support Worker (PSW) Certificate", "CPR/First Aid Certification"],
        "Pharmacy Technician": ["Ontario College Diploma"],
        "Dental Assistant": ["Ontario College Certificate"],
        "Dental Hygienist": ["Ontario College Diploma"],
        "Registered Massage Therapist (RMT)": ["Ontario College Diploma"],
        
        # Food Service
        "Server / Waiter / Waitress": ["Food Handler Certificate"],
        "Bartender": ["Smart Serve Certificate", "Food Handler Certificate"],
        "Line Cook": ["Food Handler Certificate"],
        "Prep Cook": ["Food Handler Certificate"],
        "Fast Food Worker": ["Food Handler Certificate"],
        "Food Runner": ["Food Handler Certificate"],
        "Kitchen Manager": ["Food Handler Certificate"],
        "Restaurant Manager": ["Food Handler Certificate", "Smart Serve Certificate"],
        
        # Trades
        "Electrician": ["Electrical License", "Certificate of Qualification (Red Seal)"],
        "Plumber": ["Certificate of Qualification (Red Seal)"],
        "HVAC Technician": ["Certificate of Qualification (Red Seal)"],
        "Carpenter": ["Certificate of Qualification (Red Seal)"],
        "Welder": ["Certificate of Qualification (Red Seal)"],
        
        # Safety-related
        "Construction Worker": ["WHMIS 2015 Certificate", "Working at Heights Certificate"],
        "Warehouse Worker": ["WHMIS 2015 Certificate", "Forklift Operator Certificate"],
        "Forklift Operator": ["Forklift Operator Certificate", "WHMIS 2015 Certificate"],
        
        # Security
        "Security Guard": ["Security Guard License"],
        
        # Transport
        "Delivery Driver": ["Ontario Driver's License (G)"],
        "Truck Driver": ["Commercial Driver's License (AZ)"],
    }
    
    # Load existing categories
    categories = read_categories_file()
    
    migrated_count = 0
    already_migrated_count = 0
    updated_count = 0
    
    # Helper function to get certifications for an occupation title
    def get_certifications_for_title(occupation_title):
        # Exact match
        if occupation_title in smart_matches:
            return smart_matches[occupation_title]
        
        # Partial match - check if any keyword matches
        title_lower = occupation_title.lower()
        
        if "nurse" in title_lower or "rn" in title_lower:
            return ["CPR/First Aid Certification"]
        elif "psw" in title_lower or "support worker" in title_lower:
            return ["Personal Support Worker (PSW) Certificate"]
        elif "cook" in title_lower or "chef" in title_lower or "food" in title_lower:
            return ["Food Handler Certificate"]
        elif "bartender" in title_lower or "bar" in title_lower:
            return ["Smart Serve Certificate", "Food Handler Certificate"]
        elif "server" in title_lower or "waiter" in title_lower or "waitress" in title_lower:
            return ["Food Handler Certificate"]
        elif "security" in title_lower or "guard" in title_lower:
            return ["Security Guard License"]
        elif "electrician" in title_lower:
            return ["Electrical License"]
        elif "driver" in title_lower:
            if "truck" in title_lower or "commercial" in title_lower:
                return ["Commercial Driver's License (AZ)"]
            else:
                return ["Ontario Driver's License (G)"]
        elif "forklift" in title_lower:
            return ["Forklift Operator Certificate"]
        elif "construction" in title_lower or "laborer" in title_lower:
            return ["WHMIS 2015 Certificate", "Working at Heights Certificate"]
        elif "warehouse" in title_lower:
            return ["WHMIS 2015 Certificate"]
        
        return []
    
    # Process each category
    for category_name, category_data in categories.items():
        occupations_list = category_data.get("occupations", [])
        new_occupations = []
        
        for occ in occupations_list:
            # Check if already in object format
            if isinstance(occ, dict):
                occupation_title = occ.get("title", "")
                existing_certs = occ.get("required_certifications", [])
                
                # If no certifications, try to add them via smart matching
                if not existing_certs:
                    smart_certs = get_certifications_for_title(occupation_title)
                    if smart_certs:
                        occ["required_certifications"] = smart_certs
                        updated_count += 1
                    else:
                        occ["required_certifications"] = []
                
                already_migrated_count += 1
                new_occupations.append(occ)
            else:
                # It's a string - migrate it
                occupation_title = occ
                required_certs = get_certifications_for_title(occupation_title)
                
                # Create object format
                occupation_obj = {
                    "title": occupation_title,
                    "required_certifications": required_certs
                }
                new_occupations.append(occupation_obj)
                migrated_count += 1
        
        # Update the category with migrated occupations
        categories[category_name]["occupations"] = new_occupations
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Migration complete! Migrated {migrated_count} new occupations, updated {updated_count} with certifications, {already_migrated_count - updated_count} already had certifications",
        "data": {
            "migrated_count": migrated_count,
            "updated_with_certifications": updated_count,
            "already_migrated": already_migrated_count,
            "total_occupations": migrated_count + already_migrated_count
        }
    }


@router.put("/update-certifications", response_model=Dict)
async def update_occupation_certifications(
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Update certification requirements for a specific occupation
    Body: {
        "category": "Healthcare & Personal Care",
        "occupation_title": "Registered Nurse (RN)",
        "required_certifications": ["Registered Nurse (RN)", "CPR/First Aid Certification"]
    }
    """
    
    # Check if super admin
    if current_user.get("user_type") != "super_admin":
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can update certifications"
            )
    
    category = data.get('category')
    occupation_title = data.get('occupation_title')
    required_certifications = data.get('required_certifications', [])
    
    if not category or not occupation_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category and occupation_title are required"
        )
    
    # Load existing categories
    categories = read_categories_file()
    
    if category not in categories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Find and update the occupation
    occupations_list = categories[category]["occupations"]
    found = False
    
    for i, occ in enumerate(occupations_list):
        # Get title (handle both string and object format)
        occ_title = occ if isinstance(occ, str) else occ.get("title", "")
        
        if occ_title == occupation_title:
            # Update to object format with new certifications
            occupations_list[i] = {
                "title": occupation_title,
                "required_certifications": required_certifications
            }
            found = True
            break
    
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Occupation not found in this category"
        )
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Updated certifications for '{occupation_title}'",
        "data": {
            "occupation_title": occupation_title,
            "required_certifications": required_certifications
        }
    }


@router.get("/occupation-certifications/{occupation_title}")
async def get_occupation_required_certifications(
    occupation_title: str,
    current_user: dict = Depends(get_current_user)
):
    """
    PUBLIC endpoint to get required certifications for a specific occupation title
    Used by both employers (job posting) and workforce (profile viewing)
    Returns empty array if occupation has no linked certifications
    """
    
    # Load occupation categories
    categories = read_categories_file()
    
    # Search through all categories for this occupation
    required_certifications = []
    found_category = None
    
    for category_name, category_data in categories.items():
        occupations_list = category_data.get("occupations", [])
        
        for occ in occupations_list:
            # Handle both string and object format
            if isinstance(occ, dict):
                occ_title = occ.get("title", "")
                certs = occ.get("required_certifications", [])
            else:
                occ_title = occ
                certs = []
            
            # Case-insensitive match
            if occ_title.lower() == occupation_title.lower():
                required_certifications = certs
                found_category = category_name
                break
        
        if found_category:
            break
    
    return {
        "success": True,
        "data": {
            "occupation_title": occupation_title,
            "category": found_category,
            "required_certifications": required_certifications,
            "has_requirements": len(required_certifications) > 0
        }
    }



@router.get("/minimum-rate/{occupation_title}")
async def get_occupation_minimum_rate(
    occupation_title: str,
    province_code: str = "ON",
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get minimum hourly rate for an occupation, considering both:
    1. Occupation-specific minimum rate (from occupation templates)
    2. Provincial minimum wage
    Returns the HIGHER of the two to ensure compliance
    """
    
    # Get provincial minimum wage
    province_wage = await db.minimum_wages.find_one(
        {"province_code": province_code},
        {"_id": 0}
    )
    provincial_min = province_wage.get("general_rate", 15.00) if province_wage else 15.00
    
    # Get occupation template rate from database
    template = await db.occupation_templates.find_one(
        {"title": {"$regex": f"^{occupation_title}$", "$options": "i"}},
        {"_id": 0}
    )
    occupation_min = template.get("minimum_rate", provincial_min) if template else provincial_min
    
    # Also check the file-based categories for backward compatibility
    categories = read_categories_file()
    for category_name, category_data in categories.items():
        for occ in category_data.get("occupations", []):
            if isinstance(occ, dict):
                if occ.get("title", "").lower() == occupation_title.lower():
                    file_rate = occ.get("minimum_hourly_rate", 0)
                    if file_rate > occupation_min:
                        occupation_min = file_rate
                    break
    
    # Return the higher of occupation minimum and provincial minimum
    effective_min = max(occupation_min, provincial_min)
    
    return {
        "success": True,
        "data": {
            "occupation_title": occupation_title,
            "province_code": province_code,
            "occupation_minimum_rate": occupation_min,
            "provincial_minimum_wage": provincial_min,
            "effective_minimum_rate": effective_min,
            "note": f"Rate must be at least ${effective_min:.2f}/hr to comply with {province_code} law"
        }
    }


@router.get("/required-certifications/{occupation_title}")
async def get_required_certifications(
    occupation_title: str,
    province_code: str = "ON",
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get required certifications for an occupation based on province.
    Returns both occupation-specific and province-mandated certifications.
    """
    
    # Get occupation category from templates (use partial match for flexibility)
    template = await db.occupation_templates.find_one(
        {"title": {"$regex": occupation_title, "$options": "i"}},
        {"_id": 0}
    )
    
    # Also try file-based categories if not found in database
    occupation_category = "General"
    occupation_certs = []
    
    if template:
        occupation_category = template.get("category", "General")
        occupation_certs = template.get("required_certifications", [])
    else:
        # Check file-based categories
        categories = read_categories_file()
        for cat_name, cat_data in categories.items():
            for occ in cat_data.get("occupations", []):
                occ_title = occ.get("title", occ) if isinstance(occ, dict) else occ
                if occupation_title.lower() in occ_title.lower():
                    occupation_category = cat_name
                    occupation_certs = occ.get("required_certifications", []) if isinstance(occ, dict) else []
                    break
    
    # Get provincial certifications for this category
    provincial_req = await db.provincial_certifications.find_one(
        {"province_code": province_code, "occupation_category": occupation_category},
        {"_id": 0}
    )
    
    provincial_certs = provincial_req.get("certifications", []) if provincial_req else []
    
    # Merge certifications (provincial + occupation-specific)
    all_certs = []
    cert_names = set()
    
    # Add provincial certifications first (they are mandated by law)
    for cert in provincial_certs:
        if isinstance(cert, dict):
            all_certs.append({
                "name": cert.get("name"),
                "required": cert.get("required", True),
                "source": "provincial",
                "description": cert.get("description", ""),
                "province_code": province_code
            })
            cert_names.add(cert.get("name", "").lower())
        else:
            all_certs.append({
                "name": cert,
                "required": True,
                "source": "provincial",
                "province_code": province_code
            })
            cert_names.add(cert.lower())
    
    # Add occupation-specific certifications (not already in provincial)
    for cert in occupation_certs:
        cert_name = cert if isinstance(cert, str) else cert.get("name", cert)
        if cert_name.lower() not in cert_names:
            all_certs.append({
                "name": cert_name,
                "required": True,
                "source": "occupation",
                "description": f"Required for {occupation_title}"
            })
    
    return {
        "success": True,
        "data": {
            "occupation_title": occupation_title,
            "occupation_category": occupation_category,
            "province_code": province_code,
            "required_certifications": all_certs,
            "total_required": len([c for c in all_certs if c.get("required", True)]),
            "note": f"Certifications required for {occupation_title} in {province_code}"
        }
    }


@router.get("/provincial-certifications")
async def list_provincial_certifications(
    province_code: str = None,
    category: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List all provincial certification requirements.
    Can filter by province_code and/or occupation category.
    """
    
    query = {}
    if province_code:
        query["province_code"] = province_code
    if category:
        query["occupation_category"] = {"$regex": category, "$options": "i"}
    
    certs = await db.provincial_certifications.find(query, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "data": {
            "certifications": certs,
            "total": len(certs)
        }
    }



@router.get("/default-work-type/{occupation_title}")
async def get_occupation_default_work_type(
    occupation_title: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get the default work type for an occupation.
    This is managed by super-admin at the template level.
    Employers can override this when creating roles.
    
    Work Types:
    - on_site: Standard GPS clock-in at workplace (Server, Chef, Cashier)
    - route_based: Multi-stop tasks with GPS at each location (Delivery Driver, Cleaner)  
    - continental: 12-hour rotating shifts (Security Guard, Factory Worker)
    """
    from utils.occupation_categories import get_default_work_type, DEFAULT_WORK_TYPES
    
    # First check if there's a template in the database with explicit work type
    template = await db.occupation_templates.find_one(
        {"occupation_title": {"$regex": f"^{occupation_title}$", "$options": "i"}},
        {"_id": 0, "default_work_type": 1, "occupation_title": 1}
    )
    
    if template and template.get("default_work_type"):
        default_type = template["default_work_type"]
        source = "database_template"
    else:
        # Fall back to the utility function
        default_type = get_default_work_type(occupation_title)
        source = "category_mapping"
    
    # Get description for the work type
    work_type_descriptions = {
        "on_site": "Standard shifts at workplace location with GPS clock-in",
        "route_based": "Multi-stop tasks at different locations with GPS tracking at each stop",
        "continental": "12-hour rotating shift patterns (DuPont/Panama/Pitman)"
    }
    
    return {
        "success": True,
        "data": {
            "occupation_title": occupation_title,
            "default_work_type": default_type,
            "work_type_description": work_type_descriptions.get(default_type, ""),
            "source": source,
            "can_override": True,
            "available_work_types": [
                {"value": "on_site", "label": "On-Site", "icon": "🏢", "description": work_type_descriptions["on_site"]},
                {"value": "route_based", "label": "Route-Based", "icon": "🚗", "description": work_type_descriptions["route_based"]},
                {"value": "continental", "label": "Continental", "icon": "🔄", "description": work_type_descriptions["continental"]}
            ]
        }
    }


@router.put("/default-work-type/{occupation_title}")
async def update_occupation_default_work_type(
    occupation_title: str,
    data: dict,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Super-admin endpoint to update the default work type for an occupation template.
    This affects all new roles created from this occupation.
    """
    
    # Check if super admin
    if current_user.get("user_type") != "super_admin":
        admin = await db.admins.find_one({"user_id": current_user["user_id"]})
        if not admin or not admin.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can update default work types"
            )
    
    new_work_type = data.get("default_work_type")
    
    valid_types = ["on_site", "route_based", "continental"]
    if new_work_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid work type. Must be one of: {valid_types}"
        )
    
    # Update the occupation template in database
    from datetime import datetime, timezone
    result = await db.occupation_templates.update_one(
        {"occupation_title": {"$regex": f"^{occupation_title}$", "$options": "i"}},
        {
            "$set": {
                "default_work_type": new_work_type,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        # Create a new template entry if one doesn't exist
        from uuid import uuid4
        await db.occupation_templates.insert_one({
            "template_id": f"occ_tpl_{uuid4().hex[:12]}",
            "occupation_title": occupation_title,
            "default_work_type": new_work_type,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["user_id"]
        })
    
    return {
        "success": True,
        "message": f"Default work type for '{occupation_title}' updated to '{new_work_type}'",
        "data": {
            "occupation_title": occupation_title,
            "default_work_type": new_work_type
        }
    }
