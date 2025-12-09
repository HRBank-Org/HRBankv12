from fastapi import APIRouter, Query
from typing import Dict
from utils.fee_calculator import calculate_fees, calculate_shift_fees, get_minimum_rate_for_occupation, validate_hourly_rate, MINIMUM_WAGE, PLATFORM_FEE_PER_HOUR

router = APIRouter(prefix="/api/fees", tags=["Fee Calculator"])

@router.get("/calculate", response_model=Dict)
async def calculate_fee_preview(
    hourly_rate: float = Query(..., description="Hourly rate to calculate fees for"),
    occupation: str = Query(None, description="Occupation title for minimum rate validation"),
    duration_hours: float = Query(None, description="Duration in hours for shift total")
):
    """
    Calculate platform fees for a given hourly rate
    Optionally includes occupation-specific minimum rate and shift duration
    """
    
    minimum_rate = None
    if occupation:
        minimum_rate = get_minimum_rate_for_occupation(occupation)
    
    if duration_hours:
        result = calculate_shift_fees(hourly_rate, duration_hours, minimum_rate)
    else:
        result = calculate_fees(hourly_rate, minimum_rate)
    
    return {
        "success": True,
        "data": result
    }

@router.get("/validate-rate", response_model=Dict)
async def validate_rate(
    hourly_rate: float = Query(..., description="Hourly rate to validate"),
    occupation: str = Query(..., description="Occupation title")
):
    """
    Validate if hourly rate meets minimum for occupation
    """
    
    validation = validate_hourly_rate(hourly_rate, occupation)
    
    return {
        "success": validation["is_valid"],
        "data": validation
    }

@router.get("/structure", response_model=Dict)
async def get_fee_structure():
    """
    Get platform fee structure information
    """
    
    return {
        "success": True,
        "data": {
            "minimum_wage": MINIMUM_WAGE,
            "platform_fee_per_hour": PLATFORM_FEE_PER_HOUR,
            "fee_rules": {
                "minimum_wage_jobs": {
                    "description": "Jobs paying minimum wage or occupation minimum",
                    "worker_fee": 0.00,
                    "employer_fee": PLATFORM_FEE_PER_HOUR,
                    "total_platform_revenue": PLATFORM_FEE_PER_HOUR
                },
                "above_minimum_wage": {
                    "description": "Jobs paying above minimum wage",
                    "worker_fee": PLATFORM_FEE_PER_HOUR,
                    "employer_fee": PLATFORM_FEE_PER_HOUR,
                    "total_platform_revenue": PLATFORM_FEE_PER_HOUR * 2
                }
            },
            "notes": [
                "Workers receive gross pay before platform fees",
                "Payroll deductions (taxes, etc.) handled by payroll processors (ADP, Rippling)",
                "Platform fees are per hour worked",
                "Minimum wage is jurisdiction-specific (currently Ontario: $16.55/hour)"
            ]
        }
    }

@router.get("/occupation-minimums", response_model=Dict)
async def get_occupation_minimum_rates():
    """
    Get minimum hourly rates for all occupations
    """
    from utils.occupation_categories import OCCUPATION_CATEGORIES
    
    occupation_rates = []
    
    for category_name, category_data in OCCUPATION_CATEGORIES.items():
        for occ in category_data.get("occupations", []):
            if isinstance(occ, dict):
                occupation_rates.append({
                    "occupation": occ.get("title"),
                    "category": category_name,
                    "minimum_hourly_rate": occ.get("minimum_hourly_rate", MINIMUM_WAGE)
                })
            else:
                occupation_rates.append({
                    "occupation": occ,
                    "category": category_name,
                    "minimum_hourly_rate": MINIMUM_WAGE
                })
    
    return {
        "success": True,
        "data": {
            "occupations": occupation_rates,
            "total": len(occupation_rates),
            "default_minimum_wage": MINIMUM_WAGE
        }
    }
