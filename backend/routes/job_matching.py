from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from math import radians, cos, sin, asin, sqrt
import uuid

from models.job_matching import (
    JobPosting, JobMatch, InterviewInvitation, JobOffer, JobApplication,
    JobPostingCreate, InterviewInvitationCreate, JobOfferCreate, JobApplicationCreate
)
from auth.dependencies import get_current_user, require_role
from database import get_database

router = APIRouter(prefix="/api/job-matching", tags=["Job Matching"])

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c  # Radius of Earth in kilometers
    
    return round(km, 1)

def calculate_match_score(job: JobPosting, worker_profile: dict, worker_occupations: List[dict], distance_km: float) -> dict:
    """Calculate match score between job and worker
    
    Priority Order (as per user requirements):
    1. Distance (35% weight) - Proximity is critical
    2. Availability (35% weight) - Worker must be available
    3. Certifications (20% weight) - Required credentials
    4. Skills (10% weight) - Nice to have but can be trained
    """
    
    # Get all worker skills and certifications from occupations
    worker_skills = set()
    worker_certifications = set()
    for occ in worker_occupations:
        worker_skills.update(occ.get('skills', []))
        # Get certifications from credential_details
        for cred in occ.get('credential_details', []):
            if cred.get('status') == 'verified':
                worker_certifications.add(cred.get('credential_name', ''))
    
    # Distance Score (35% weight) - HIGHEST PRIORITY
    # Closer is better: 0-5km = 100%, 5-10km = 90%, 10-15km = 75%, 15-20km = 60%, 20-25km = 40%, >25km = 0%
    if distance_km <= 5:
        distance_score = 100
    elif distance_km <= 10:
        distance_score = 90
    elif distance_km <= 15:
        distance_score = 75
    elif distance_km <= 20:
        distance_score = 60
    elif distance_km <= job.max_distance_km:
        distance_score = 40
    else:
        distance_score = 0
    
    # Availability Score (35% weight) - HIGH PRIORITY
    # Check if worker is currently employed
    is_available = worker_profile.get('employment_status') != 'employed'
    # Check availability hours (if we have this data)
    availability_hours = worker_profile.get('availability_hours', {})
    has_availability = len(availability_hours) > 0
    
    if is_available and has_availability:
        availability_score = 100
    elif is_available:
        availability_score = 80  # Available but no specific hours set
    elif has_availability:
        availability_score = 50  # Has some availability despite being employed
    else:
        availability_score = 30  # Limited availability
    
    # Certification Matching (20% weight) - MEDIUM PRIORITY
    # NEW: Separate occupation-linked certs (PRIMARY) from employer-added certs (SECONDARY)
    # We'll fetch occupation requirements and weight them higher in the match calculation
    
    required_certs = set(job.required_certifications)
    
    # Get occupation-linked certifications (if position matches an occupation template)
    occupation_required_certs = set()
    try:
        from utils.occupation_categories import OCCUPATION_CATEGORIES
        position_title = job.position_title
        
        # Search for occupation in categories to find its required certs
        for category_data in OCCUPATION_CATEGORIES.values():
            for occ in category_data.get("occupations", []):
                if isinstance(occ, dict):
                    occ_title = occ.get("title", "")
                    occ_certs = occ.get("required_certifications", [])
                else:
                    occ_title = occ
                    occ_certs = []
                
                # Case-insensitive match
                if occ_title.lower() == position_title.lower():
                    occupation_required_certs = set(occ_certs)
                    break
            
            if occupation_required_certs:
                break
    except Exception as e:
        # If occupation lookup fails, continue with all certs treated equally
        pass
    
    # Employer-added certs are those NOT in the occupation template
    employer_added_certs = required_certs - occupation_required_certs
    
    if required_certs:
        # Calculate matches for occupation-linked certs (PRIMARY - 70% of cert score)
        if occupation_required_certs:
            matched_occupation_certs = worker_certifications.intersection(occupation_required_certs)
            occupation_cert_score = (len(matched_occupation_certs) / len(occupation_required_certs)) * 100
        else:
            occupation_cert_score = 100  # No occupation requirements
        
        # Calculate matches for employer-added certs (SECONDARY - 30% of cert score)
        if employer_added_certs:
            matched_employer_certs = worker_certifications.intersection(employer_added_certs)
            employer_cert_score = (len(matched_employer_certs) / len(employer_added_certs)) * 100
        else:
            employer_cert_score = 100  # No additional employer requirements
        
        # Weighted certification score: Occupation certs are MORE important
        cert_match_score = (occupation_cert_score * 0.7) + (employer_cert_score * 0.3)
        
        matched_certs = worker_certifications.intersection(required_certs)
    else:
        cert_match_score = 100  # If no certs required, perfect match
        matched_certs = set()
    
    # Skill Matching (10% weight) - LOWER PRIORITY (can be trained)
    required_skills = set(job.required_skills)
    if required_skills:
        matched_skills = worker_skills.intersection(required_skills)
        skill_match_score = (len(matched_skills) / len(required_skills)) * 100
    else:
        skill_match_score = 100  # If no skills required, perfect match
        matched_skills = set()
    
    # Calculate weighted total score with NEW priorities
    total_score = (
        distance_score * 0.35 +
        availability_score * 0.35 +
        cert_match_score * 0.20 +
        skill_match_score * 0.10
    )
    
    return {
        'match_score': round(total_score, 1),
        'skill_match_score': round(skill_match_score, 1),
        'certification_match_score': round(cert_match_score, 1),
        'distance_score': round(distance_score, 1),
        'availability_score': round(availability_score, 1),
        'matched_skills': list(matched_skills),
        'missing_skills': list(required_skills - matched_skills),
        'matched_certifications': list(matched_certs),
        'missing_certifications': list(required_certs - matched_certs)
    }

# ============== EMPLOYER ENDPOINTS ==============

@router.post("/post")
async def post_job_to_matching_engine(
    job_data: JobPostingCreate,
    current_user: dict = Depends(require_role('employer'))
):
    """Employer posts a job to the matching engine"""
    db = await get_database()
    
    # Get workplace details
    workplace = await db.workplaces.find_one({
        'workplace_id': job_data.workplace_id,
        'employer_id': current_user['user_id']
    })
    
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")
    
    # Get employer profile for company name
    employer_profile = await db.employer_profiles.find_one({
        'user_id': current_user['user_id']
    })
    
    # Create job posting
    job = JobPosting(
        **job_data.model_dump(),
        employer_id=current_user['user_id'],
        workplace_address=workplace.get('address', ''),
        workplace_city=workplace.get('city', ''),
        workplace_postal_code=workplace.get('postal_code', ''),
        workplace_coordinates=workplace.get('coordinates'),
        company_name=employer_profile.get('company_name', 'Company'),
        company_logo_url=employer_profile.get('company_logo_url')
    )
    
    # Save to database
    job_dict = job.model_dump()
    # Convert date objects to strings for MongoDB compatibility
    if job_dict.get('start_date'):
        job_dict['start_date'] = job_dict['start_date'].isoformat()
    await db.job_postings.insert_one(job_dict)
    
    # Trigger matching algorithm
    await run_matching_algorithm(db, job)
    
    return {
        'success': True,
        'data': {
            'job_id': job.job_id,
            'message': 'Job posted successfully and matching candidates'
        }
    }

async def run_matching_algorithm(db, job: JobPosting):
    """Run matching algorithm for a job posting"""
    
    # Get all active workforce members with approved profiles
    workforce_members = await db.workforce_profiles.find({
        'profile_status': 'active'
    }).to_list(length=None)
    
    matches = []
    
    for worker in workforce_members:
        # Skip if no coordinates
        worker_coords = worker.get('coordinates')
        job_coords = job.workplace_coordinates
        
        if not worker_coords or not job_coords:
            continue
        
        # Calculate distance
        distance_km = calculate_distance(
            worker_coords['lat'], worker_coords['lng'],
            job_coords['lat'], job_coords['lng']
        )
        
        # Skip if outside max distance
        if distance_km > job.max_distance_km:
            continue
        
        # Get worker's occupations
        worker_occupations = await db.occupation_profiles.find({
            'user_id': worker['user_id'],
            'active': True
        }).to_list(length=None)
        
        # Calculate match score
        match_data = calculate_match_score(job, worker, worker_occupations, distance_km)
        
        # Only create match if score > 50%
        if match_data['match_score'] >= 50:
            job_match = JobMatch(
                job_id=job.job_id,
                workforce_id=worker['user_id'],
                distance_km=distance_km,
                **match_data
            )
            
            matches.append(job_match.model_dump())
    
    # Save all matches
    if matches:
        await db.job_matches.insert_many(matches)
    
    return len(matches)

@router.get("/posted")
async def get_employer_posted_jobs(
    current_user: dict = Depends(require_role('employer'))
):
    """Get all jobs posted by employer"""
    db = await get_database()
    
    jobs = await db.job_postings.find({
        'employer_id': current_user['user_id']
    }).to_list(length=None)
    
    return {
        'success': True,
        'data': {'jobs': jobs}
    }

@router.get("/{job_id}/candidates")
async def get_job_candidates(
    job_id: str,
    min_score: float = Query(default=50, ge=0, le=100),
    current_user: dict = Depends(require_role('employer'))
):
    """Get matched candidates for a job"""
    db = await get_database()
    
    # Verify job belongs to employer
    job = await db.job_postings.find_one({
        'job_id': job_id,
        'employer_id': current_user['user_id']
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get matches sorted by score
    matches = await db.job_matches.find({
        'job_id': job_id,
        'match_score': {'$gte': min_score}
    }).sort('match_score', -1).to_list(length=None)
    
    # Enrich with worker profiles
    candidates = []
    for match in matches:
        worker_profile = await db.workforce_profiles.find_one({
            'user_id': match['workforce_id']
        })
        
        if worker_profile:
            # Get occupations
            occupations = await db.occupation_profiles.find({
                'user_id': match['workforce_id'],
                'active': True
            }).to_list(length=None)
            
            candidates.append({
                **match,
                'worker_name': f"{worker_profile.get('first_name', '')} {worker_profile.get('last_name', '')}",
                'worker_photo': worker_profile.get('profile_photo_url'),
                'worker_rating': worker_profile.get('behavior_rating', 0),
                'total_hours_worked': worker_profile.get('total_hours_worked', 0),
                'occupations': [occ.get('occupation_title') for occ in occupations]
            })
    
    return {
        'success': True,
        'data': {
            'job': job,
            'candidates': candidates,
            'total_matches': len(candidates)
        }
    }

@router.post("/interviews/send")
async def send_interview_invitation(
    invitation_data: InterviewInvitationCreate,
    current_user: dict = Depends(require_role('employer'))
):
    """Send interview invitation to workforce"""
    db = await get_database()
    
    # Get job details
    job = await db.job_postings.find_one({
        'job_id': invitation_data.job_id,
        'employer_id': current_user['user_id']
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create interview invitation
    interview = InterviewInvitation(
        **invitation_data.model_dump(),
        employer_id=current_user['user_id'],
        position_title=job['position_title'],
        company_name=job['company_name'],
        video_link=f"/interview/{invitation_data.workforce_id}/{job['job_id']}"
    )
    
    await db.interview_invitations.insert_one(interview.model_dump())
    
    # Create notification for workforce
    await db.notifications.insert_one({
        'notification_id': str(uuid.uuid4()),
        'user_id': invitation_data.workforce_id,
        'type': 'interview_invitation',
        'title': f'Interview Invitation: {job["position_title"]}',
        'message': f'{job["company_name"]} has invited you for an interview',
        'related_id': interview.interview_id,
        'read': False,
        'created_date': datetime.now(timezone.utc).isoformat()
    })
    
    return {
        'success': True,
        'data': {
            'interview_id': interview.interview_id,
            'message': 'Interview invitation sent successfully'
        }
    }

@router.post("/offers/send")
async def send_job_offer(
    offer_data: JobOfferCreate,
    current_user: dict = Depends(require_role('employer'))
):
    """Send job offer to workforce"""
    db = await get_database()
    
    # Get job and workplace details
    job = await db.job_postings.find_one({
        'job_id': offer_data.job_id,
        'employer_id': current_user['user_id']
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get match to find distance
    match = await db.job_matches.find_one({
        'job_id': offer_data.job_id,
        'workforce_id': offer_data.workforce_id
    })
    
    distance_km = match.get('distance_km', 0) if match else 0
    
    # Create job offer
    expires_date = datetime.now(timezone.utc) + timedelta(hours=offer_data.expires_in_hours)
    
    offer = JobOffer(
        **offer_data.model_dump(exclude={'expires_in_hours'}),
        employer_id=current_user['user_id'],
        position_title=job['position_title'],
        company_name=job['company_name'],
        workplace_id=job['workplace_id'],
        workplace_address=job['workplace_address'],
        distance_km=distance_km,
        expires_date=expires_date,
        expires_in_hours=offer_data.expires_in_hours
    )
    
    await db.job_offers.insert_one(offer.model_dump())
    
    # Create notification
    await db.notifications.insert_one({
        'notification_id': str(uuid.uuid4()),
        'user_id': offer_data.workforce_id,
        'type': 'job_offer',
        'title': f'Job Offer: {job["position_title"]}',
        'message': f'{job["company_name"]} has sent you a job offer at ${offer_data.pay_per_hour}/hr',
        'related_id': offer.offer_id,
        'read': False,
        'created_date': datetime.now(timezone.utc).isoformat()
    })
    
    return {
        'success': True,
        'data': {
            'offer_id': offer.offer_id,
            'message': 'Job offer sent successfully'
        }
    }

# ============== WORKFORCE ENDPOINTS ==============

@router.get("/matched")
async def get_matched_jobs(
    current_user: dict = Depends(require_role('workforce'))
):
    """Get jobs matched to workforce member"""
    db = await get_database()
    
    # Get matches sorted by score
    matches = await db.job_matches.find({
        'workforce_id': current_user['user_id'],
        'status': 'matched'
    }).sort('match_score', -1).to_list(length=None)
    
    # Enrich with job details
    jobs = []
    for match in matches:
        job = await db.job_postings.find_one({
            'job_id': match['job_id'],
            'status': 'active'
        })
        
        if job:
            jobs.append({
                **job,
                'match_score': match['match_score'],
                'distance': match['distance_km'],
                'matched_skills': match['matched_skills'],
                'required_skills': job.get('required_skills', [])
            })
    
    return {
        'success': True,
        'data': {'jobs': jobs}
    }

@router.get("/offers")
async def get_job_offers(
    current_user: dict = Depends(require_role('workforce'))
):
    """Get job offers sent to workforce"""
    db = await get_database()
    
    offers = await db.job_offers.find({
        'workforce_id': current_user['user_id'],
        'status': 'pending',
        'expires_date': {'$gt': datetime.now(timezone.utc)}
    }).to_list(length=None)
    
    # Calculate expires_in_hours for each offer
    for offer in offers:
        expires_delta = offer['expires_date'] - datetime.now(timezone.utc)
        offer['expires_in_hours'] = int(expires_delta.total_seconds() / 3600)
    
    return {
        'success': True,
        'data': {'offers': offers}
    }

@router.get("/interviews")
async def get_interviews(
    current_user: dict = Depends(require_role('workforce'))
):
    """Get interview invitations"""
    db = await get_database()
    
    interviews = await db.interview_invitations.find({
        'workforce_id': current_user['user_id'],
        'status': {'$in': ['pending', 'accepted', 'upcoming']}
    }).sort('scheduled_date', 1).to_list(length=None)
    
    return {
        'success': True,
        'data': {'interviews': interviews}
    }

@router.post("/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    application_data: Optional[JobApplicationCreate] = None,
    current_user: dict = Depends(require_role('workforce'))
):
    """Apply to a matched job"""
    db = await get_database()
    
    # Verify job exists and is active
    job = await db.job_postings.find_one({
        'job_id': job_id,
        'status': 'active'
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer available")
    
    # Check if already applied
    existing_app = await db.job_applications.find_one({
        'job_id': job_id,
        'workforce_id': current_user['user_id']
    })
    
    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Get match_id if exists
    match = await db.job_matches.find_one({
        'job_id': job_id,
        'workforce_id': current_user['user_id']
    })
    
    # Create application
    if application_data:
        app_data = application_data.model_dump()
    else:
        app_data = {'job_id': job_id}
    
    application = JobApplication(
        **app_data,
        workforce_id=current_user['user_id'],
        match_id=match.get('match_id') if match else None
    )
    
    await db.job_applications.insert_one(application.model_dump())
    
    # Update match status
    if match:
        await db.job_matches.update_one(
            {'match_id': match['match_id']},
            {'$set': {'workforce_applied': True, 'status': 'applied', 'applied_date': datetime.now(timezone.utc)}}
        )
    
    return {
        'success': True,
        'data': {
            'application_id': application.application_id,
            'message': 'Application submitted successfully'
        }
    }

@router.post("/offers/{offer_id}/accept")
async def accept_job_offer(
    offer_id: str,
    current_user: dict = Depends(require_role('workforce'))
):
    """Accept a job offer"""
    db = await get_database()
    
    offer = await db.job_offers.find_one({
        'offer_id': offer_id,
        'workforce_id': current_user['user_id'],
        'status': 'pending'
    })
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found or already responded")
    
    # Update offer status
    await db.job_offers.update_one(
        {'offer_id': offer_id},
        {'$set': {
            'status': 'accepted',
            'workforce_response': 'accept',
            'responded_date': datetime.now(timezone.utc)
        }}
    )
    
    # TODO: Create booking/shift for accepted offer
    
    return {
        'success': True,
        'data': {'message': 'Offer accepted successfully'}
    }

@router.post("/offers/{offer_id}/reject")
async def reject_job_offer(
    offer_id: str,
    message: Optional[str] = None,
    current_user: dict = Depends(require_role('workforce'))
):
    """Reject a job offer"""
    db = await get_database()
    
    offer = await db.job_offers.find_one({
        'offer_id': offer_id,
        'workforce_id': current_user['user_id'],
        'status': 'pending'
    })
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found or already responded")
    
    # Update offer status
    await db.job_offers.update_one(
        {'offer_id': offer_id},
        {'$set': {
            'status': 'rejected',
            'workforce_response': 'reject',
            'workforce_message': message,
            'responded_date': datetime.now(timezone.utc)
        }}
    )
    
    return {
        'success': True,
        'data': {'message': 'Offer rejected'}
    }

@router.post("/employment/quit")
async def quit_current_job(
    reason: Optional[str] = None,
    current_user: dict = Depends(require_role('workforce'))
):
    """Quit current job and return to available workforce pool"""
    db = await get_database()
    
    # Get workforce profile
    workforce_profile = await db.workforce_profiles.find_one({
        'user_id': current_user['user_id']
    })
    
    if not workforce_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check if currently employed
    current_employer_id = workforce_profile.get('current_employer_id')
    if not current_employer_id:
        return {
            'success': True,
            'data': {'message': 'You are already in the available workforce pool'}
        }
    
    # Get current employment details
    current_workplace_id = workforce_profile.get('current_workplace_id')
    employment_start_date = workforce_profile.get('employment_start_date')
    
    # Create employment history record
    employment_history_record = {
        'employer_id': current_employer_id,
        'workplace_id': current_workplace_id,
        'position_title': workforce_profile.get('current_position_title', 'Worker'),
        'start_date': employment_start_date,
        'end_date': datetime.now(timezone.utc).isoformat(),
        'quit_reason': reason,
        'status': 'completed',
        'total_hours_worked': 0,  # TODO: Calculate from shifts
        'total_shifts': 0  # TODO: Count from bookings
    }
    
    # Update workforce profile
    await db.workforce_profiles.update_one(
        {'user_id': current_user['user_id']},
        {
            '$set': {
                'employment_status': 'available',
                'current_employer_id': None,
                'current_workplace_id': None,
                'current_position_title': None,
                'employment_start_date': None,
                'last_employment_end_date': datetime.now(timezone.utc).isoformat()
            },
            '$push': {
                'employment_history': employment_history_record
            }
        }
    )
    
    # Cancel any pending shifts/bookings
    await db.bookings.update_many(
        {
            'workforce_id': current_user['user_id'],
            'employer_id': current_employer_id,
            'status': {'$in': ['accepted', 'pending']}
        },
        {
            '$set': {
                'status': 'cancelled',
                'cancellation_reason': 'Workforce member quit job',
                'cancelled_by': 'workforce',
                'cancelled_date': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create notification for employer
    employer_profile = await db.employer_profiles.find_one({
        'user_id': current_employer_id
    })
    
    await db.notifications.insert_one({
        'notification_id': str(uuid.uuid4()),
        'user_id': current_employer_id,
        'type': 'workforce_quit',
        'title': 'Workforce Member Left',
        'message': f'{workforce_profile.get("first_name", "A worker")} {workforce_profile.get("last_name", "")} has quit their position',
        'read': False,
        'created_date': datetime.now(timezone.utc).isoformat()
    })
    
    # Re-run matching algorithm for this worker with all active jobs
    active_jobs = await db.job_postings.find({
        'status': 'active'
    }).to_list(length=None)
    
    matches_created = 0
    for job in active_jobs:
        # Check if already matched
        existing_match = await db.job_matches.find_one({
            'job_id': job['job_id'],
            'workforce_id': current_user['user_id']
        })
        
        if not existing_match:
            # Calculate distance
            worker_coords = workforce_profile.get('coordinates')
            job_coords = job.get('workplace_coordinates')
            
            if worker_coords and job_coords:
                distance_km = calculate_distance(
                    worker_coords['lat'], worker_coords['lng'],
                    job_coords['lat'], job_coords['lng']
                )
                
                if distance_km <= job.get('max_distance_km', 25):
                    # Get worker occupations
                    worker_occupations = await db.occupation_profiles.find({
                        'user_id': current_user['user_id'],
                        'active': True
                    }).to_list(length=None)
                    
                    # Update profile with available status for matching
                    temp_profile = {**workforce_profile, 'employment_status': 'available'}
                    
                    # Calculate match
                    match_data = calculate_match_score(
                        JobPosting(**job),
                        temp_profile,
                        worker_occupations,
                        distance_km
                    )
                    
                    if match_data['match_score'] >= 50:
                        job_match = JobMatch(
                            job_id=job['job_id'],
                            workforce_id=current_user['user_id'],
                            distance_km=distance_km,
                            **match_data
                        )
                        
                        await db.job_matches.insert_one(job_match.model_dump())
                        matches_created += 1
    
    return {
        'success': True,
        'data': {
            'message': 'You have successfully quit your job and are now back in the available workforce pool',
            'new_matches': matches_created,
            'status': 'available'
        }
    }

@router.get("/employment/status")
async def get_employment_status(
    current_user: dict = Depends(require_role('workforce'))
):
    """Get current employment status"""
    db = await get_database()
    
    workforce_profile = await db.workforce_profiles.find_one({
        'user_id': current_user['user_id']
    })
    
    if not workforce_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    employment_status = workforce_profile.get('employment_status', 'available')
    
    result = {
        'employment_status': employment_status,
        'is_available': employment_status != 'employed'
    }
    
    if employment_status == 'employed':
        # Get current employer details
        employer = await db.employer_profiles.find_one({
            'user_id': workforce_profile.get('current_employer_id')
        })
        
        workplace = await db.workplaces.find_one({
            'workplace_id': workforce_profile.get('current_workplace_id')
        })
        
        result.update({
            'current_employer': employer.get('company_name') if employer else 'Unknown',
            'current_workplace': workplace.get('workplace_name') if workplace else 'Unknown',
            'current_position': workforce_profile.get('current_position_title', 'Worker'),
            'employment_start_date': workforce_profile.get('employment_start_date')
        })
    
    return {
        'success': True,
        'data': result
    }

@router.get("/interviews/{interview_id}")
async def get_interview_details(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get interview details for video call"""
    db = await get_database()
    
    interview = await db.interview_invitations.find_one({
        'interview_id': interview_id
    })
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Verify user is part of this interview
    if current_user['user_id'] not in [interview['employer_id'], interview['workforce_id']]:
        raise HTTPException(status_code=403, detail="Not authorized to access this interview")
    
    return {
        'success': True,
        'data': {'interview': interview}
    }

@router.post("/interviews/{interview_id}/complete")
async def complete_interview(
    interview_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark interview as completed"""
    db = await get_database()
    
    interview = await db.interview_invitations.find_one({
        'interview_id': interview_id
    })
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Verify user is part of this interview
    if current_user['user_id'] not in [interview['employer_id'], interview['workforce_id']]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update status
    await db.interview_invitations.update_one(
        {'interview_id': interview_id},
        {'$set': {
            'status': 'completed',
            'completed_date': datetime.now(timezone.utc)
        }}
    )
    
    return {
        'success': True,
        'data': {'message': 'Interview marked as completed'}
    }
