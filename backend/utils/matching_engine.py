from utils.calculations import haversine_distance
from datetime import datetime, time
from typing import List, Dict

def calculate_match_score(
    worker_data: dict,
    occupation_data: dict,
    role_data: dict,
    shift_data: dict,
    workplace_data: dict
) -> float:
    """
    Calculate match score (0-100) for worker-role pairing
    
    Factors (from specification):
    1. Availability Match (20%)
    2. Proximity (30%)
    3. Skills Match (25%)
    4. Verified Credentials (15%)
    5. Worker Rating (10%)
    """
    score = 0.0
    
    # 1. AVAILABILITY MATCH (20 points)
    shift_start = shift_data.get('start_time', '09:00')
    shift_end = shift_data.get('end_time', '17:00')
    shift_date = shift_data.get('shift_date')
    
    # Check if worker is available during shift time
    # Parse shift times
    start_hour = int(shift_start.split(':')[0])
    end_hour = int(shift_end.split(':')[0])
    
    # Get day of week from shift_date
    if shift_date:
        shift_datetime = datetime.fromisoformat(shift_date) if isinstance(shift_date, str) else shift_date
        day_name = shift_datetime.strftime('%A').lower()
    else:
        day_name = 'monday'  # Default
    
    worker_availability = worker_data.get('availability_hours', {}).get(day_name, [])
    
    # Check if all shift hours are covered by availability
    shift_hours_covered = 0
    total_shift_hours = end_hour - start_hour
    
    for hour in range(start_hour, end_hour):
        time_slot = f"{hour:02d}:00-{(hour+1):02d}:00"
        if time_slot in worker_availability:
            shift_hours_covered += 1
    
    if total_shift_hours > 0:
        availability_match_rate = shift_hours_covered / total_shift_hours
        score += availability_match_rate * 20
    
    # Check blackout dates
    blackout_dates = worker_data.get('blackout_dates', [])
    if shift_date and shift_date not in blackout_dates:
        # No blackout, good
        pass
    else:
        score -= 10  # Penalize if on blackout date
    
    # 2. PROXIMITY (30 points)
    worker_lat = worker_data.get('lat')
    worker_long = worker_data.get('long')
    workplace_lat = workplace_data.get('lat')
    workplace_long = workplace_data.get('long')
    
    if worker_lat and worker_long and workplace_lat and workplace_long:
        distance_km = haversine_distance(worker_lat, worker_long, workplace_lat, workplace_long)
        geofence_radius = workplace_data.get('job_matching_radius_km', 20)
        
        if distance_km <= geofence_radius:
            proximity_score = (1 - (distance_km / geofence_radius)) * 30
            score += proximity_score
        # If outside geofence, 0 points for proximity
    
    # 3. SKILLS MATCH (25 points)
    required_skills = role_data.get('required_skills', [])
    worker_skills = occupation_data.get('skills', [])
    
    if required_skills:
        matching_skills = set(worker_skills) & set(required_skills)
        skills_match_rate = len(matching_skills) / len(required_skills)
        score += skills_match_rate * 25
    else:
        score += 25  # No required skills = perfect match
    
    # 4. VERIFIED CREDENTIALS (15 points)
    required_certs = role_data.get('required_certifications', [])
    worker_certs = occupation_data.get('certifications', [])  # Only approved ones
    
    if required_certs:
        matching_certs = set(worker_certs) & set(required_certs)
        creds_match_rate = len(matching_certs) / len(required_certs)
        score += creds_match_rate * 15
    else:
        score += 15  # No required certs = perfect match
    
    # 5. WORKER RATING (10 points)
    # Use skill rating for this occupation
    skill_rating = occupation_data.get('skill_rating_avg', 0)
    if skill_rating > 0:
        rating_score = (skill_rating / 5.0) * 10
        score += rating_score
    
    # Ensure score is between 0-100
    score = max(0, min(100, score))
    
    return round(score, 1)

def get_matched_workers_for_role(
    role_id: str,
    shift_data: dict,
    workplace_data: dict,
    db,
    min_match_score: float = 50.0
) -> List[Dict]:
    """
    Find all workers that match a role
    Returns list of workers with match scores
    """
    # This will be implemented as an async function in routes
    pass

def get_matched_jobs_for_worker(
    worker_data: dict,
    occupation_id: str,
    db,
    min_match_score: float = 50.0
) -> List[Dict]:
    """
    Find all open jobs that match a worker's occupation profile
    Returns list of jobs with match scores
    """
    # This will be implemented as an async function in routes
    pass
