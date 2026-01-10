"""
Public Leaderboard API
Shows institution rankings by credentials issued and work passports created.
Designed to drive competition and increase platform adoption.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

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

# Ontario regions with major cities/areas
ONTARIO_REGIONS = {
    "durham": {
        "name": "Durham Region",
        "cities": ["Oshawa", "Whitby", "Ajax", "Pickering", "Clarington", "Uxbridge", "Scugog", "Brock"],
        "threshold": 500,  # Workers needed to enable job matching
        "description": "Eastern GTA region including Oshawa and Whitby"
    },
    "peel": {
        "name": "Peel Region",
        "cities": ["Mississauga", "Brampton", "Caledon"],
        "threshold": 1000,
        "description": "Western GTA including Mississauga and Brampton"
    },
    "york": {
        "name": "York Region",
        "cities": ["Markham", "Vaughan", "Richmond Hill", "Newmarket", "Aurora", "King", "Whitchurch-Stouffville", "Georgina", "East Gwillimbury"],
        "threshold": 800,
        "description": "Northern GTA suburbs"
    },
    "halton": {
        "name": "Halton Region",
        "cities": ["Oakville", "Burlington", "Milton", "Halton Hills"],
        "threshold": 400,
        "description": "Southwest of Toronto along Lake Ontario"
    },
    "toronto": {
        "name": "City of Toronto",
        "cities": ["Toronto", "North York", "Scarborough", "Etobicoke"],
        "threshold": 2000,
        "description": "Canada's largest city"
    },
    "hamilton": {
        "name": "Hamilton-Wentworth",
        "cities": ["Hamilton", "Stoney Creek", "Ancaster", "Dundas", "Flamborough"],
        "threshold": 500,
        "description": "Steel city and McMaster University area"
    },
    "waterloo": {
        "name": "Waterloo Region",
        "cities": ["Kitchener", "Waterloo", "Cambridge", "Wilmot", "Wellesley", "Woolwich", "North Dumfries"],
        "threshold": 600,
        "description": "Tech hub with University of Waterloo"
    },
    "niagara": {
        "name": "Niagara Region",
        "cities": ["St. Catharines", "Niagara Falls", "Welland", "Fort Erie", "Grimsby", "Lincoln", "Port Colborne"],
        "threshold": 400,
        "description": "Border region with tourism and wine industry"
    },
    "ottawa": {
        "name": "Ottawa-Gatineau",
        "cities": ["Ottawa", "Kanata", "Orleans", "Nepean", "Gloucester"],
        "threshold": 700,
        "description": "National capital region"
    },
    "london": {
        "name": "London-Middlesex",
        "cities": ["London", "Strathroy", "Dorchester"],
        "threshold": 400,
        "description": "Southwestern Ontario hub"
    },
    "windsor": {
        "name": "Windsor-Essex",
        "cities": ["Windsor", "Tecumseh", "Lakeshore", "Amherstburg", "LaSalle", "Essex", "Kingsville", "Leamington"],
        "threshold": 400,
        "description": "Border city with automotive industry"
    },
    "simcoe": {
        "name": "Simcoe County",
        "cities": ["Barrie", "Orillia", "Collingwood", "Innisfil", "Bradford", "Midland"],
        "threshold": 350,
        "description": "Cottage country gateway north of GTA"
    }
}

# Regions for other provinces (simplified)
PROVINCE_REGIONS = {
    "BC": {
        "vancouver": {"name": "Greater Vancouver", "cities": ["Vancouver", "Burnaby", "Surrey", "Richmond", "Coquitlam", "New Westminster"], "threshold": 1500},
        "victoria": {"name": "Greater Victoria", "cities": ["Victoria", "Saanich", "Langford", "Colwood"], "threshold": 400},
        "kelowna": {"name": "Okanagan", "cities": ["Kelowna", "Penticton", "Vernon"], "threshold": 300}
    },
    "AB": {
        "calgary": {"name": "Calgary Region", "cities": ["Calgary", "Airdrie", "Cochrane", "Okotoks"], "threshold": 800},
        "edmonton": {"name": "Edmonton Region", "cities": ["Edmonton", "St. Albert", "Sherwood Park", "Spruce Grove"], "threshold": 700}
    },
    "QC": {
        "montreal": {"name": "Greater Montreal", "cities": ["Montreal", "Laval", "Longueuil", "Brossard", "Terrebonne"], "threshold": 1200},
        "quebec_city": {"name": "Quebec City", "cities": ["Quebec City", "Levis"], "threshold": 400}
    }
}

@router.get("/institutions")
async def get_institution_leaderboard(
    province: Optional[str] = None,
    period: str = Query("all", enum=["all", "year", "month", "week"]),
    limit: int = Query(50, le=100),
    db = Depends(get_db)
):
    """
    Get public leaderboard of institutions ranked by credentials issued.
    No authentication required - this is public data.
    
    Args:
        province: Filter by province code (e.g., "ON", "BC")
        period: Time period ("all", "year", "month", "week")
        limit: Number of results to return (max 100)
    """
    
    # Calculate date filter based on period
    date_filter = None
    now = datetime.now(timezone.utc)
    
    if period == "week":
        date_filter = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        date_filter = (now - timedelta(days=30)).isoformat()
    elif period == "year":
        date_filter = (now - timedelta(days=365)).isoformat()
    
    # Get all institutions
    institution_query = {}
    if province:
        institution_query["province"] = province.upper()
    
    institutions = await db.institution_profiles.find(
        institution_query,
        {"_id": 0, "institution_id": 1, "institution_name": 1, "logo_url": 1, "province": 1, "city": 1}
    ).to_list(length=500)
    
    # Build credential query
    credential_query = {"status": "issued"}
    if date_filter:
        credential_query["created_at"] = {"$gte": date_filter}
    
    # Get all blockchain credentials (issued credentials)
    all_credentials = await db.blockchain_credentials.find(
        credential_query,
        {"_id": 0, "institution_id": 1, "user_id": 1, "credential_type": 1}
    ).to_list(length=10000)
    
    # Count credentials per institution
    credential_counts = {}
    credential_types = {}
    unique_students = {}
    
    for cred in all_credentials:
        inst_id = cred.get("institution_id")
        if inst_id:
            credential_counts[inst_id] = credential_counts.get(inst_id, 0) + 1
            
            # Track credential types
            if inst_id not in credential_types:
                credential_types[inst_id] = {"certificate": 0, "diploma": 0, "degree": 0}
            cred_type = cred.get("credential_type", "certificate")
            if cred_type in credential_types[inst_id]:
                credential_types[inst_id][cred_type] += 1
            
            # Track unique students
            if inst_id not in unique_students:
                unique_students[inst_id] = set()
            if cred.get("user_id"):
                unique_students[inst_id].add(cred["user_id"])
    
    # Get work passport counts
    passport_query = {"is_public": True}
    if date_filter:
        passport_query["updated_at"] = {"$gte": date_filter}
    
    # Count work passports by checking career profiles
    all_profiles = await db.career_profiles.find(
        passport_query,
        {"_id": 0, "user_id": 1}
    ).to_list(length=10000)
    
    passport_user_ids = {p["user_id"] for p in all_profiles}
    
    # Map users to institutions via their credentials
    passport_counts = {}
    for cred in all_credentials:
        if cred.get("user_id") in passport_user_ids:
            inst_id = cred.get("institution_id")
            if inst_id:
                if inst_id not in passport_counts:
                    passport_counts[inst_id] = set()
                passport_counts[inst_id].add(cred["user_id"])
    
    # Build leaderboard
    leaderboard = []
    for inst in institutions:
        inst_id = inst.get("institution_id")
        cred_count = credential_counts.get(inst_id, 0)
        
        if cred_count > 0:  # Only include institutions with credentials
            leaderboard.append({
                "institution_id": inst_id,
                "institution_name": inst.get("institution_name", "Unknown"),
                "logo_url": inst.get("logo_url"),
                "province": inst.get("province"),
                "province_name": CANADIAN_PROVINCES.get(inst.get("province", ""), inst.get("province")),
                "city": inst.get("city"),
                "credentials_issued": cred_count,
                "credential_breakdown": credential_types.get(inst_id, {}),
                "unique_students": len(unique_students.get(inst_id, set())),
                "work_passports": len(passport_counts.get(inst_id, set())),
                "passport_rate": round(len(passport_counts.get(inst_id, set())) / max(len(unique_students.get(inst_id, set())), 1) * 100, 1)
            })
    
    # Sort by credentials issued (descending)
    leaderboard.sort(key=lambda x: x["credentials_issued"], reverse=True)
    
    # Add rank
    for i, entry in enumerate(leaderboard[:limit]):
        entry["rank"] = i + 1
    
    # Calculate totals
    total_credentials = sum(entry["credentials_issued"] for entry in leaderboard)
    total_passports = sum(entry["work_passports"] for entry in leaderboard)
    total_students = sum(entry["unique_students"] for entry in leaderboard)
    
    return {
        "success": True,
        "data": {
            "leaderboard": leaderboard[:limit],
            "total_institutions": len(leaderboard),
            "summary": {
                "total_credentials_issued": total_credentials,
                "total_work_passports": total_passports,
                "total_students": total_students,
                "period": period,
                "province_filter": province
            },
            "filters": {
                "provinces": [{
                    "code": code,
                    "name": name
                } for code, name in CANADIAN_PROVINCES.items()]
            }
        }
    }

@router.get("/provinces")
async def get_province_leaderboard(
    period: str = Query("all", enum=["all", "year", "month", "week"]),
    db = Depends(get_db)
):
    """
    Get leaderboard aggregated by province.
    Shows which provinces are leading in credential adoption.
    """
    
    # Calculate date filter
    date_filter = None
    now = datetime.now(timezone.utc)
    
    if period == "week":
        date_filter = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        date_filter = (now - timedelta(days=30)).isoformat()
    elif period == "year":
        date_filter = (now - timedelta(days=365)).isoformat()
    
    # Get institutions by province
    institutions = await db.institution_profiles.find(
        {},
        {"_id": 0, "institution_id": 1, "province": 1}
    ).to_list(length=500)
    
    inst_to_province = {i["institution_id"]: i.get("province", "Unknown") for i in institutions if "institution_id" in i}
    
    # Get credentials
    credential_query = {"status": "issued"}
    if date_filter:
        credential_query["created_at"] = {"$gte": date_filter}
    
    all_credentials = await db.blockchain_credentials.find(
        credential_query,
        {"_id": 0, "institution_id": 1, "user_id": 1}
    ).to_list(length=10000)
    
    # Aggregate by province
    province_stats = {}
    for cred in all_credentials:
        inst_id = cred.get("institution_id")
        province = inst_to_province.get(inst_id, "Unknown")
        
        if province not in province_stats:
            province_stats[province] = {
                "credentials": 0,
                "students": set(),
                "institutions": set()
            }
        
        province_stats[province]["credentials"] += 1
        if cred.get("user_id"):
            province_stats[province]["students"].add(cred["user_id"])
        if inst_id:
            province_stats[province]["institutions"].add(inst_id)
    
    # Build leaderboard
    leaderboard = []
    for province_code, stats in province_stats.items():
        if stats["credentials"] > 0:
            leaderboard.append({
                "province_code": province_code,
                "province_name": CANADIAN_PROVINCES.get(province_code, province_code),
                "credentials_issued": stats["credentials"],
                "unique_students": len(stats["students"]),
                "participating_institutions": len(stats["institutions"])
            })
    
    # Sort by credentials
    leaderboard.sort(key=lambda x: x["credentials_issued"], reverse=True)
    
    # Add rank
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return {
        "success": True,
        "data": {
            "leaderboard": leaderboard,
            "period": period
        }
    }

@router.get("/stats")
async def get_platform_stats(
    db = Depends(get_db)
):
    """
    Get overall platform statistics for public display.
    """
    
    # Count totals
    total_institutions = await db.institution_profiles.count_documents({})
    total_credentials = await db.blockchain_credentials.count_documents({"status": "issued"})
    total_passports = await db.career_profiles.count_documents({"is_public": True})
    total_workforce = await db.users.count_documents({"user_type": "workforce"})
    total_employers = await db.users.count_documents({"user_type": "employer"})
    
    # Get recent growth (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_credentials = await db.blockchain_credentials.count_documents({
        "status": "issued",
        "created_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "success": True,
        "data": {
            "total_institutions": total_institutions,
            "total_credentials_issued": total_credentials,
            "total_work_passports": total_passports,
            "total_workforce_users": total_workforce,
            "total_employers": total_employers,
            "credentials_last_30_days": recent_credentials,
            "blockchain_network": "Polygon Mainnet"
        }
    }



@router.get("/regions")
async def get_regional_workforce_density(
    province: str = Query("ON", description="Province code"),
    db = Depends(get_db)
):
    """
    Get workforce density by region within a province.
    Shows how close each region is to enabling job-matching features.
    """
    province = province.upper()
    
    # Get region definitions based on province
    if province == "ON":
        regions_def = ONTARIO_REGIONS
    elif province in PROVINCE_REGIONS:
        regions_def = PROVINCE_REGIONS[province]
    else:
        # Return province-level data for provinces without detailed regions
        return {
            "success": True,
            "data": {
                "province": province,
                "province_name": CANADIAN_PROVINCES.get(province, province),
                "regions": [],
                "has_detailed_regions": False,
                "message": "Detailed regional data coming soon for this province"
            }
        }
    
    # Get all workforce users with their locations
    workforce_users = await db.workforce_profiles.find(
        {},
        {"_id": 0, "user_id": 1, "city": 1, "province": 1}
    ).to_list(length=50000)
    
    # Get all work passports
    passport_users = await db.career_profile_settings.find(
        {"is_public": True},
        {"_id": 0, "workforce_id": 1}
    ).to_list(length=50000)
    passport_workforce_ids = {p.get("workforce_id") for p in passport_users}
    
    # Get institutions by location
    institutions = await db.institution_profiles.find(
        {"province": province},
        {"_id": 0, "institution_id": 1, "city": 1, "institution_name": 1}
    ).to_list(length=1000)
    
    # Build region statistics
    region_stats = []
    
    for region_key, region_data in regions_def.items():
        region_cities = [c.lower() for c in region_data.get("cities", [])]
        threshold = region_data.get("threshold", 500)
        
        # Count workers in this region
        workers_in_region = 0
        passports_in_region = 0
        
        for user in workforce_users:
            user_city = (user.get("city") or "").lower()
            user_province = (user.get("province") or "").upper()
            
            # Check if user is in this region
            if user_province == province and any(city in user_city or user_city in city for city in region_cities):
                workers_in_region += 1
                if user.get("user_id") in passport_workforce_ids:
                    passports_in_region += 1
        
        # Count institutions in region
        institutions_in_region = 0
        partner_institutions = []
        for inst in institutions:
            inst_city = (inst.get("city") or "").lower()
            if any(city in inst_city or inst_city in city for city in region_cities):
                institutions_in_region += 1
                partner_institutions.append(inst.get("institution_name"))
        
        # Calculate density percentage
        density_percent = min(round((workers_in_region / threshold) * 100, 1), 100) if threshold > 0 else 0
        
        # Determine status
        if density_percent >= 100:
            status = "active"
            status_label = "Job Matching Active"
        elif density_percent >= 75:
            status = "almost_ready"
            status_label = "Almost Ready"
        elif density_percent >= 50:
            status = "growing"
            status_label = "Growing"
        elif density_percent >= 25:
            status = "emerging"
            status_label = "Emerging"
        else:
            status = "early"
            status_label = "Early Stage"
        
        region_stats.append({
            "region_key": region_key,
            "region_name": region_data.get("name"),
            "description": region_data.get("description", ""),
            "cities": region_data.get("cities", []),
            "workers_count": workers_in_region,
            "passports_count": passports_in_region,
            "institutions_count": institutions_in_region,
            "partner_institutions": partner_institutions[:5],  # Top 5
            "threshold": threshold,
            "density_percent": density_percent,
            "workers_needed": max(0, threshold - workers_in_region),
            "status": status,
            "status_label": status_label
        })
    
    # Sort by density percentage (highest first)
    region_stats.sort(key=lambda x: x["density_percent"], reverse=True)
    
    # Calculate province totals
    total_workers = sum(r["workers_count"] for r in region_stats)
    total_passports = sum(r["passports_count"] for r in region_stats)
    regions_active = len([r for r in region_stats if r["status"] == "active"])
    regions_almost = len([r for r in region_stats if r["status"] == "almost_ready"])
    
    return {
        "success": True,
        "data": {
            "province": province,
            "province_name": CANADIAN_PROVINCES.get(province, province),
            "has_detailed_regions": True,
            "regions": region_stats,
            "summary": {
                "total_regions": len(region_stats),
                "regions_active": regions_active,
                "regions_almost_ready": regions_almost,
                "total_workers": total_workers,
                "total_passports": total_passports
            },
            "available_provinces": [
                {"code": "ON", "name": "Ontario", "has_regions": True},
                {"code": "BC", "name": "British Columbia", "has_regions": True},
                {"code": "AB", "name": "Alberta", "has_regions": True},
                {"code": "QC", "name": "Quebec", "has_regions": True}
            ]
        }
    }

@router.get("/regions/{region_key}")
async def get_region_detail(
    region_key: str,
    province: str = Query("ON"),
    db = Depends(get_db)
):
    """
    Get detailed information about a specific region including top institutions.
    """
    province = province.upper()
    region_key = region_key.lower()
    
    # Get region definition
    if province == "ON":
        regions_def = ONTARIO_REGIONS
    elif province in PROVINCE_REGIONS:
        regions_def = PROVINCE_REGIONS[province]
    else:
        return {"success": False, "message": "Province not found"}
    
    if region_key not in regions_def:
        return {"success": False, "message": "Region not found"}
    
    region_data = regions_def[region_key]
    region_cities = [c.lower() for c in region_data.get("cities", [])]
    
    # Get institutions in this region
    all_institutions = await db.institution_profiles.find(
        {"province": province},
        {"_id": 0, "institution_id": 1, "institution_name": 1, "city": 1, "logo_url": 1}
    ).to_list(length=500)
    
    institutions_in_region = []
    for inst in all_institutions:
        inst_city = (inst.get("city") or "").lower()
        if any(city in inst_city or inst_city in city for city in region_cities):
            # Get credential count for this institution
            cred_count = await db.blockchain_credentials.count_documents({
                "institution_id": inst.get("institution_id"),
                "status": "issued"
            })
            institutions_in_region.append({
                "institution_id": inst.get("institution_id"),
                "institution_name": inst.get("institution_name"),
                "city": inst.get("city"),
                "logo_url": inst.get("logo_url"),
                "credentials_issued": cred_count
            })
    
    # Sort by credentials issued
    institutions_in_region.sort(key=lambda x: x["credentials_issued"], reverse=True)
    
    return {
        "success": True,
        "data": {
            "region_key": region_key,
            "region_name": region_data.get("name"),
            "description": region_data.get("description"),
            "cities": region_data.get("cities", []),
            "institutions": institutions_in_region[:20],
            "total_institutions": len(institutions_in_region)
        }
    }
