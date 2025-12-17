"""
Address Validation and Autocomplete API Routes
Uses Google Places API for Canadian address validation
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional
from auth.jwt_handler import get_current_user
from database import get_db

router = APIRouter(prefix="/address", tags=["Address"])


@router.get("/autocomplete", response_model=Dict)
async def address_autocomplete(
    input: str = Query(..., min_length=3, description="Address search text"),
    session_token: Optional[str] = Query(None, description="Session token for billing optimization"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get address suggestions from Google Places Autocomplete.
    Returns Canadian addresses only.
    """
    from utils.address_validation import get_place_autocomplete
    
    suggestions = await get_place_autocomplete(input, session_token)
    
    return {
        "success": True,
        "data": {
            "suggestions": suggestions,
            "count": len(suggestions)
        }
    }


@router.get("/details/{place_id}", response_model=Dict)
async def get_address_details(
    place_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed address components from a Google Place ID.
    Use after user selects an autocomplete suggestion.
    """
    from utils.address_validation import get_place_details
    
    details = await get_place_details(place_id)
    
    if not details:
        raise HTTPException(status_code=404, detail="Place not found or invalid place_id")
    
    return {
        "success": True,
        "data": details
    }


@router.post("/validate", response_model=Dict)
async def validate_address(
    address_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate and geocode a structured address.
    
    Request body:
    {
        "street_address": "123 Main St",
        "city": "Windsor",
        "province": "ON",
        "postal_code": "N9A 1A1"  // optional
    }
    """
    from utils.address_validation import validate_full_address, geocode_address
    
    street_address = address_data.get("street_address", "")
    city = address_data.get("city", "")
    province = address_data.get("province", "")
    postal_code = address_data.get("postal_code", "")
    
    # First validate format
    validation = validate_full_address(street_address, city, province, postal_code)
    
    if not validation["valid"]:
        return {
            "success": False,
            "data": {
                "valid": False,
                "errors": validation["errors"]
            }
        }
    
    # Then geocode to get coordinates
    geo_result = await geocode_address(
        validation["formatted"]["address"],
        validation["formatted"]["city"],
        validation["formatted"]["province"],
        validation["formatted"].get("postal_code", "")
    )
    
    if geo_result and geo_result.get("valid"):
        return {
            "success": True,
            "data": {
                "valid": True,
                "address": {
                    "street_address": validation["formatted"]["address"],
                    "city": validation["formatted"]["city"],
                    "province": validation["formatted"]["province"],
                    "province_name": validation["formatted"]["province_name"],
                    "postal_code": validation["formatted"].get("postal_code", geo_result.get("components", {}).get("postal_code", "")),
                    "latitude": geo_result["latitude"],
                    "longitude": geo_result["longitude"],
                    "formatted_address": geo_result.get("formatted_address"),
                    "place_id": geo_result.get("place_id")
                }
            }
        }
    else:
        # Address format is valid but couldn't geocode
        return {
            "success": True,
            "data": {
                "valid": True,
                "warning": "Address format is valid but could not be verified with Google Maps",
                "address": {
                    "street_address": validation["formatted"]["address"],
                    "city": validation["formatted"]["city"],
                    "province": validation["formatted"]["province"],
                    "province_name": validation["formatted"]["province_name"],
                    "postal_code": validation["formatted"].get("postal_code", ""),
                    "latitude": None,
                    "longitude": None
                }
            }
        }


@router.post("/parse", response_model=Dict)
async def parse_address(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Parse a combined address string into components.
    
    Request body:
    {
        "address_string": "123 Main St, Windsor, ON N9A 1A1"
    }
    """
    from utils.address_validation import parse_address_string
    
    address_string = data.get("address_string", "")
    
    if not address_string:
        raise HTTPException(status_code=400, detail="address_string is required")
    
    parsed = parse_address_string(address_string)
    
    return {
        "success": True,
        "data": parsed
    }


@router.get("/provinces", response_model=Dict)
async def get_provinces():
    """
    Get list of Canadian provinces for dropdown.
    No authentication required.
    """
    from utils.address_validation import CANADIAN_PROVINCES
    
    provinces = [
        {"code": code, "name": name}
        for code, name in CANADIAN_PROVINCES.items()
    ]
    
    # Sort by name
    provinces.sort(key=lambda x: x["name"])
    
    return {
        "success": True,
        "data": {
            "provinces": provinces
        }
    }
