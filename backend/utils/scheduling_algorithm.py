"""
Multi-concurrent shift scheduling and availability matching algorithms
Supports workers working for multiple employers simultaneously
"""
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import math

def parse_datetime(dt_str: str) -> datetime:
    """Parse ISO format datetime string"""
    return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))

def calculate_overlap_hours(start1: str, end1: str, start2: str, end2: str) -> float:
    """Calculate overlap duration between two time ranges in hours"""
    s1 = parse_datetime(start1)
    e1 = parse_datetime(end1)
    s2 = parse_datetime(start2)
    e2 = parse_datetime(end2)
    
    # Get overlap
    latest_start = max(s1, s2)
    earliest_end = min(e1, e2)
    
    if latest_start < earliest_end:
        overlap = (earliest_end - latest_start).total_seconds() / 3600
        return round(overlap, 2)
    return 0

def check_time_conflict(shift_start: str, shift_end: str, event_start: str, event_end: str) -> bool:
    """
    Check if shift conflicts with an event (locked shift or unavailable block)
    Returns True if there's a conflict
    """
    overlap = calculate_overlap_hours(shift_start, shift_end, event_start, event_end)
    return overlap > 0

async def detect_conflicts(db, worker_id: str, shift_start: str, shift_end: str) -> List[Dict]:
    """
    Detect all schedule conflicts for a worker for a given shift time
    Checks against:
    1. Locked shifts (accepted/active shifts from all employers)
    2. Unavailable blocks (personal time, college, etc.)
    """
    conflicts = []
    
    # 1. Check locked shifts (from all employers)
    locked_shifts = await db.shifts.find({
        "workforce_id": worker_id,
        "status": {"$in": ["accepted", "active", "confirmed"]}
    }).to_list(None)
    
    for shift in locked_shifts:
        if check_time_conflict(shift_start, shift_end, shift['start_time'], shift['end_time']):
            overlap = calculate_overlap_hours(shift_start, shift_end, shift['start_time'], shift['end_time'])
            conflicts.append({
                "conflict_type": "locked_shift",
                "conflicting_event_id": shift['shift_id'],
                "conflicting_event_title": shift.get('title', 'Shift'),
                "conflict_start": shift['start_time'],
                "conflict_end": shift['end_time'],
                "overlap_duration_hours": overlap,
                "employer_id": shift.get('employer_id')
            })
    
    # 2. Check unavailable blocks
    unavailable_blocks = await db.unavailable_blocks.find({
        "worker_id": worker_id
    }).to_list(None)
    
    for block in unavailable_blocks:
        if check_time_conflict(shift_start, shift_end, block['start_time'], block['end_time']):
            overlap = calculate_overlap_hours(shift_start, shift_end, block['start_time'], block['end_time'])
            conflicts.append({
                "conflict_type": "unavailable_block",
                "conflicting_event_id": block['block_id'],
                "conflicting_event_title": block.get('title', 'Unavailable'),
                "conflict_start": block['start_time'],
                "conflict_end": block['end_time'],
                "overlap_duration_hours": overlap,
                "block_type": block.get('type', 'personal')
            })
    
    return conflicts

async def calculate_available_slots(db, worker_id: str, date_start: str, date_end: str, min_duration_hours: float = 1.0) -> List[Dict]:
    """
    Calculate all available time slots for a worker within a date range
    Returns gaps between locked shifts and unavailable blocks that are >= min_duration
    """
    start_dt = parse_datetime(date_start)
    end_dt = parse_datetime(date_end)
    
    # Get all events (locked shifts + unavailable blocks)
    locked_shifts = await db.shifts.find({
        "workforce_id": worker_id,
        "status": {"$in": ["accepted", "active", "confirmed"]},
        "start_time": {"$lt": date_end},
        "end_time": {"$gt": date_start}
    }).to_list(None)
    
    unavailable_blocks = await db.unavailable_blocks.find({
        "worker_id": worker_id,
        "start_time": {"$lt": date_end},
        "end_time": {"$gt": date_start}
    }).to_list(None)
    
    # Merge and sort all events by start time
    all_events = []
    for shift in locked_shifts:
        all_events.append({
            "start": parse_datetime(shift['start_time']),
            "end": parse_datetime(shift['end_time']),
            "type": "shift"
        })
    
    for block in unavailable_blocks:
        all_events.append({
            "start": parse_datetime(block['start_time']),
            "end": parse_datetime(block['end_time']),
            "type": "unavailable"
        })
    
    # Sort by start time
    all_events.sort(key=lambda x: x['start'])
    
    # Calculate gaps
    available_slots = []
    current_time = start_dt
    
    for event in all_events:
        # Gap before this event
        if current_time < event['start']:
            gap_hours = (event['start'] - current_time).total_seconds() / 3600
            if gap_hours >= min_duration_hours:
                available_slots.append({
                    "start_time": current_time.isoformat(),
                    "end_time": event['start'].isoformat(),
                    "duration_hours": round(gap_hours, 2)
                })
        
        # Move current_time to end of this event
        if event['end'] > current_time:
            current_time = event['end']
    
    # Final gap after last event
    if current_time < end_dt:
        gap_hours = (end_dt - current_time).total_seconds() / 3600
        if gap_hours >= min_duration_hours:
            available_slots.append({
                "start_time": current_time.isoformat(),
                "end_time": end_dt.isoformat(),
                "duration_hours": round(gap_hours, 2)
            })
    
    return available_slots

def check_shift_fits_in_available_slot(shift_start: str, shift_end: str, available_slots: List[Dict]) -> bool:
    """
    Check if a shift fits entirely within any available slot
    """
    shift_s = parse_datetime(shift_start)
    shift_e = parse_datetime(shift_end)
    
    for slot in available_slots:
        slot_s = parse_datetime(slot['start_time'])
        slot_e = parse_datetime(slot['end_time'])
        
        # Shift must fit entirely within slot
        if shift_s >= slot_s and shift_e <= slot_e:
            return True
    
    return False

async def match_workers_for_shift(db, shift_request: Dict) -> List[Dict]:
    """
    Find all workers who match a shift request criteria
    Returns list of matched workers with match scores
    """
    # 1. Query workers with required skills
    skills_required = shift_request.get('skills_required', [])
    
    if skills_required:
        # Workers must have at least one required skill
        workers = await db.workforce_profiles.find({
            "skills": {"$in": skills_required}
        }).to_list(None)
    else:
        # No skill requirement, get all workers
        workers = await db.workforce_profiles.find({}).to_list(None)
    
    # 2. Get shift location for proximity matching
    workplace = await db.workplaces.find_one({"workplace_id": shift_request.get('workplace_id')})
    shift_lat = workplace.get('lat') if workplace else None
    shift_long = workplace.get('long') if workplace else None
    max_distance = shift_request.get('max_distance_km', 10)
    
    matched_workers = []
    
    for worker in workers:
        worker_id = worker['workforce_id']
        
        # Get user info
        user = await db.users.find_one({"user_id": worker_id})
        if not user or user.get('account_status') != 'active':
            continue
        
        # 3. Check availability (no conflicts)
        conflicts = await detect_conflicts(
            db, 
            worker_id, 
            shift_request['start_time'], 
            shift_request['end_time']
        )
        
        available = len(conflicts) == 0
        conflict_reason = None
        if not available:
            conflict_types = [c['conflict_type'] for c in conflicts]
            conflict_reason = f"Conflicts with {', '.join(set(conflict_types))}"
        
        # 4. Calculate proximity (if location available)
        distance_km = 0
        if shift_lat and shift_long and worker.get('lat') and worker.get('long'):
            distance_km = calculate_distance(
                shift_lat, shift_long,
                worker.get('lat'), worker.get('long')
            )
            
            # Filter by max distance
            if distance_km > max_distance:
                continue
        
        # 5. Calculate match score (0-100)
        match_score = calculate_match_score(
            worker=worker,
            shift_request=shift_request,
            distance_km=distance_km,
            available=available
        )
        
        matched_workers.append({
            "worker_id": worker_id,
            "full_name": user.get('full_name', 'Unknown'),
            "profile_photo": worker.get('profile_photo'),
            "rating": worker.get('average_rating', 0),
            "total_shifts": worker.get('total_shifts_completed', 0),
            "distance_km": round(distance_km, 2),
            "skills": worker.get('skills', []),
            "available": available,
            "conflict_reason": conflict_reason,
            "match_score": match_score,
            "conflicts": conflicts if not available else []
        })
    
    # Sort by match score (highest first)
    matched_workers.sort(key=lambda x: x['match_score'], reverse=True)
    
    return matched_workers

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance

def calculate_match_score(worker: Dict, shift_request: Dict, distance_km: float, available: bool) -> float:
    """
    Calculate match score (0-100) based on:
    - Availability (40 points)
    - Rating (30 points)
    - Proximity (20 points)
    - Experience (10 points)
    """
    score = 0
    
    # Availability (40 points)
    if available:
        score += 40
    
    # Rating (30 points)
    rating = worker.get('average_rating', 0)
    score += (rating / 5.0) * 30
    
    # Proximity (20 points) - inverse relationship
    if distance_km <= 1:
        score += 20
    elif distance_km <= 5:
        score += 15
    elif distance_km <= 10:
        score += 10
    elif distance_km <= 20:
        score += 5
    
    # Experience (10 points)
    total_shifts = worker.get('total_shifts_completed', 0)
    if total_shifts >= 100:
        score += 10
    elif total_shifts >= 50:
        score += 7
    elif total_shifts >= 20:
        score += 5
    elif total_shifts >= 5:
        score += 3
    
    return round(score, 1)
