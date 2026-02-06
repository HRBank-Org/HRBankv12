from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List
from datetime import datetime, timezone
from auth.dependencies import require_role
from models.minimum_wage import ProvinceMinimumWage, MinimumWageUpdate

router = APIRouter(prefix="/api/admin/minimum-wages", tags=["Minimum Wage Management"])

def get_db():
    """Dependency to get database instance"""
    from server import db
    return db

# Canadian provinces and territories
CANADIAN_PROVINCES = {
    "ON": "Ontario",
    "BC": "British Columbia",
    "AB": "Alberta",
    "QC": "Quebec",
    "MB": "Manitoba",
    "SK": "Saskatchewan",
    "NS": "Nova Scotia",
    "NB": "New Brunswick",
    "NL": "Newfoundland and Labrador",
    "PE": "Prince Edward Island",
    "NT": "Northwest Territories",
    "YT": "Yukon",
    "NU": "Nunavut"
}

@router.post("/initialize", response_model=Dict)
async def initialize_minimum_wages(
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Initialize minimum wage data for all Canadian provinces
    Current rates as of February 2026
    """
    
    initial_wages = [
        {"province_code": "ON", "minimum_wage": 17.60, "student_wage": 16.60, "province_name": "Ontario"},
        {"province_code": "BC", "minimum_wage": 17.85, "province_name": "British Columbia"},
        {"province_code": "AB", "minimum_wage": 15.00, "student_wage": 13.00, "province_name": "Alberta"},
        {"province_code": "QC", "minimum_wage": 16.10, "tipped_wage": 12.20, "province_name": "Quebec"},
        {"province_code": "MB", "minimum_wage": 16.00, "province_name": "Manitoba"},
        {"province_code": "SK", "minimum_wage": 15.35, "province_name": "Saskatchewan"},
        {"province_code": "NS", "minimum_wage": 16.50, "province_name": "Nova Scotia"},
        {"province_code": "NB", "minimum_wage": 15.65, "province_name": "New Brunswick"},
        {"province_code": "NL", "minimum_wage": 16.00, "province_name": "Newfoundland and Labrador"},
        {"province_code": "PE", "minimum_wage": 16.50, "province_name": "Prince Edward Island"},
        {"province_code": "NT", "minimum_wage": 16.95, "province_name": "Northwest Territories"},
        {"province_code": "YT", "minimum_wage": 17.94, "province_name": "Yukon"},
        {"province_code": "NU", "minimum_wage": 19.75, "province_name": "Nunavut"}
    ]
    
    created = 0
    updated = 0
    for wage_data in initial_wages:
        existing = await db.minimum_wages.find_one({"province_code": wage_data["province_code"]})
        
        if not existing:
            wage = ProvinceMinimumWage(
                **wage_data,
                effective_date=datetime.now(timezone.utc),
                updated_by=current_user['user_id'],
                notes="Initial system setup - Feb 2026 rates"
            )
            
            await db.minimum_wages.insert_one(wage.model_dump())
            created += 1
        else:
            # Update existing record with latest rates
            await db.minimum_wages.update_one(
                {"province_code": wage_data["province_code"]},
                {"$set": {
                    "minimum_wage": wage_data["minimum_wage"],
                    "student_wage": wage_data.get("student_wage"),
                    "tipped_wage": wage_data.get("tipped_wage"),
                    "effective_date": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user['user_id'],
                    "notes": "Updated to Feb 2026 rates"
                }}
            )
            updated += 1
    
    return {
        "success": True,
        "message": f"Initialized {created} new provinces, updated {updated} existing",
        "data": {"created": created, "updated": updated}
    }

@router.get("/list", response_model=Dict)
async def list_minimum_wages(
    db = Depends(get_db)
):
    """
    Get minimum wages for all provinces (public endpoint)
    """
    
    wages = await db.minimum_wages.find(
        {},
        {"_id": 0}
    ).sort("province_name", 1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "provinces": wages,
            "total": len(wages)
        }
    }

@router.get("/{province_code}", response_model=Dict)
async def get_province_minimum_wage(
    province_code: str,
    db = Depends(get_db)
):
    """
    Get minimum wage for a specific province
    """
    
    wage = await db.minimum_wages.find_one(
        {"province_code": province_code.upper()},
        {"_id": 0}
    )
    
    if not wage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Minimum wage not found for province: {province_code}"
        )
    
    return {
        "success": True,
        "data": wage
    }

@router.put("/update", response_model=Dict)
async def update_minimum_wage(
    update_data: MinimumWageUpdate,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Update minimum wage for a province
    Super-admin only - critical compliance setting
    """
    
    province_code = update_data.province_code.upper()
    
    if province_code not in CANADIAN_PROVINCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid province code: {province_code}"
        )
    
    # Check if exists
    existing = await db.minimum_wages.find_one({"province_code": province_code})
    
    wage_data = {
        "province_code": province_code,
        "province_name": CANADIAN_PROVINCES[province_code],
        "minimum_wage": update_data.minimum_wage,
        "effective_date": update_data.effective_date,
        "updated_by": current_user['user_id'],
        "updated_date": datetime.now(timezone.utc),
        "notes": update_data.notes
    }
    
    if existing:
        # Store history
        history_record = {
            **existing,
            "archived_date": datetime.now(timezone.utc),
            "replaced_by": update_data.minimum_wage
        }
        await db.minimum_wage_history.insert_one(history_record)
        
        # Update current
        await db.minimum_wages.update_one(
            {"province_code": province_code},
            {"$set": wage_data}
        )
        message = f"Updated minimum wage for {CANADIAN_PROVINCES[province_code]}"
    else:
        # Create new
        await db.minimum_wages.insert_one(wage_data)
        message = f"Created minimum wage for {CANADIAN_PROVINCES[province_code]}"
    
    # Log the change for audit
    audit_log = {
        "action": "minimum_wage_update",
        "province_code": province_code,
        "old_wage": existing.get('minimum_wage') if existing else None,
        "new_wage": update_data.minimum_wage,
        "effective_date": update_data.effective_date.isoformat(),
        "updated_by": current_user['user_id'],
        "updated_date": datetime.now(timezone.utc).isoformat(),
        "notes": update_data.notes
    }
    await db.audit_logs.insert_one(audit_log)
    
    return {
        "success": True,
        "message": message,
        "data": wage_data
    }

@router.get("/history/{province_code}", response_model=Dict)
async def get_minimum_wage_history(
    province_code: str,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db = Depends(get_db)
):
    """
    Get historical minimum wage changes for a province
    """
    
    history = await db.minimum_wage_history.find(
        {"province_code": province_code.upper()},
        {"_id": 0}
    ).sort("archived_date", -1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "province_code": province_code.upper(),
            "history": history,
            "total_changes": len(history)
        }
    }

@router.post("/validate-rate", response_model=Dict)
async def validate_rate_against_minimum(
    hourly_rate: float,
    province_code: str,
    occupation: str = None,
    db = Depends(get_db)
):
    """
    Validate if a proposed hourly rate meets compliance requirements
    Checks both provincial minimum wage AND occupation minimum
    """
    
    # Get provincial minimum wage
    province_wage = await db.minimum_wages.find_one(
        {"province_code": province_code.upper()},
        {"_id": 0}
    )
    
    if not province_wage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Minimum wage not configured for province: {province_code}"
        )
    
    provincial_minimum = province_wage['minimum_wage']
    
    # Get occupation minimum if provided
    occupation_minimum = provincial_minimum
    if occupation:
        from utils.fee_calculator import get_minimum_rate_for_occupation
        occupation_minimum = get_minimum_rate_for_occupation(occupation)
    
    # The effective minimum is the HIGHER of the two
    effective_minimum = max(provincial_minimum, occupation_minimum)
    
    is_valid = hourly_rate >= effective_minimum
    
    validation_result = {
        "is_valid": is_valid,
        "hourly_rate": hourly_rate,
        "provincial_minimum": provincial_minimum,
        "occupation_minimum": occupation_minimum if occupation else None,
        "effective_minimum": effective_minimum,
        "province": province_wage['province_name'],
        "province_code": province_code.upper()
    }
    
    if not is_valid:
        validation_result["error"] = (
            f"Hourly rate ${hourly_rate:.2f} is below the required minimum of ${effective_minimum:.2f}. "
            f"Provincial minimum wage in {province_wage['province_name']}: ${provincial_minimum:.2f}"
            + (f", Occupation minimum for {occupation}: ${occupation_minimum:.2f}" if occupation else "")
        )
    
    return {
        "success": is_valid,
        "data": validation_result
    }
