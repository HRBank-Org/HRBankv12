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
    
    # Check if super admin
    admin_profile = await db.admin_profiles.find_one({"admin_id": current_user["user_id"]})
    if not admin_profile or not admin_profile.get("is_super_admin"):
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
    
    # Check if super admin
    admin_profile = await db.admin_profiles.find_one({"admin_id": current_user["user_id"]})
    if not admin_profile or not admin_profile.get("is_super_admin"):
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
    
    # Check if super admin
    admin_profile = await db.admin_profiles.find_one({"admin_id": current_user["user_id"]})
    if not admin_profile or not admin_profile.get("is_super_admin"):
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
