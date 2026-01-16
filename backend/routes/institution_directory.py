"""
Institution Directory API
Manages the directory of all Canadian institutions (registered and unregistered).
Supports CSV import and "Invite Institution" requests from workforce users.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import csv
import io
import uuid

router = APIRouter(prefix="/institution-directory", tags=["Institution Directory"])

def get_db():
    from server import db
    return db

# Canadian provinces mapping
CANADIAN_PROVINCES = {
    "AB": "Alberta",
    "BC": "British Columbia", 
    "MB": "Manitoba",
    "NB": "New Brunswick",
    "NL": "Newfoundland and Labrador",
    "NS": "Nova Scotia",
    "NT": "Northwest Territories",
    "NU": "Nunavut",
    "ON": "Ontario",
    "PE": "Prince Edward Island",
    "QC": "Quebec",
    "SK": "Saskatchewan",
    "YT": "Yukon"
}

class InstitutionDirectoryEntry(BaseModel):
    """Schema for institution directory entry"""
    institution_name: str
    province: str
    city: Optional[str] = None
    institution_type: str = "college"  # college, university, training_provider, high_school
    is_public: bool = True  # public or private institution
    website: Optional[str] = None
    
class InviteInstitutionRequest(BaseModel):
    """Request from workforce user to invite their institution"""
    institution_id: str
    message: Optional[str] = None
    credential_type: Optional[str] = None  # What credential they want verified

class BulkImportResult(BaseModel):
    """Result of bulk import operation"""
    total_processed: int
    successfully_imported: int
    duplicates_skipped: int
    errors: List[str]


@router.get("/all")
async def get_all_directory_institutions(
    province: Optional[str] = None,
    institution_type: Optional[str] = None,
    search: Optional[str] = None,
    include_partners: bool = True,
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    db = Depends(get_db)
):
    """
    Get all institutions from the directory (both partners and listed).
    This is public data for the leaderboard and search.
    """
    
    query = {}
    
    if province:
        query["province"] = province.upper()
    
    if institution_type:
        query["institution_type"] = institution_type
        
    if search:
        query["institution_name"] = {"$regex": search, "$options": "i"}
    
    # Get directory entries (non-partner institutions)
    directory_entries = await db.institution_directory.find(
        query,
        {"_id": 0}
    ).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    
    # Get partner institutions (registered on platform)
    # Filter out test institutions
    partner_query = {
        "institution_name": {
            "$not": {"$regex": "test", "$options": "i"}
        }
    }
    if province:
        partner_query["province"] = province.upper()
    if search:
        # For search, we need a different approach since $not doesn't combine well
        pass  # Will filter in Python below
    
    partners = []
    if include_partners:
        # If searching, get all then filter
        if search:
            search_query = {"institution_name": {"$regex": search, "$options": "i"}}
            if province:
                search_query["province"] = province.upper()
            partners = await db.institution_profiles.find(
                search_query,
                {"_id": 0, "institution_id": 1, "institution_name": 1, "province": 1, 
                 "city": 1, "logo_url": 1, "institution_type": 1, "phone": 1, "website": 1}
            ).to_list(length=500)
        else:
            partners = await db.institution_profiles.find(
                partner_query,
                {"_id": 0, "institution_id": 1, "institution_name": 1, "province": 1, 
                 "city": 1, "logo_url": 1, "institution_type": 1, "phone": 1, "website": 1}
            ).to_list(length=500)
        
        # Filter out any test institutions (comprehensive filter)
        def is_test_institution(name):
            name_lower = (name or "").lower()
            return (
                "test " in name_lower or 
                name_lower.startswith("test") or
                "test institution" in name_lower or
                "test university" in name_lower or
                "updated test" in name_lower or
                "new test" in name_lower
            )
        
        partners = [p for p in partners if not is_test_institution(p.get("institution_name", ""))]
    
    # Get credential counts for partners
    partner_ids = [p["institution_id"] for p in partners if "institution_id" in p]
    credential_counts = {}
    
    if partner_ids:
        pipeline = [
            {"$match": {"institution_id": {"$in": partner_ids}, "status": "issued"}},
            {"$group": {"_id": "$institution_id", "count": {"$sum": 1}}}
        ]
        counts = await db.blockchain_credentials.aggregate(pipeline).to_list(length=500)
        credential_counts = {c["_id"]: c["count"] for c in counts}
    
    # Get invite counts for directory institutions
    directory_ids = [d["directory_id"] for d in directory_entries if "directory_id" in d]
    invite_counts = {}
    
    if directory_ids:
        pipeline = [
            {"$match": {"institution_id": {"$in": directory_ids}}},
            {"$group": {"_id": "$institution_id", "count": {"$sum": 1}}}
        ]
        counts = await db.institution_invite_requests.aggregate(pipeline).to_list(length=500)
        invite_counts = {c["_id"]: c["count"] for c in counts}
    
    # Combine and format results
    results = []
    
    # Add partners first (they're active)
    for partner in partners:
        results.append({
            "institution_id": partner.get("institution_id"),
            "institution_name": partner.get("institution_name"),
            "province": partner.get("province"),
            "province_name": CANADIAN_PROVINCES.get(partner.get("province", ""), partner.get("province")),
            "city": partner.get("city"),
            "logo_url": partner.get("logo_url"),
            "institution_type": partner.get("institution_type", "college"),
            "is_partner": True,
            "credentials_issued": credential_counts.get(partner.get("institution_id"), 0),
            "invite_requests": 0
        })
    
    # Add directory entries (not yet partners)
    for entry in directory_entries:
        # Check if this institution is already a partner (by name match)
        is_already_partner = any(
            p.get("institution_name", "").lower() == entry.get("institution_name", "").lower() 
            for p in partners
        )
        
        if not is_already_partner:
            results.append({
                "institution_id": entry.get("directory_id"),
                "institution_name": entry.get("institution_name"),
                "province": entry.get("province"),
                "province_name": CANADIAN_PROVINCES.get(entry.get("province", ""), entry.get("province")),
                "city": entry.get("city"),
                "logo_url": None,
                "institution_type": entry.get("institution_type", "college"),
                "is_public_institution": entry.get("is_public", True),
                "website": entry.get("website"),
                "is_partner": False,
                "credentials_issued": 0,
                "invite_requests": invite_counts.get(entry.get("directory_id"), 0)
            })
    
    # Sort: partners first (by credentials), then non-partners (by invite requests)
    results.sort(key=lambda x: (not x["is_partner"], -x["credentials_issued"], -x["invite_requests"]))
    
    total_count = await db.institution_directory.count_documents(query)
    partner_count = len(partners)
    
    return {
        "success": True,
        "data": {
            "institutions": results,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_directory": total_count,
                "total_partners": partner_count,
                "total_combined": total_count + partner_count
            },
            "filters": {
                "provinces": [{"code": k, "name": v} for k, v in CANADIAN_PROVINCES.items()],
                "institution_types": [
                    {"value": "university", "label": "University"},
                    {"value": "college", "label": "College"},
                    {"value": "training_provider", "label": "Training Provider"},
                    {"value": "high_school", "label": "High School"}
                ]
            }
        }
    }


@router.get("/search")
async def search_institutions(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, le=50),
    db = Depends(get_db)
):
    """
    Fast institution search for autocomplete.
    Searches both directory entries and registered partners.
    """
    search_regex = {"$regex": q, "$options": "i"}
    
    # Search directory entries
    directory_results = await db.institution_directory.find(
        {"institution_name": search_regex},
        {"_id": 0, "directory_id": 1, "institution_name": 1, "city": 1, 
         "province": 1, "institution_type": 1, "email": 1, "phone": 1}
    ).limit(limit).to_list(length=limit)
    
    # Search registered partners (exclude test institutions)
    partner_results = await db.institution_profiles.find(
        {
            "$and": [
                {"institution_name": search_regex},
                {"institution_name": {"$not": {"$regex": "^test", "$options": "i"}}}
            ]
        },
        {"_id": 0, "institution_id": 1, "institution_name": 1, "city": 1,
         "province": 1, "institution_type": 1, "email": 1, "phone": 1}
    ).limit(limit).to_list(length=limit)
    
    # Merge results, prioritizing partners
    seen_names = set()
    results = []
    
    for p in partner_results:
        name_lower = p.get("institution_name", "").lower()
        if name_lower not in seen_names:
            seen_names.add(name_lower)
            p["is_partner"] = True
            p["directory_id"] = p.get("institution_id")
            results.append(p)
    
    for d in directory_results:
        name_lower = d.get("institution_name", "").lower()
        if name_lower not in seen_names:
            seen_names.add(name_lower)
            d["is_partner"] = False
            results.append(d)
    
    return {
        "success": True,
        "data": {
            "institutions": results[:limit],
            "query": q
        }
    }


@router.post("/invite-request")
async def request_institution_invite(
    request: InviteInstitutionRequest,
    db = Depends(get_db)
):
    """
    Workforce user requests their institution to join the platform.
    This creates social pressure and demand signals.
    """
    
    # Verify the institution exists in directory
    institution = await db.institution_directory.find_one(
        {"directory_id": request.institution_id},
        {"_id": 0}
    )
    
    if not institution:
        # Check if it's already a partner
        partner = await db.institution_profiles.find_one(
            {"institution_id": request.institution_id},
            {"_id": 0}
        )
        if partner:
            raise HTTPException(
                status_code=400,
                detail="This institution is already a partner on HR Bank!"
            )
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Create invite request
    invite_request = {
        "request_id": str(uuid.uuid4()),
        "institution_id": request.institution_id,
        "institution_name": institution.get("institution_name"),
        "message": request.message,
        "credential_type": request.credential_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending"
    }
    
    await db.institution_invite_requests.insert_one(invite_request)
    
    # Update invite count on the institution
    await db.institution_directory.update_one(
        {"directory_id": request.institution_id},
        {"$inc": {"invite_request_count": 1}}
    )
    
    return {
        "success": True,
        "message": f"Your request to invite {institution.get('institution_name')} has been recorded!",
        "data": {
            "request_id": invite_request["request_id"],
            "institution_name": institution.get("institution_name"),
            "total_requests": (institution.get("invite_request_count", 0) + 1)
        }
    }


@router.get("/invite-requests/{institution_id}")
async def get_institution_invite_requests(
    institution_id: str,
    db = Depends(get_db)
):
    """Get all invite requests for a specific institution (admin use)"""
    
    requests = await db.institution_invite_requests.find(
        {"institution_id": institution_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    institution = await db.institution_directory.find_one(
        {"directory_id": institution_id},
        {"_id": 0, "institution_name": 1, "province": 1, "city": 1}
    )
    
    return {
        "success": True,
        "data": {
            "institution": institution,
            "requests": requests,
            "total_requests": len(requests)
        }
    }


@router.post("/bulk-import")
async def bulk_import_institutions(
    file: UploadFile = File(...),
    db = Depends(get_db)
):
    """
    Bulk import institutions from CSV file.
    Expected columns: institution_name, province, city, institution_type, is_public, website
    
    Admin only endpoint.
    """
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    results = {
        "total_processed": 0,
        "successfully_imported": 0,
        "duplicates_skipped": 0,
        "errors": []
    }
    
    batch = []
    
    for row in reader:
        results["total_processed"] += 1
        
        try:
            # Normalize province code
            province = row.get("province", "").strip().upper()
            if len(province) > 2:
                # Try to match full province name
                province_match = next(
                    (code for code, name in CANADIAN_PROVINCES.items() 
                     if name.lower() == province.lower()),
                    None
                )
                if province_match:
                    province = province_match
            
            institution_name = row.get("institution_name", "").strip()
            
            if not institution_name:
                results["errors"].append(f"Row {results['total_processed']}: Missing institution name")
                continue
            
            # Check for duplicate
            existing = await db.institution_directory.find_one({
                "institution_name": {"$regex": f"^{institution_name}$", "$options": "i"},
                "province": province
            })
            
            if existing:
                results["duplicates_skipped"] += 1
                continue
            
            # Also check if already a partner
            existing_partner = await db.institution_profiles.find_one({
                "institution_name": {"$regex": f"^{institution_name}$", "$options": "i"}
            })
            
            if existing_partner:
                results["duplicates_skipped"] += 1
                continue
            
            # Determine institution type
            inst_type = row.get("institution_type", "").strip().lower()
            if not inst_type:
                name_lower = institution_name.lower()
                if "university" in name_lower:
                    inst_type = "university"
                elif "college" in name_lower:
                    inst_type = "college"
                elif "high school" in name_lower or "secondary" in name_lower:
                    inst_type = "high_school"
                else:
                    inst_type = "training_provider"
            
            entry = {
                "directory_id": str(uuid.uuid4()),
                "institution_name": institution_name,
                "province": province,
                "city": row.get("city", "").strip(),
                "institution_type": inst_type,
                "is_public": row.get("is_public", "true").lower() in ["true", "yes", "1", "public"],
                "website": row.get("website", "").strip() or None,
                "invite_request_count": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source": "bulk_import"
            }
            
            batch.append(entry)
            
            # Insert in batches of 100
            if len(batch) >= 100:
                await db.institution_directory.insert_many(batch)
                results["successfully_imported"] += len(batch)
                batch = []
                
        except Exception as e:
            results["errors"].append(f"Row {results['total_processed']}: {str(e)}")
    
    # Insert remaining batch
    if batch:
        await db.institution_directory.insert_many(batch)
        results["successfully_imported"] += len(batch)
    
    return {
        "success": True,
        "message": f"Import complete: {results['successfully_imported']} institutions added",
        "data": results
    }


@router.get("/stats")
async def get_directory_stats(db = Depends(get_db)):
    """Get statistics about the institution directory"""
    
    total_directory = await db.institution_directory.count_documents({})
    total_partners = await db.institution_profiles.count_documents({})
    total_invite_requests = await db.institution_invite_requests.count_documents({})
    
    # Get by province
    province_pipeline = [
        {"$group": {"_id": "$province", "count": {"$sum": 1}}}
    ]
    province_stats = await db.institution_directory.aggregate(province_pipeline).to_list(length=20)
    
    # Get by type
    type_pipeline = [
        {"$group": {"_id": "$institution_type", "count": {"$sum": 1}}}
    ]
    type_stats = await db.institution_directory.aggregate(type_pipeline).to_list(length=10)
    
    # Get most requested institutions
    top_requested_pipeline = [
        {"$group": {"_id": "$institution_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_requested = await db.institution_invite_requests.aggregate(top_requested_pipeline).to_list(length=10)
    
    # Get institution names for top requested
    top_requested_with_names = []
    for item in top_requested:
        inst = await db.institution_directory.find_one(
            {"directory_id": item["_id"]},
            {"_id": 0, "institution_name": 1, "province": 1}
        )
        if inst:
            top_requested_with_names.append({
                "institution_id": item["_id"],
                "institution_name": inst.get("institution_name"),
                "province": inst.get("province"),
                "request_count": item["count"]
            })
    
    return {
        "success": True,
        "data": {
            "total_in_directory": total_directory,
            "total_partners": total_partners,
            "total_invite_requests": total_invite_requests,
            "coverage_rate": round((total_partners / max(total_directory + total_partners, 1)) * 100, 1),
            "by_province": {
                item["_id"]: item["count"] for item in province_stats if item["_id"]
            },
            "by_type": {
                item["_id"]: item["count"] for item in type_stats if item["_id"]
            },
            "most_requested": top_requested_with_names
        }
    }
