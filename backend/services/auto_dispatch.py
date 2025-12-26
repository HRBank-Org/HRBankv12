"""
Auto-Dispatch Service for Grid Services (CleanGrid/CareGrid)
============================================================
Automatically assigns service tasks to optimal workers based on:
- Geographic proximity (FSA/postal code matching)
- Worker availability and schedule
- Skills and certifications
- Workload balancing
- Worker preferences
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from math import radians, sin, cos, sqrt, atan2
import asyncio


class AutoDispatchService:
    """
    Service for automatically dispatching service tasks to workers.
    Used by CleanGrid, CareGrid, and other field service operations.
    """
    
    def __init__(self):
        self.dispatch_config = {
            "max_distance_km": 25,  # Maximum distance for worker assignment
            "max_daily_tasks": 8,   # Maximum tasks per worker per day
            "buffer_minutes": 30,   # Buffer between tasks
            "priority_weights": {
                "distance": 0.3,
                "availability": 0.25,
                "skills_match": 0.2,
                "workload_balance": 0.15,
                "worker_preference": 0.1
            }
        }
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates in kilometers using Haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)
        
        a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    async def get_available_workers(
        self,
        db,
        employer_id: str,
        workplace_id: str,
        task_date: datetime,
        task_time_start: str,
        task_duration_minutes: int = 60,
        required_skills: List[str] = None
    ) -> List[dict]:
        """
        Get list of workers available for a task at the specified time.
        
        Checks:
        - Employment relationship with employer/workplace
        - Not already assigned to another task at that time
        - Daily task limit not exceeded
        - Has required skills/certifications
        """
        
        # Get workers employed at this workplace
        relationships = await db.employment_relationships.find({
            "employer_id": employer_id,
            "workplace_id": workplace_id,
            "status": "active"
        }, {"_id": 0, "workforce_id": 1, "role_id": 1}).to_list(None)
        
        if not relationships:
            return []
        
        worker_ids = [r["workforce_id"] for r in relationships]
        
        # Get worker profiles
        workers = await db.workforce_profiles.find({
            "user_id": {"$in": worker_ids},
            "profile_status": "active"
        }, {"_id": 0}).to_list(None)
        
        available_workers = []
        task_date_str = task_date.strftime("%Y-%m-%d")
        
        for worker in workers:
            worker_id = worker["user_id"]
            
            # Check daily task count
            daily_tasks = await db.service_tasks.count_documents({
                "worker_id": worker_id,
                "scheduled_date": task_date_str,
                "status": {"$in": ["assigned", "in_progress"]}
            })
            
            if daily_tasks >= self.dispatch_config["max_daily_tasks"]:
                continue
            
            # Check time slot availability
            time_conflict = await self._check_time_conflict(
                db, worker_id, task_date_str, task_time_start, task_duration_minutes
            )
            
            if time_conflict:
                continue
            
            # Check skills match if required
            if required_skills:
                worker_skills = worker.get("skills", [])
                worker_certs = [c.get("name", "") for c in worker.get("certifications", [])]
                all_worker_skills = set([s.lower() for s in worker_skills + worker_certs])
                required_set = set([s.lower() for s in required_skills])
                
                if not required_set.issubset(all_worker_skills):
                    continue
            
            # Calculate worker score
            worker["daily_tasks"] = daily_tasks
            worker["skills_match_score"] = self._calculate_skills_score(
                worker.get("skills", []),
                required_skills or []
            )
            available_workers.append(worker)
        
        return available_workers
    
    async def _check_time_conflict(
        self,
        db,
        worker_id: str,
        task_date: str,
        task_time: str,
        duration_minutes: int
    ) -> bool:
        """Check if worker has a time conflict with existing tasks"""
        
        # Get worker's tasks for the day
        tasks = await db.service_tasks.find({
            "worker_id": worker_id,
            "scheduled_date": task_date,
            "status": {"$in": ["assigned", "in_progress"]}
        }, {"_id": 0, "scheduled_time": 1, "estimated_duration_minutes": 1}).to_list(None)
        
        if not tasks:
            return False
        
        # Parse new task time
        try:
            new_start = datetime.strptime(task_time, "%H:%M")
            new_end = new_start + timedelta(minutes=duration_minutes + self.dispatch_config["buffer_minutes"])
        except ValueError:
            return False
        
        # Check each existing task for overlap
        for task in tasks:
            try:
                existing_start = datetime.strptime(task["scheduled_time"], "%H:%M")
                existing_duration = task.get("estimated_duration_minutes", 60)
                existing_end = existing_start + timedelta(minutes=existing_duration + self.dispatch_config["buffer_minutes"])
                
                # Check for overlap
                if not (new_end <= existing_start or new_start >= existing_end):
                    return True
            except ValueError:
                continue
        
        return False
    
    def _calculate_skills_score(self, worker_skills: List[str], required_skills: List[str]) -> float:
        """Calculate skill match score (0-1)"""
        if not required_skills:
            return 1.0
        
        worker_skills_lower = set(s.lower() for s in worker_skills)
        required_lower = set(s.lower() for s in required_skills)
        
        if not required_lower:
            return 1.0
        
        matches = len(worker_skills_lower.intersection(required_lower))
        return matches / len(required_lower)
    
    async def calculate_worker_scores(
        self,
        db,
        workers: List[dict],
        task_location: dict,
        workplace: dict
    ) -> List[dict]:
        """
        Calculate dispatch scores for each worker.
        Higher score = better match for the task.
        """
        
        scored_workers = []
        
        for worker in workers:
            scores = {
                "distance": 0.0,
                "availability": 0.0,
                "skills_match": worker.get("skills_match_score", 1.0),
                "workload_balance": 0.0,
                "worker_preference": 0.0
            }
            
            # Distance score (closer = higher score)
            worker_lat = worker.get("latitude") or worker.get("address", {}).get("latitude")
            worker_lon = worker.get("longitude") or worker.get("address", {}).get("longitude")
            task_lat = task_location.get("latitude")
            task_lon = task_location.get("longitude")
            
            if all([worker_lat, worker_lon, task_lat, task_lon]):
                distance = self.calculate_distance(worker_lat, worker_lon, task_lat, task_lon)
                if distance <= self.dispatch_config["max_distance_km"]:
                    scores["distance"] = 1.0 - (distance / self.dispatch_config["max_distance_km"])
            else:
                # FSA-based distance approximation
                worker_fsa = worker.get("postal_code", "")[:3].upper() if worker.get("postal_code") else ""
                task_fsa = task_location.get("fsa", "")
                
                if worker_fsa and task_fsa:
                    if worker_fsa == task_fsa:
                        scores["distance"] = 0.9  # Same FSA
                    elif worker_fsa[0] == task_fsa[0]:
                        scores["distance"] = 0.6  # Same region
                    else:
                        scores["distance"] = 0.3  # Different region
            
            # Availability score (fewer tasks today = higher score)
            daily_tasks = worker.get("daily_tasks", 0)
            max_tasks = self.dispatch_config["max_daily_tasks"]
            scores["availability"] = 1.0 - (daily_tasks / max_tasks)
            
            # Workload balance score (distribute tasks evenly)
            if daily_tasks == 0:
                scores["workload_balance"] = 1.0
            elif daily_tasks < 3:
                scores["workload_balance"] = 0.8
            elif daily_tasks < 5:
                scores["workload_balance"] = 0.5
            else:
                scores["workload_balance"] = 0.2
            
            # Worker preference score (based on preferred areas/task types)
            preferred_fsas = worker.get("preferred_service_areas", [])
            task_fsa = task_location.get("fsa", "")
            if task_fsa and preferred_fsas:
                if task_fsa in preferred_fsas:
                    scores["worker_preference"] = 1.0
                else:
                    scores["worker_preference"] = 0.5
            else:
                scores["worker_preference"] = 0.7  # Neutral
            
            # Calculate weighted total score
            weights = self.dispatch_config["priority_weights"]
            total_score = sum(
                scores[key] * weights[key]
                for key in weights
            )
            
            worker["dispatch_scores"] = scores
            worker["total_dispatch_score"] = round(total_score, 3)
            scored_workers.append(worker)
        
        # Sort by total score (highest first)
        scored_workers.sort(key=lambda w: w["total_dispatch_score"], reverse=True)
        
        return scored_workers
    
    async def auto_dispatch_task(
        self,
        db,
        task_id: str,
        dry_run: bool = False
    ) -> dict:
        """
        Automatically dispatch a task to the best available worker.
        
        Args:
            db: Database connection
            task_id: ID of the task to dispatch
            dry_run: If True, only calculate recommendations without assigning
            
        Returns:
            Dict with dispatch result and recommendations
        """
        
        # Get task details
        task = await db.service_tasks.find_one(
            {"task_id": task_id},
            {"_id": 0}
        )
        
        if not task:
            return {"success": False, "error": "Task not found"}
        
        if task.get("status") not in ["pending", "unassigned"]:
            return {"success": False, "error": f"Task status is '{task.get('status')}', cannot dispatch"}
        
        # Get workplace info
        workplace = await db.workplaces.find_one(
            {"workplace_id": task["workplace_id"]},
            {"_id": 0}
        )
        
        if not workplace:
            return {"success": False, "error": "Workplace not found"}
        
        # Parse task date
        task_date_str = task.get("scheduled_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        try:
            task_date = datetime.strptime(task_date_str, "%Y-%m-%d")
        except:
            task_date = datetime.now(timezone.utc)
        
        # Get available workers
        available_workers = await self.get_available_workers(
            db=db,
            employer_id=task["employer_id"],
            workplace_id=task["workplace_id"],
            task_date=task_date,
            task_time_start=task.get("scheduled_time", "09:00"),
            task_duration_minutes=task.get("estimated_duration_minutes", 60),
            required_skills=task.get("required_skills", [])
        )
        
        if not available_workers:
            return {
                "success": False,
                "error": "No available workers found",
                "recommendations": [],
                "task_id": task_id
            }
        
        # Calculate scores
        task_location = task.get("address", {})
        scored_workers = await self.calculate_worker_scores(
            db, available_workers, task_location, workplace
        )
        
        # Prepare recommendations
        recommendations = [
            {
                "worker_id": w["user_id"],
                "worker_name": f"{w.get('first_name', '')} {w.get('last_name', '')}".strip() or "Unknown",
                "total_score": w["total_dispatch_score"],
                "scores": w["dispatch_scores"],
                "daily_tasks": w.get("daily_tasks", 0)
            }
            for w in scored_workers[:5]  # Top 5 recommendations
        ]
        
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "task_id": task_id,
                "recommendations": recommendations,
                "best_match": recommendations[0] if recommendations else None
            }
        
        # Auto-assign to best worker
        best_worker = scored_workers[0]
        
        await db.service_tasks.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "worker_id": best_worker["user_id"],
                    "status": "assigned",
                    "assigned_at": datetime.now(timezone.utc).isoformat(),
                    "dispatch_method": "auto",
                    "dispatch_score": best_worker["total_dispatch_score"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "task_id": task_id,
            "assigned_worker_id": best_worker["user_id"],
            "assigned_worker_name": f"{best_worker.get('first_name', '')} {best_worker.get('last_name', '')}".strip(),
            "dispatch_score": best_worker["total_dispatch_score"],
            "recommendations": recommendations,
            "dispatch_method": "auto"
        }
    
    async def bulk_auto_dispatch(
        self,
        db,
        employer_id: str,
        workplace_id: Optional[str] = None,
        task_date: Optional[str] = None,
        dry_run: bool = False
    ) -> dict:
        """
        Auto-dispatch multiple pending tasks at once.
        
        Args:
            db: Database connection
            employer_id: Employer ID
            workplace_id: Optional workplace filter
            task_date: Optional date filter (YYYY-MM-DD)
            dry_run: If True, only show recommendations
            
        Returns:
            Dict with bulk dispatch results
        """
        
        # Build query for pending tasks
        query = {
            "employer_id": employer_id,
            "status": {"$in": ["pending", "unassigned"]},
            "worker_id": {"$in": [None, ""]}  # Not yet assigned
        }
        
        if workplace_id:
            query["workplace_id"] = workplace_id
        
        if task_date:
            query["scheduled_date"] = task_date
        
        # Get pending tasks
        pending_tasks = await db.service_tasks.find(
            query,
            {"_id": 0, "task_id": 1, "title": 1, "scheduled_date": 1, "scheduled_time": 1}
        ).to_list(100)  # Limit to 100 tasks per batch
        
        if not pending_tasks:
            return {
                "success": True,
                "message": "No pending tasks found",
                "dispatched": 0,
                "failed": 0,
                "results": []
            }
        
        results = []
        dispatched = 0
        failed = 0
        
        for task in pending_tasks:
            result = await self.auto_dispatch_task(db, task["task_id"], dry_run=dry_run)
            result["task_title"] = task.get("title", "")
            results.append(result)
            
            if result.get("success"):
                dispatched += 1
            else:
                failed += 1
        
        return {
            "success": True,
            "dry_run": dry_run,
            "total_tasks": len(pending_tasks),
            "dispatched": dispatched,
            "failed": failed,
            "results": results
        }


# Singleton instance
auto_dispatch_service = AutoDispatchService()
