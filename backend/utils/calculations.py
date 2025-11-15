import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula
    Returns distance in kilometers
    """
    R = 6371  # Earth radius in kilometers
    
    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(dLat/2) * math.sin(dLat/2) +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(dLon/2) * math.sin(dLon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return distance

def meters_to_km(meters: float) -> float:
    """Convert meters to kilometers"""
    return meters / 1000

def km_to_meters(km: float) -> float:
    """Convert kilometers to meters"""
    return km * 1000

def calculate_match_score(
    worker_skills: list,
    worker_credentials: list,
    worker_lat: float,
    worker_long: float,
    worker_rating: float,
    worker_available: bool,
    role_required_skills: list,
    role_required_credentials: list,
    workplace_lat: float,
    workplace_long: float,
    geofence_radius_km: float
) -> float:
    """
    Calculate match score (0-100) using 5-factor weighted algorithm
    1. Availability (20%)
    2. Proximity (30%)
    3. Skills Match (25%)
    4. Verified Credentials (15%)
    5. Worker Rating (10%)
    """
    score = 0.0
    
    # 1. Availability Match (20 points)
    if worker_available:
        score += 20
    
    # 2. Proximity (30 points)
    distance = haversine_distance(worker_lat, worker_long, workplace_lat, workplace_long)
    if distance <= geofence_radius_km:
        proximity_score = (1 - (distance / geofence_radius_km)) * 30
        score += proximity_score
    
    # 3. Skills Match (25 points)
    if role_required_skills:
        matching_skills = set(worker_skills) & set(role_required_skills)
        skills_match_rate = len(matching_skills) / len(role_required_skills)
        score += skills_match_rate * 25
    else:
        score += 25  # No required skills = perfect match
    
    # 4. Verified Credentials (15 points)
    if role_required_credentials:
        matching_creds = set(worker_credentials) & set(role_required_credentials)
        creds_match_rate = len(matching_creds) / len(role_required_credentials)
        score += creds_match_rate * 15
    else:
        score += 15  # No required credentials = perfect match
    
    # 5. Worker Rating (10 points)
    if worker_rating > 0:
        rating_score = (worker_rating / 5.0) * 10
        score += rating_score
    
    return round(score, 1)

def calculate_profile_completeness(
    has_personal_info: bool,
    has_skills: bool,
    has_availability: bool,
    has_documents: bool,
    has_credentials: bool
) -> int:
    """
    Calculate profile completeness percentage (0-100)
    Each section worth 20%
    """
    completeness = 0
    
    if has_personal_info:
        completeness += 20
    if has_skills:
        completeness += 20
    if has_availability:
        completeness += 20
    if has_documents:
        completeness += 20
    if has_credentials:
        completeness += 20
    
    return completeness

def calculate_overtime(
    weekly_hours_before_shift: float,
    shift_duration_hours: float,
    regular_rate: float,
    threshold_hours: int = 44,
    multiplier: float = 1.5
) -> dict:
    """
    Calculate overtime hours and pay (Ontario rules)
    Returns: {regular_hours, overtime_hours, regular_pay, overtime_pay, total_pay}
    """
    total_weekly_hours = weekly_hours_before_shift + shift_duration_hours
    
    if total_weekly_hours <= threshold_hours:
        # All regular hours
        return {
            'regular_hours': shift_duration_hours,
            'overtime_hours': 0.0,
            'regular_pay': shift_duration_hours * regular_rate,
            'overtime_pay': 0.0,
            'total_pay': shift_duration_hours * regular_rate,
            'overtime_rate': regular_rate * multiplier
        }
    
    if weekly_hours_before_shift >= threshold_hours:
        # All overtime hours
        overtime_rate = regular_rate * multiplier
        return {
            'regular_hours': 0.0,
            'overtime_hours': shift_duration_hours,
            'regular_pay': 0.0,
            'overtime_pay': shift_duration_hours * overtime_rate,
            'total_pay': shift_duration_hours * overtime_rate,
            'overtime_rate': overtime_rate
        }
    
    # Split: some regular, some overtime
    regular_hours = threshold_hours - weekly_hours_before_shift
    overtime_hours = shift_duration_hours - regular_hours
    overtime_rate = regular_rate * multiplier
    
    return {
        'regular_hours': regular_hours,
        'overtime_hours': overtime_hours,
        'regular_pay': regular_hours * regular_rate,
        'overtime_pay': overtime_hours * overtime_rate,
        'total_pay': (regular_hours * regular_rate) + (overtime_hours * overtime_rate),
        'overtime_rate': overtime_rate
    }
