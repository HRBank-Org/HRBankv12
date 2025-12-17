"""
Google-powered Geofencing Utilities
Uses Google Distance Matrix API and Timezone API for accurate location services
"""
import os
import httpx
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2
import logging

logger = logging.getLogger(__name__)

# API Keys from environment
DISTANCE_MATRIX_API_KEY = os.environ.get('GOOGLE_DISTANCE_MATRIX_API_KEY', '')
TIMEZONE_API_KEY = os.environ.get('GOOGLE_TIMEZONE_API_KEY', '')
GEOCODING_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates in meters using Haversine formula.
    Fast and free - no API call needed.
    """
    R = 6371000  # Earth's radius in meters
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    return R * c


async def get_distance_matrix(
    origin_lat: float, 
    origin_lng: float, 
    dest_lat: float, 
    dest_lng: float,
    mode: str = "driving"
) -> Optional[Dict]:
    """
    Get distance and duration between two points using Google Distance Matrix API.
    Returns actual travel distance/time (not straight-line).
    
    Args:
        origin_lat, origin_lng: Starting point coordinates
        dest_lat, dest_lng: Destination coordinates
        mode: Travel mode - "driving", "walking", "bicycling", "transit"
    
    Returns:
        Dict with distance_meters, distance_text, duration_seconds, duration_text
    """
    if not DISTANCE_MATRIX_API_KEY:
        logger.warning("Distance Matrix API key not configured, using Haversine")
        straight_line = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        return {
            "distance_meters": straight_line,
            "distance_text": f"{straight_line/1000:.1f} km",
            "duration_seconds": None,
            "duration_text": None,
            "method": "haversine"
        }
    
    try:
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        params = {
            "origins": f"{origin_lat},{origin_lng}",
            "destinations": f"{dest_lat},{dest_lng}",
            "mode": mode,
            "key": DISTANCE_MATRIX_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK":
            element = data["rows"][0]["elements"][0]
            if element.get("status") == "OK":
                return {
                    "distance_meters": element["distance"]["value"],
                    "distance_text": element["distance"]["text"],
                    "duration_seconds": element["duration"]["value"],
                    "duration_text": element["duration"]["text"],
                    "method": "google_distance_matrix"
                }
        
        logger.warning(f"Distance Matrix API returned: {data.get('status')}")
        # Fallback to Haversine
        straight_line = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        return {
            "distance_meters": straight_line,
            "distance_text": f"{straight_line/1000:.1f} km",
            "duration_seconds": None,
            "duration_text": None,
            "method": "haversine_fallback"
        }
        
    except Exception as e:
        logger.error(f"Distance Matrix API error: {e}")
        straight_line = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        return {
            "distance_meters": straight_line,
            "distance_text": f"{straight_line/1000:.1f} km",
            "duration_seconds": None,
            "duration_text": None,
            "method": "haversine_error"
        }


async def get_timezone(lat: float, lng: float, timestamp: int = None) -> Optional[Dict]:
    """
    Get timezone information for a location using Google Timezone API.
    
    Args:
        lat, lng: Coordinates
        timestamp: Unix timestamp (defaults to now)
    
    Returns:
        Dict with timezone_id, timezone_name, utc_offset_seconds, dst_offset_seconds
    """
    if not TIMEZONE_API_KEY:
        logger.warning("Timezone API key not configured")
        return None
    
    try:
        if timestamp is None:
            timestamp = int(datetime.now(timezone.utc).timestamp())
        
        url = "https://maps.googleapis.com/maps/api/timezone/json"
        params = {
            "location": f"{lat},{lng}",
            "timestamp": timestamp,
            "key": TIMEZONE_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK":
            return {
                "timezone_id": data.get("timeZoneId"),
                "timezone_name": data.get("timeZoneName"),
                "utc_offset_seconds": data.get("rawOffset", 0),
                "dst_offset_seconds": data.get("dstOffset", 0),
                "total_offset_seconds": data.get("rawOffset", 0) + data.get("dstOffset", 0)
            }
        
        logger.warning(f"Timezone API returned: {data.get('status')}")
        return None
        
    except Exception as e:
        logger.error(f"Timezone API error: {e}")
        return None


async def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Convert address to coordinates using Google Geocoding API.
    
    Returns:
        Tuple of (latitude, longitude) or None if not found
    """
    if not GEOCODING_API_KEY:
        logger.warning("Geocoding API key not configured")
        return None
    
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": address,
            "key": GEOCODING_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK" and data.get("results"):
            location = data["results"][0]["geometry"]["location"]
            return (location["lat"], location["lng"])
        
        logger.warning(f"Geocoding API returned: {data.get('status')}")
        return None
        
    except Exception as e:
        logger.error(f"Geocoding API error: {e}")
        return None


async def reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """
    Convert coordinates to address using Google Geocoding API.
    
    Returns:
        Formatted address string or None
    """
    if not GEOCODING_API_KEY:
        return None
    
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "latlng": f"{lat},{lng}",
            "key": GEOCODING_API_KEY
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            data = response.json()
        
        if data.get("status") == "OK" and data.get("results"):
            return data["results"][0].get("formatted_address")
        
        return None
        
    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        return None


async def check_geofence(
    worker_lat: float,
    worker_lng: float,
    workplace_lat: float,
    workplace_lng: float,
    radius_meters: float = 200,
    use_distance_matrix: bool = False
) -> Dict:
    """
    Check if worker is within geofence radius of workplace.
    
    Args:
        worker_lat, worker_lng: Worker's current location
        workplace_lat, workplace_lng: Workplace location
        radius_meters: Geofence radius in meters
        use_distance_matrix: If True, use Google Distance Matrix (accounts for roads)
    
    Returns:
        Dict with is_within_geofence, distance_meters, method used
    """
    if use_distance_matrix:
        result = await get_distance_matrix(
            worker_lat, worker_lng,
            workplace_lat, workplace_lng,
            mode="walking"  # Walking distance for geofencing
        )
        distance = result["distance_meters"]
        method = result["method"]
    else:
        distance = haversine_distance(worker_lat, worker_lng, workplace_lat, workplace_lng)
        method = "haversine"
    
    is_within = distance <= radius_meters
    
    return {
        "is_within_geofence": is_within,
        "distance_meters": round(distance, 2),
        "radius_meters": radius_meters,
        "method": method,
        "worker_location": {"lat": worker_lat, "lng": worker_lng},
        "workplace_location": {"lat": workplace_lat, "lng": workplace_lng}
    }


async def validate_clock_in_location(
    db,
    worker_id: str,
    worker_lat: float,
    worker_lng: float,
    shift_id: str,
    geofence_radius: float = 200
) -> Dict:
    """
    Validate that a worker is within the geofence when clocking in.
    
    Returns:
        Dict with allowed (bool), distance, workplace info, and timezone
    """
    # Get shift and workplace
    shift = await db.shifts.find_one({"shift_id": shift_id}, {"_id": 0})
    if not shift:
        return {"allowed": False, "error": "Shift not found"}
    
    workplace = await db.workplaces.find_one(
        {"workplace_id": shift.get("workplace_id")},
        {"_id": 0}
    )
    if not workplace:
        return {"allowed": False, "error": "Workplace not found"}
    
    # Get workplace coordinates
    workplace_lat = workplace.get("lat") or workplace.get("latitude")
    workplace_lng = workplace.get("long") or workplace.get("longitude")
    
    if not workplace_lat or not workplace_lng:
        # Try to geocode the address
        address = f"{workplace.get('address')}, {workplace.get('city')}, {workplace.get('province', 'Ontario')}, Canada"
        coords = await geocode_address(address)
        if coords:
            workplace_lat, workplace_lng = coords
            # Save coordinates for future use
            await db.workplaces.update_one(
                {"workplace_id": workplace.get("workplace_id")},
                {"$set": {"lat": workplace_lat, "long": workplace_lng}}
            )
        else:
            return {"allowed": False, "error": "Could not determine workplace location"}
    
    # Use workplace's geofence radius if set, otherwise use default
    radius = workplace.get("geofence_radius", workplace.get("job_matching_radius_km", 0.2) * 1000)
    if radius < 50:  # If radius seems to be in km, convert to meters
        radius = radius * 1000
    radius = max(radius, geofence_radius)  # Use at least the default
    
    # Check geofence
    geofence_result = await check_geofence(
        worker_lat, worker_lng,
        float(workplace_lat), float(workplace_lng),
        radius_meters=radius
    )
    
    # Get timezone for the workplace
    tz_info = await get_timezone(float(workplace_lat), float(workplace_lng))
    
    return {
        "allowed": geofence_result["is_within_geofence"],
        "distance_meters": geofence_result["distance_meters"],
        "geofence_radius_meters": radius,
        "workplace_name": workplace.get("workplace_name") or workplace.get("name"),
        "workplace_address": f"{workplace.get('address')}, {workplace.get('city')}",
        "timezone": tz_info,
        "method": geofence_result["method"]
    }
