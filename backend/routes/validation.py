from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from utils.address_validation import (
    validate_address,
    validate_canadian_postal_code,
    validate_province,
    validate_phone_number
)

router = APIRouter()

class AddressValidationRequest(BaseModel):
    address: str
    city: str
    province: str
    postal_code: str

class PostalCodeValidationRequest(BaseModel):
    postal_code: str

class PhoneValidationRequest(BaseModel):
    phone: str

@router.post("/validate-address", response_model=Dict)
async def validate_address_endpoint(request: AddressValidationRequest):
    """Validate complete Canadian address"""
    result = validate_address(
        request.address,
        request.city,
        request.province,
        request.postal_code
    )
    
    if not result['valid']:
        return {
            "valid": False,
            "errors": result['errors']
        }
    
    return {
        "valid": True,
        "formatted": result['formatted']
    }

@router.post("/validate-postal-code", response_model=Dict)
async def validate_postal_code_endpoint(request: PostalCodeValidationRequest):
    """Validate Canadian postal code"""
    result = validate_canadian_postal_code(request.postal_code)
    
    if not result['valid']:
        return {
            "valid": False,
            "error": result['error']
        }
    
    return {
        "valid": True,
        "formatted": result['formatted']
    }

@router.post("/validate-phone", response_model=Dict)
async def validate_phone_endpoint(request: PhoneValidationRequest):
    """Validate and format phone number"""
    result = validate_phone_number(request.phone)
    
    if not result['valid']:
        return {
            "valid": False,
            "error": result['error']
        }
    
    return {
        "valid": True,
        "formatted": result['formatted'],
        "display": result['display']
    }
