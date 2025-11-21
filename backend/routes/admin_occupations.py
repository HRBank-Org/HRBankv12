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
    current_user: dict = Depends(require_role("admin")),
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
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Add a new occupation category (Super Admin only)"""
    
    # Check if super admin (check admins collection, not admin_profiles)
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
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Delete an occupation category (Super Admin only)"""
    
    # Check if super admin (check admins collection, not admin_profiles)
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
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Add an occupation to a category (Super Admin only)"""
    
    # Check if super admin (check admins collection, not admin_profiles)
    admin = await db.admins.find_one({"user_id": current_user["user_id"]})
    if not admin or not admin.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can add occupations"
        )
    
    category = data.get('category')
    occupation_title = data.get('occupation')
    required_certifications = data.get('required_certifications', [])
    
    if not category or not occupation_title:
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
    
    # Add occupation as object with certifications
    occupation_obj = {
        "title": occupation_title,
        "required_certifications": required_certifications
    }
    categories[category]["occupations"].append(occupation_obj)
    
    # Write back to file
    write_categories_file(categories)
    
    return {
        "success": True,
        "message": f"Occupation '{occupation_title}' added to '{category}'"
    }

@router.delete("/remove", response_model=Dict)
async def remove_occupation_from_category(
    data: dict,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Remove an occupation from a category (Super Admin only)"""
    
    # Check if super admin (check admins collection, not admin_profiles)
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
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Auto-migrate occupations from string format to object format with smart certification matching
    This is a one-time migration to add certification requirements to occupations
    """
    
    # Check if super admin
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
    
    # Process each category
    for category_name, category_data in categories.items():
        occupations_list = category_data.get("occupations", [])
        new_occupations = []
        
        for occ in occupations_list:
            # Check if already in object format
            if isinstance(occ, dict):
                already_migrated_count += 1
                new_occupations.append(occ)
            else:
                # It's a string - migrate it
                occupation_title = occ
                
                # Smart match certifications
                required_certs = []
                
                # Exact match
                if occupation_title in smart_matches:
                    required_certs = smart_matches[occupation_title]
                else:
                    # Partial match - check if any keyword matches
                    title_lower = occupation_title.lower()
                    
                    if "nurse" in title_lower or "rn" in title_lower:
                        required_certs = ["CPR/First Aid Certification"]
                    elif "psw" in title_lower or "support worker" in title_lower:
                        required_certs = ["Personal Support Worker (PSW) Certificate"]
                    elif "cook" in title_lower or "chef" in title_lower or "food" in title_lower:
                        required_certs = ["Food Handler Certificate"]
                    elif "bartender" in title_lower or "bar" in title_lower:
                        required_certs = ["Smart Serve Certificate", "Food Handler Certificate"]
                    elif "server" in title_lower or "waiter" in title_lower or "waitress" in title_lower:
                        required_certs = ["Food Handler Certificate"]
                    elif "security" in title_lower or "guard" in title_lower:
                        required_certs = ["Security Guard License"]
                    elif "electrician" in title_lower:
                        required_certs = ["Electrical License"]
                    elif "driver" in title_lower:
                        if "truck" in title_lower or "commercial" in title_lower:
                            required_certs = ["Commercial Driver's License (AZ)"]
                        else:
                            required_certs = ["Ontario Driver's License (G)"]
                    elif "forklift" in title_lower:
                        required_certs = ["Forklift Operator Certificate"]
                    elif "construction" in title_lower or "laborer" in title_lower:
                        required_certs = ["WHMIS 2015 Certificate", "Working at Heights Certificate"]
                    elif "warehouse" in title_lower:
                        required_certs = ["WHMIS 2015 Certificate"]
                
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
        "message": f"Migration complete! Migrated {migrated_count} occupations, {already_migrated_count} already in object format",
        "data": {
            "migrated_count": migrated_count,
            "already_migrated": already_migrated_count,
            "total_occupations": migrated_count + already_migrated_count
        }
    }


@router.put("/update-certifications", response_model=Dict)
async def update_occupation_certifications(
    data: dict,
    current_user: dict = Depends(require_role("admin")),
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

