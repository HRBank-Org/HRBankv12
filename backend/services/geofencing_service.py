"""
Geofencing Service
Monitors worker locations during active shifts
"""
import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import List, Dict
from math import radians, sin, cos, sqrt, atan2
from services.shift_notification_service import notify_geofence_alert

logger = logging.getLogger(__name__)

# Geofence radius in meters (default: 200 meters)
GEOFENCE_RADIUS_METERS = 200

# Check interval range (random between min and max)
CHECK_INTERVAL_MIN_MINUTES = 15
CHECK_INTERVAL_MAX_MINUTES = 45


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates in meters using Haversine formula
    """
    R = 6371000  # Earth's radius in meters
    
    # Convert to radians
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    # Haversine formula
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    
    return distance


async def check_worker_geofence(db, attendance_id: str, worker_id: str, 
                                workplace_location: Dict, worker_current_location: Dict):
    """
    Check if worker is within geofence of workplace
    """
    try:
        # Get workplace coordinates
        workplace_lat = workplace_location.get('latitude')
        workplace_lon = workplace_location.get('longitude')
        
        # Get worker current coordinates
        worker_lat = worker_current_location.get('latitude')
        worker_lon = worker_current_location.get('longitude')
        
        if not all([workplace_lat, workplace_lon, worker_lat, worker_lon]):
            logger.warning(f"Missing location data for geofence check: {attendance_id}")
            return True  # Assume OK if location data missing
        
        # Calculate distance
        distance = calculate_distance(workplace_lat, workplace_lon, worker_lat, worker_lon)
        
        is_within_geofence = distance <= GEOFENCE_RADIUS_METERS
        
        # Log the check
        geofence_log = {
            "attendance_id": attendance_id,
            "worker_id": worker_id,
            "check_time": datetime.utcnow().isoformat(),
            "workplace_location": workplace_location,
            "worker_location": worker_current_location,
            "distance_meters": round(distance, 2),
            "within_geofence": is_within_geofence,
            "geofence_radius_meters": GEOFENCE_RADIUS_METERS
        }
        
        await db.geofence_checks.insert_one(geofence_log)
        
        # If outside geofence, send alert
        if not is_within_geofence:
            # Get worker and workplace details
            worker = await db.workforce_users.find_one(
                {"user_id": worker_id},
                {"_id": 0, "email": 1, "phone_number": 1, "first_name": 1, "last_name": 1}
            )
            
            attendance = await db.attendance.find_one({"attendance_id": attendance_id})
            if attendance:
                shift = await db.shifts.find_one({"shift_id": attendance["shift_id"]})
                if shift:
                    workplace = await db.workplaces.find_one(
                        {"workplace_id": shift["workplace_id"]},
                        {"_id": 0, "workplace_name": 1}
                    )
                    
                    if worker and workplace:
                        worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip() or "Worker"
                        
                        await notify_geofence_alert(
                            worker_email=worker.get('email'),
                            worker_phone=worker.get('phone_number'),
                            worker_name=worker_name,
                            workplace_name=workplace.get('workplace_name', 'Workplace'),
                            current_location=worker_current_location
                        )
                        
                        logger.warning(f"Geofence alert sent to worker {worker_id}: {distance}m from workplace")
        
        return is_within_geofence
        
    except Exception as e:
        logger.error(f"Error in geofence check: {str(e)}")
        return True  # Assume OK on error


async def monitor_active_shifts(db):
    """
    Background task to periodically check geofencing for all active shifts
    This should be run as a scheduled background task
    """
    logger.info("Starting geofencing monitor...")
    
    while True:
        try:
            # Find all active attendances (clocked in, not clocked out)
            active_attendances = await db.attendance.find({
                "status": "clocked_in",
                "clock_out_time": {"$exists": False}
            }).to_list(1000)
            
            logger.info(f"Found {len(active_attendances)} active shift attendances")
            
            for attendance in active_attendances:
                try:
                    # Get shift and workplace details
                    shift = await db.shifts.find_one({"shift_id": attendance["shift_id"]})
                    if not shift:
                        continue
                    
                    workplace = await db.workplaces.find_one(
                        {"workplace_id": shift["workplace_id"]},
                        {"_id": 0, "location": 1, "workplace_name": 1}
                    )
                    
                    if not workplace or not workplace.get('location'):
                        logger.warning(f"No workplace location for shift {shift['shift_id']}")
                        continue
                    
                    # Get worker's last known location
                    # In production, this would come from a real-time location tracking system
                    # For now, we'll use the clock-in location or prompt for current location
                    worker_location = attendance.get('worker_location_at_clock_in')
                    
                    if not worker_location:
                        continue
                    
                    # Perform geofence check
                    await check_worker_geofence(
                        db=db,
                        attendance_id=attendance["attendance_id"],
                        worker_id=attendance["workforce_id"],
                        workplace_location=workplace['location'],
                        worker_current_location=worker_location
                    )
                    
                except Exception as e:
                    logger.error(f"Error checking attendance {attendance.get('attendance_id')}: {str(e)}")
                    continue
            
            # Random sleep interval for next check (15-45 minutes)
            sleep_minutes = random.randint(CHECK_INTERVAL_MIN_MINUTES, CHECK_INTERVAL_MAX_MINUTES)
            logger.info(f"Geofencing check complete. Next check in {sleep_minutes} minutes")
            await asyncio.sleep(sleep_minutes * 60)
            
        except Exception as e:
            logger.error(f"Error in geofencing monitor: {str(e)}")
            await asyncio.sleep(300)  # Wait 5 minutes on error before retrying


async def check_single_worker_location(db, worker_id: str, current_location: Dict) -> Dict:
    """
    Check a single worker's location against their active shift
    Used for on-demand location checks
    """
    try:
        # Find active attendance for this worker
        attendance = await db.attendance.find_one({
            "workforce_id": worker_id,
            "status": "clocked_in",
            "clock_out_time": {"$exists": False}
        })
        
        if not attendance:
            return {
                "success": False,
                "message": "No active shift found"
            }
        
        # Get workplace location
        shift = await db.shifts.find_one({"shift_id": attendance["shift_id"]})
        if not shift:
            return {
                "success": False,
                "message": "Shift not found"
            }
        
        workplace = await db.workplaces.find_one(
            {"workplace_id": shift["workplace_id"]},
            {"_id": 0, "location": 1}
        )
        
        if not workplace or not workplace.get('location'):
            return {
                "success": False,
                "message": "Workplace location not configured"
            }
        
        # Perform geofence check
        is_within = await check_worker_geofence(
            db=db,
            attendance_id=attendance["attendance_id"],
            worker_id=worker_id,
            workplace_location=workplace['location'],
            worker_current_location=current_location
        )
        
        return {
            "success": True,
            "within_geofence": is_within,
            "attendance_id": attendance["attendance_id"]
        }
        
    except Exception as e:
        logger.error(f"Error checking worker location: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }
