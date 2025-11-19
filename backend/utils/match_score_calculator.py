from typing import Dict, List
from models.occupation_templates import (
    OccupationTemplate, WorkerQualification, MinimumRequirements
)

def calculate_match_score(
    template: Dict,
    worker_qual: Dict
) -> float:
    """
    Calculate match score (0-100) based on how well worker meets template requirements
    
    Scoring:
    - Required certifications met: +20 points each
    - Required skills met: +15 points each
    - Experience meets minimum: +20 points
    - Experience exceeds preferred: +10 bonus points
    - Physical requirements met: +10 points each
    - Other requirements met: +10 points each
    - Optional items met: +5 bonus points each
    - Skill proficiency exceeds requirement: +5 bonus points
    """
    score = 0.0
    total_possible = 0.0
    
    min_req = template.get("minimum_requirements", {})
    
    # 1. CERTIFICATIONS
    req_certs = min_req.get("certifications", [])
    worker_certs = {cert["name"]: cert for cert in worker_qual.get("certifications", [])}
    
    for req_cert in req_certs:
        cert_name = req_cert["name"]
        required = req_cert["required"]
        
        if required:
            total_possible += 20
            worker_cert = worker_certs.get(cert_name)
            if worker_cert and worker_cert.get("has"):
                score += 20
                # Bonus if verified
                if worker_cert.get("verified"):
                    score += 2
        else:
            # Optional certification
            worker_cert = worker_certs.get(cert_name)
            if worker_cert and worker_cert.get("has"):
                score += 5  # Bonus for having optional cert
    
    # 2. SKILLS
    req_skills = min_req.get("skills", [])
    worker_skills = {skill["name"]: skill for skill in worker_qual.get("skills", [])}
    
    proficiency_values = {"basic": 1, "intermediate": 2, "advanced": 3}
    
    for req_skill in req_skills:
        skill_name = req_skill["name"]
        required = req_skill["required"]
        req_level = req_skill.get("proficiency_level", "basic")
        
        if required:
            total_possible += 15
            worker_skill = worker_skills.get(skill_name)
            if worker_skill and worker_skill.get("has"):
                worker_level = worker_skill.get("proficiency_level", "basic")
                req_level_val = proficiency_values.get(req_level, 1)
                worker_level_val = proficiency_values.get(worker_level, 1)
                
                if worker_level_val >= req_level_val:
                    score += 15
                    # Bonus if exceeds required level
                    if worker_level_val > req_level_val:
                        score += 5
                    # Bonus if verified
                    if worker_skill.get("verified"):
                        score += 2
                else:
                    # Partial credit if has skill but lower proficiency
                    score += 10
        else:
            # Optional skill
            worker_skill = worker_skills.get(skill_name)
            if worker_skill and worker_skill.get("has"):
                score += 5  # Bonus for having optional skill
    
    # 3. EXPERIENCE
    req_exp = min_req.get("experience", {})
    min_months = req_exp.get("minimum_months", 0)
    preferred_months = req_exp.get("preferred_months", 0)
    worker_exp = worker_qual.get("experience", {})
    total_months = worker_exp.get("total_months", 0)
    
    total_possible += 20
    if total_months >= min_months:
        score += 20
        # Bonus if exceeds preferred
        if total_months >= preferred_months:
            score += 10
    elif total_months > 0:
        # Partial credit if some experience but below minimum
        score += 10
    
    # 4. PHYSICAL REQUIREMENTS
    req_physical = min_req.get("physical_requirements", [])
    worker_physical = {pr["name"]: pr for pr in worker_qual.get("physical_requirements", [])}
    
    for req_pr in req_physical:
        pr_name = req_pr["name"]
        required = req_pr["required"]
        
        if required:
            total_possible += 10
            worker_pr = worker_physical.get(pr_name)
            if worker_pr and worker_pr.get("confirmed"):
                score += 10
        else:
            # Optional physical requirement
            worker_pr = worker_physical.get(pr_name)
            if worker_pr and worker_pr.get("confirmed"):
                score += 5  # Bonus
    
    # 5. OTHER REQUIREMENTS
    req_other = min_req.get("other_requirements", [])
    worker_other = {ot["name"]: ot for ot in worker_qual.get("other_requirements", [])}
    
    for req_ot in req_other:
        ot_name = req_ot["name"]
        required = req_ot["required"]
        
        if required:
            total_possible += 10
            worker_ot = worker_other.get(ot_name)
            if worker_ot and worker_ot.get("has"):
                score += 10
        else:
            # Optional other requirement
            worker_ot = worker_other.get(ot_name)
            if worker_ot and worker_ot.get("has"):
                score += 5  # Bonus
    
    # Calculate percentage
    if total_possible > 0:
        match_percentage = (score / total_possible) * 100
        # Cap at 100
        match_percentage = min(match_percentage, 100.0)
    else:
        match_percentage = 0.0
    
    return round(match_percentage, 1)


def calculate_custom_requirements_penalty(
    custom_requirements: Dict,
    worker_qual: Dict
) -> float:
    """
    Calculate penalty for not meeting custom employer requirements
    Returns penalty (0-30 points to subtract from match score)
    """
    penalty = 0.0
    
    if not custom_requirements:
        return penalty
    
    # Custom certifications
    custom_certs = custom_requirements.get("certifications", [])
    worker_certs = {cert["name"]: cert for cert in worker_qual.get("certifications", [])}
    
    for custom_cert in custom_certs:
        if custom_cert["required"]:
            cert_name = custom_cert["name"]
            worker_cert = worker_certs.get(cert_name)
            if not (worker_cert and worker_cert.get("has")):
                penalty += 10  # Missing custom certification
    
    # Custom skills
    custom_skills = custom_requirements.get("skills", [])
    worker_skills = {skill["name"]: skill for skill in worker_qual.get("skills", [])}
    
    for custom_skill in custom_skills:
        if custom_skill["required"]:
            skill_name = custom_skill["name"]
            worker_skill = worker_skills.get(skill_name)
            if not (worker_skill and worker_skill.get("has")):
                penalty += 10  # Missing custom skill
    
    return penalty


def calculate_proximity_bonus(distance_km: float) -> float:
    """
    Calculate proximity bonus based on distance
    +5 points if within 5km
    +3 points if within 10km
    +0 points if beyond 10km
    """
    if distance_km <= 5:
        return 5.0
    elif distance_km <= 10:
        return 3.0
    return 0.0


def calculate_total_match_score(
    base_score: float,
    custom_penalty: float,
    proximity_bonus: float,
    recency_bonus: float = 0.0,
    rating_bonus: float = 0.0
) -> float:
    """
    Calculate total match score with all bonuses and penalties
    Total Score: Base + Bonuses - Penalties (0-120 scale)
    """
    total = base_score + proximity_bonus + recency_bonus + rating_bonus - custom_penalty
    # Cap between 0 and 120
    total = max(0.0, min(120.0, total))
    return round(total, 1)
