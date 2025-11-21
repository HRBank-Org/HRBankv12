from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from auth.dependencies import get_current_user, require_role
import json
import os

router = APIRouter(prefix="/api/admin/certifications", tags=["Admin - Certifications Management"])

# Path to certifications file
CERTIFICATIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'utils', 'standard_certifications.py')

def get_db():
    from server import db
    return db

def read_certifications_file():
    """Read and parse the certifications file"""
    from utils.standard_certifications import STANDARD_CERTIFICATIONS
    return STANDARD_CERTIFICATIONS

def write_certifications_file(certifications_dict):
    """Write updated certifications back to file"""
    content = '''"""
Standard Certifications for Canadian Workforce
Based on Government of Canada and Ontario provincial standards
Organized by category for easier management
"""

STANDARD_CERTIFICATIONS = '''
    content += json.dumps(certifications_dict, indent=4, ensure_ascii=False)
    content += '''

def get_all_certification_categories():
    """Return list of all certification category names"""
    return list(STANDARD_CERTIFICATIONS.keys())

def get_category_certifications(category):
    """Return certifications for a specific category"""
    return STANDARD_CERTIFICATIONS.get(category, {}).get("certifications", [])

def get_all_certifications():
    """Return flat list of all certifications"""
    all_certs = []
    for category_data in STANDARD_CERTIFICATIONS.values():
        all_certs.extend(category_data.get("certifications", []))
    return sorted(all_certs)

def search_certifications(query):
    """Search certifications by query string"""
    query_lower = query.lower()
    results = []
    for category, data in STANDARD_CERTIFICATIONS.items():
        for cert in data.get("certifications", []):
            if query_lower in cert.lower():
                results.append({
                    "certification": cert,
                    "category": category
                })
    return results
'''
    
    with open(CERTIFICATIONS_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

@router.get("/list", response_model=Dict)
async def get_all_certifications_list(
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Get all standard certifications organized by category"""
    certifications = read_certifications_file()
    
    # Get total count
    total_count = sum(len(cat_data.get("certifications", [])) for cat_data in certifications.values())
    
    return {
        "success": True,
        "data": {
            "categories": certifications,
            "total_categories": len(certifications),
            "total_certifications": total_count
        }
    }

@router.get("/flat-list", response_model=Dict)
async def get_flat_certifications_list(
    current_user: dict = Depends(get_current_user)
):
    """Get flat list of all certifications for dropdowns"""
    from utils.standard_certifications import get_all_certifications
    
    return {
        "success": True,
        "data": {
            "certifications": get_all_certifications()
        }
    }

@router.get("/search", response_model=Dict)
async def search_certifications(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    """Search certifications by query"""
    from utils.standard_certifications import search_certifications as search_func
    
    results = search_func(query)
    
    return {
        "success": True,
        "data": {
            "query": query,
            "results": results,
            "count": len(results)
        }
    }

@router.post("/categories", response_model=Dict)
async def add_certification_category(
    category_data: dict,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Add a new certification category (Super Admin only)"""
    
    # Check if super admin
    admin_profile = await db.admin_profiles.find_one({"admin_id": current_user["user_id"]})
    if not admin_profile or not admin_profile.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can add certification categories"
        )
    
    name = category_data.get('name')
    icon = category_data.get('icon', '📋')
    description = category_data.get('description', '')
    
    if not name or not description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and description are required"
        )
    
    # Load existing certifications
    certifications = read_certifications_file()
    
    # Check if already exists
    if name in certifications:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists"
        )
    
    # Add new category
    certifications[name] = {
        "icon": icon,
        "description": description,
        "certifications": []
    }
    
    # Write back to file
    write_certifications_file(certifications)
    
    return {
        "success": True,
        "message": f"Certification category '{name}' added successfully"
    }

@router.post("/add", response_model=Dict)
async def add_certification_to_category(
    data: dict,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Add a certification to a category (Super Admin only)"""
    
    # Check if super admin
    admin_profile = await db.admin_profiles.find_one({"admin_id": current_user["user_id"]})
    if not admin_profile or not admin_profile.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can add certifications"
        )
    
    category = data.get('category')
    certification = data.get('certification')
    
    if not category or not certification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category and certification are required"
        )
    
    # Load existing certifications
    certifications = read_certifications_file()
    
    if category not in certifications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if certification already exists
    if certification in certifications[category]["certifications"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certification already exists in this category"
        )
    
    # Add certification
    certifications[category]["certifications"].append(certification)
    certifications[category]["certifications"].sort()  # Keep alphabetically sorted
    
    # Write back to file
    write_certifications_file(certifications)
    
    return {
        "success": True,
        "message": f"Certification '{certification}' added to '{category}'"
    }

@router.delete("/remove", response_model=Dict)
async def remove_certification(
    data: dict,
    current_user: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Remove a certification from a category (Super Admin only)"""
    
    # Check if super admin
    admin_profile = await db.admin_profiles.find_one({"admin_id": current_user["user_id"]})
    if not admin_profile or not admin_profile.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can remove certifications"
        )
    
    category = data.get('category')
    certification = data.get('certification')
    
    if not category or not certification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category and certification are required"
        )
    
    # Load existing certifications
    certifications = read_certifications_file()
    
    if category not in certifications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Remove certification
    if certification in certifications[category]["certifications"]:
        certifications[category]["certifications"].remove(certification)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certification not found in this category"
        )
    
    # Write back to file
    write_certifications_file(certifications)
    
    return {
        "success": True,
        "message": f"Certification '{certification}' removed from '{category}'"
    }
