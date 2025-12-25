from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth.dependencies import get_current_user
from utils.stripe_service import stripe_service
from typing import Dict
from datetime import datetime, timezone

router = APIRouter(prefix="/payments", tags=["Payments"])

def get_db():
    from server import db
    return db

@router.post("/timesheets/{timesheet_id}/pay", response_model=Dict)
async def process_payment(
    timesheet_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Process payment for approved timesheet (employer pays)
    """
    
    # Get timesheet
    timesheet = await db.timesheets.find_one({"timesheet_id": timesheet_id})
    
    if not timesheet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timesheet not found"
        )
    
    # Verify employer owns this
    if timesheet["employer_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Verify timesheet is approved
    if timesheet["status"] != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timesheet must be approved before payment"
        )
    
    # Create Stripe payment intent (employer charges)
    amount = timesheet["gross_pay"]
    
    try:
        payment_result = await stripe_service.create_payment_intent(
            amount=amount,
            metadata={
                "timesheet_id": timesheet_id,
                "workforce_id": timesheet["workforce_id"],
                "employer_id": timesheet["employer_id"]
            }
        )
        
        # Update timesheet
        await db.timesheets.update_one(
            {"timesheet_id": timesheet_id},
            {
                "$set": {
                    "status": "paid",
                    "payment_intent_id": payment_result["payment_intent_id"],
                    "paid_date": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # For MVP: Mark as paid (in production, would trigger actual Stripe transfer)
        # Create payout record for worker
        payout = await stripe_service.create_payout(
            worker_id=timesheet["workforce_id"],
            amount=timesheet["net_pay"],
            description=f"Payment for week ending {timesheet['week_ending_date']}"
        )
        
        return {
            "success": True,
            "data": {
                "payment_intent_id": payment_result["payment_intent_id"],
                "client_secret": payment_result["client_secret"],
                "amount_charged": amount,
                "worker_payout": timesheet["net_pay"]
            },
            "message": "Payment processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/my-earnings", response_model=Dict)
async def get_my_earnings(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get earnings history for workforce
    """
    
    timesheets = await db.timesheets.find(
        {"workforce_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("week_ending_date", -1).to_list(100)
    
    # Calculate totals
    total_earnings = sum(t.get("net_pay", 0) for t in timesheets if t.get("status") == "paid")
    pending_earnings = sum(t.get("net_pay", 0) for t in timesheets if t.get("status") in ["submitted", "approved"])
    
    return {
        "success": True,
        "data": {
            "timesheets": timesheets,
            "total_earnings": total_earnings,
            "pending_earnings": pending_earnings
        }
    }
