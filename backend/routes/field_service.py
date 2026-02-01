"""
Field Service Routes API
Route-based scheduling for delivery, security, cleaning, and other field operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from auth.dependencies import get_current_user, require_role
from database import get_database
from models.field_service import (
    FieldServiceRoute, RouteStop, RouteTask, RouteTemplate,
    RouteType, RouteStatus, StopStatus, TaskType,
    GeoLocation, GPSBreadcrumb, StopVerification,
    CreateRouteRequest, AddStopRequest, UpdateStopStatusRequest,
    CompleteTaskRequest, GPSUpdateRequest
)
import uuid
import math

router = APIRouter(prefix="/api/field-service", tags=["Field Service"])


# ============== HELPER FUNCTIONS ==============

def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS coordinates using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def calculate_route_completion(route: dict) -> float:
    """Calculate completion percentage for a route"""
    beginning_tasks = route.get("beginning_tasks", [])
    stops = route.get("stops", [])
    ending_tasks = route.get("ending_tasks", [])
    
    total_items = len(beginning_tasks) + len(stops) + len(ending_tasks)
    if total_items == 0:
        return 0.0
    
    completed = 0
    completed += len([t for t in beginning_tasks if t.get("completed")])
    completed += len([s for s in stops if s.get("status") == "completed"])
    completed += len([t for t in ending_tasks if t.get("completed")])
    
    return round((completed / total_items) * 100, 1)


def serialize_route(route: dict) -> dict:
    """Prepare route for JSON response"""
    route.pop("_id", None)
    route["completion_percentage"] = calculate_route_completion(route)
    return route


# ============== ROUTE CRUD ==============

@router.post("/routes")
async def create_route(
    request: CreateRouteRequest,
    current_user: dict = Depends(require_role("employer"))
):
    """Create a new field service route with labor compliance validation"""
    db = await get_database()
    
    # Import compliance service
    from services.labor_compliance import (
        validate_route_duration, 
        check_route_assignment_compliance,
        calculate_required_breaks
    )
    
    # Calculate estimated duration from stops
    estimated_duration_minutes = sum(
        stop.get("estimated_duration_minutes", 15) 
        for stop in request.stops
    )
    
    # Add travel time estimate (average 5 min between stops)
    estimated_duration_minutes += (len(request.stops) - 1) * 5
    
    # Validate route duration against labor standards
    compliance_result = validate_route_duration(
        estimated_duration_minutes,
        province="ON"  # Default to Ontario, could be parameterized
    )
    
    # Block if route exceeds absolute maximum
    if not compliance_result.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Route duration exceeds labor standards",
                "errors": compliance_result.errors,
                "estimated_duration_hours": compliance_result.estimated_duration_hours
            }
        )
    
    # If worker is assigned, check their weekly hours
    if request.worker_id:
        worker_compliance = await check_route_assignment_compliance(
            db,
            request.worker_id,
            estimated_duration_minutes,
            request.scheduled_date,
            "ON"
        )
        
        if not worker_compliance.is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Assigning this route would violate labor standards",
                    "errors": worker_compliance.errors,
                    "worker_hours_context": worker_compliance.to_dict()
                }
            )
    
    # Parse scheduled times
    scheduled_start = datetime.fromisoformat(request.scheduled_start_time.replace('Z', '+00:00'))
    scheduled_end = None
    if request.scheduled_end_time:
        scheduled_end = datetime.fromisoformat(request.scheduled_end_time.replace('Z', '+00:00'))
    
    # Get worker name if assigned
    worker_name = None
    if request.worker_id:
        worker = await db.users.find_one({"user_id": request.worker_id})
        if worker:
            worker_name = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
    
    # Build stops with proper structure
    stops = []
    for idx, stop_data in enumerate(request.stops):
        stop = {
            "stop_id": str(uuid.uuid4()),
            "sequence_order": stop_data.get("sequence_order", idx),
            "location": stop_data.get("location", {}),
            "geofence_radius_meters": stop_data.get("geofence_radius_meters", 100),
            "stop_name": stop_data.get("stop_name"),
            "stop_type": stop_data.get("stop_type"),
            "customer_name": stop_data.get("customer_name"),
            "customer_phone": stop_data.get("customer_phone"),
            "customer_notes": stop_data.get("customer_notes"),
            "estimated_duration_minutes": stop_data.get("estimated_duration_minutes", 15),
            "tasks": [
                {
                    "task_id": str(uuid.uuid4()),
                    "title": t.get("title"),
                    "description": t.get("description"),
                    "task_type": t.get("task_type", "checklist"),
                    "required": t.get("required", True),
                    "sequence_order": i,
                    "completed": False,
                    "proof": None,
                    "notes": None
                }
                for i, t in enumerate(stop_data.get("tasks", []))
            ],
            "verification": {
                "gps_confirmed": False,
                "photo_proof": [],
                "signature": None
            },
            "status": "pending",
            "metadata": stop_data.get("metadata", {})
        }
        stops.append(stop)
    
    # Build beginning and ending tasks
    beginning_tasks = [
        {
            "task_id": str(uuid.uuid4()),
            "title": t.get("title"),
            "description": t.get("description"),
            "task_type": t.get("task_type", "checklist"),
            "required": t.get("required", True),
            "sequence_order": i,
            "completed": False
        }
        for i, t in enumerate(request.beginning_tasks)
    ]
    
    ending_tasks = [
        {
            "task_id": str(uuid.uuid4()),
            "title": t.get("title"),
            "description": t.get("description"),
            "task_type": t.get("task_type", "checklist"),
            "required": t.get("required", True),
            "sequence_order": i,
            "completed": False
        }
        for i, t in enumerate(request.ending_tasks)
    ]
    
    # Calculate estimated distance if stops have coordinates
    estimated_distance = 0.0
    for i in range(len(stops) - 1):
        loc1 = stops[i].get("location", {})
        loc2 = stops[i + 1].get("location", {})
        if loc1.get("lat") and loc1.get("lng") and loc2.get("lat") and loc2.get("lng"):
            estimated_distance += calculate_distance_km(
                loc1["lat"], loc1["lng"], loc2["lat"], loc2["lng"]
            )
    
    # Create route document
    route = {
        "route_id": str(uuid.uuid4()),
        "employer_id": current_user["user_id"],
        "workplace_id": request.workplace_id,
        "worker_id": request.worker_id,
        "worker_name": worker_name,
        "route_name": request.route_name,
        "route_type": request.route_type.value if hasattr(request.route_type, 'value') else request.route_type,
        "route_description": request.route_description,
        "scheduled_date": request.scheduled_date,
        "scheduled_start_time": scheduled_start.isoformat(),
        "scheduled_end_time": scheduled_end.isoformat() if scheduled_end else None,
        "actual_start_time": None,
        "actual_end_time": None,
        "estimated_distance_km": round(estimated_distance, 2),
        "estimated_duration_minutes": estimated_duration_minutes,
        "actual_distance_km": 0.0,
        "beginning_tasks": beginning_tasks,
        "stops": stops,
        "ending_tasks": ending_tasks,
        "gps_breadcrumbs": [],
        "last_known_location": None,
        "tracking_enabled": request.tracking_enabled,
        "current_stop_index": 0,
        "status": "scheduled",
        "completion_percentage": 0.0,
        "route_notes": None,
        "issues_reported": [],
        # Compliance info
        "compliance": {
            "validated": True,
            "warnings": compliance_result.warnings,
            "suggested_breaks": compliance_result.suggested_breaks,
            "overtime_hours": compliance_result.overtime_hours,
            "requires_worker_agreement": compliance_result.requires_agreement
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.field_service_routes.insert_one(route)
    
    return {
        "success": True,
        "data": {
            "route": serialize_route(route),
            "compliance": compliance_result.to_dict()
        },
        "message": "Route created successfully"
    }


@router.get("/routes")
async def get_routes(
    workplace_id: Optional[str] = None,
    worker_id: Optional[str] = None,
    route_type: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_role("employer", "workforce"))
):
    """Get routes with filters"""
    db = await get_database()
    
    query = {}
    
    # Role-based filtering
    if current_user.get("user_type") == "employer":
        query["employer_id"] = current_user["user_id"]
    elif current_user.get("user_type") == "workforce":
        query["worker_id"] = current_user["user_id"]
    
    if workplace_id:
        query["workplace_id"] = workplace_id
    
    if worker_id:
        query["worker_id"] = worker_id
    
    if route_type:
        query["route_type"] = route_type
    
    if status:
        query["status"] = status
    
    if date:
        query["scheduled_date"] = date
    elif start_date and end_date:
        query["scheduled_date"] = {"$gte": start_date, "$lte": end_date}
    
    routes = await db.field_service_routes.find(query).sort("scheduled_start_time", 1).to_list(500)
    
    return {
        "success": True,
        "data": {"routes": [serialize_route(r) for r in routes]},
        "count": len(routes)
    }


@router.get("/routes/{route_id}")
async def get_route(
    route_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single route by ID"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({"route_id": route_id})
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Check access
    if current_user.get("role") == "employer" and route["employer_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.get("role") == "workforce" and route.get("worker_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "success": True,
        "data": {"route": serialize_route(route)}
    }


@router.put("/routes/{route_id}")
async def update_route(
    route_id: str,
    update_data: dict,
    current_user: dict = Depends(require_role("employer"))
):
    """Update route details"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Only allow updates if route hasn't started
    if route["status"] not in ["scheduled"]:
        raise HTTPException(status_code=400, detail="Cannot update route that has already started")
    
    allowed_fields = [
        "route_name", "route_description", "worker_id", "scheduled_date",
        "scheduled_start_time", "scheduled_end_time", "tracking_enabled"
    ]
    
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update worker name if worker_id changed
    if "worker_id" in update and update["worker_id"]:
        worker = await db.users.find_one({"user_id": update["worker_id"]})
        if worker:
            update["worker_name"] = f"{worker.get('first_name', '')} {worker.get('last_name', '')}".strip()
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {"$set": update}
    )
    
    updated_route = await db.field_service_routes.find_one({"route_id": route_id})
    
    return {
        "success": True,
        "data": {"route": serialize_route(updated_route)},
        "message": "Route updated successfully"
    }


@router.delete("/routes/{route_id}")
async def delete_route(
    route_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Delete a route"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] == "in_progress":
        raise HTTPException(status_code=400, detail="Cannot delete route that is in progress")
    
    await db.field_service_routes.delete_one({"route_id": route_id})
    
    return {
        "success": True,
        "message": "Route deleted successfully"
    }


# ============== ROUTE LIFECYCLE ==============

@router.post("/routes/{route_id}/start")
async def start_route(
    route_id: str,
    gps_data: Optional[GPSUpdateRequest] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Worker starts a route"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found or not assigned to you")
    
    if route["status"] != "scheduled":
        raise HTTPException(status_code=400, detail=f"Route cannot be started (current status: {route['status']})")
    
    now = datetime.now(timezone.utc)
    
    update = {
        "status": "in_progress",
        "actual_start_time": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    # Add initial GPS location if provided
    if gps_data:
        breadcrumb = {
            "lat": gps_data.lat,
            "lng": gps_data.lng,
            "timestamp": now.isoformat(),
            "accuracy_meters": gps_data.accuracy_meters,
            "speed_kmh": gps_data.speed_kmh
        }
        update["last_known_location"] = {"lat": gps_data.lat, "lng": gps_data.lng}
        await db.field_service_routes.update_one(
            {"route_id": route_id},
            {"$push": {"gps_breadcrumbs": breadcrumb}}
        )
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {"$set": update}
    )
    
    updated_route = await db.field_service_routes.find_one({"route_id": route_id})
    
    return {
        "success": True,
        "data": {"route": serialize_route(updated_route)},
        "message": "Route started"
    }


@router.post("/routes/{route_id}/complete")
async def complete_route(
    route_id: str,
    current_user: dict = Depends(require_role("workforce"))
):
    """Worker completes a route - auto-creates shift record"""
    db = await get_database()
    
    # Import compliance service
    from services.labor_compliance import create_shift_from_route
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Route is not in progress")
    
    # Check if all required tasks are complete
    incomplete_required = []
    
    for task in route.get("beginning_tasks", []):
        if task.get("required") and not task.get("completed"):
            incomplete_required.append(f"Beginning: {task['title']}")
    
    for stop in route.get("stops", []):
        if stop.get("status") not in ["completed", "skipped"]:
            incomplete_required.append(f"Stop: {stop.get('stop_name', stop['stop_id'])}")
    
    for task in route.get("ending_tasks", []):
        if task.get("required") and not task.get("completed"):
            incomplete_required.append(f"Ending: {task['title']}")
    
    if incomplete_required:
        return {
            "success": False,
            "error": "Cannot complete route - incomplete required items",
            "incomplete_items": incomplete_required
        }
    
    now = datetime.now(timezone.utc)
    
    # Calculate actual duration
    actual_start = datetime.fromisoformat(route["actual_start_time"].replace('Z', '+00:00'))
    duration_minutes = (now - actual_start).total_seconds() / 60
    
    # Calculate actual distance from GPS breadcrumbs
    actual_distance = 0.0
    breadcrumbs = route.get("gps_breadcrumbs", [])
    for i in range(len(breadcrumbs) - 1):
        actual_distance += calculate_distance_km(
            breadcrumbs[i]["lat"], breadcrumbs[i]["lng"],
            breadcrumbs[i+1]["lat"], breadcrumbs[i+1]["lng"]
        )
    
    # Update route to completed
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {"$set": {
            "status": "completed",
            "actual_end_time": now.isoformat(),
            "actual_duration_minutes": round(duration_minutes),
            "actual_distance_km": round(actual_distance, 2),
            "completion_percentage": 100.0,
            "updated_at": now.isoformat()
        }}
    )
    
    # Get updated route
    updated_route = await db.field_service_routes.find_one({"route_id": route_id})
    
    # AUTO-CREATE SHIFT RECORD from completed route
    shift_record, compliance_result = create_shift_from_route(updated_route, province="ON")
    
    # Store the shift record
    await db.route_shifts.insert_one(shift_record)
    
    # Link shift to route
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {"$set": {"linked_shift_id": shift_record["shift_id"]}}
    )
    
    return {
        "success": True,
        "data": {
            "route": serialize_route(updated_route),
            "shift": {
                "shift_id": shift_record["shift_id"],
                "total_hours": shift_record["total_duration_hours"],
                "billable_hours": shift_record["billable_hours"],
                "overtime_hours": shift_record["overtime_hours"],
                "breaks": shift_record["breaks_taken"]
            }
        },
        "message": "Route completed - shift record created",
        "compliance_warnings": compliance_result.warnings if compliance_result.warnings else None
    }


@router.post("/routes/{route_id}/pause")
async def pause_route(
    route_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Pause an in-progress route"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Only in-progress routes can be paused")
    
    now = datetime.now(timezone.utc)
    
    issue = {
        "type": "paused",
        "description": reason or "Route paused",
        "timestamp": now.isoformat()
    }
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$set": {
                "status": "paused",
                "updated_at": now.isoformat()
            },
            "$push": {"issues_reported": issue}
        }
    )
    
    return {"success": True, "message": "Route paused"}


@router.post("/routes/{route_id}/resume")
async def resume_route(
    route_id: str,
    current_user: dict = Depends(require_role("workforce"))
):
    """Resume a paused route"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] != "paused":
        raise HTTPException(status_code=400, detail="Route is not paused")
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {"$set": {
            "status": "in_progress",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Route resumed"}


# ============== STOP MANAGEMENT ==============

@router.post("/routes/{route_id}/stops")
async def add_stop(
    route_id: str,
    request: AddStopRequest,
    current_user: dict = Depends(require_role("employer"))
):
    """Add a stop to a route"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Determine sequence order
    existing_stops = route.get("stops", [])
    sequence_order = request.sequence_order if request.sequence_order is not None else len(existing_stops)
    
    # Build stop
    stop = {
        "stop_id": str(uuid.uuid4()),
        "sequence_order": sequence_order,
        "location": request.location,
        "geofence_radius_meters": 100,
        "stop_name": request.stop_name,
        "stop_type": request.stop_type,
        "customer_name": request.customer_name,
        "customer_phone": request.customer_phone,
        "customer_notes": request.customer_notes,
        "estimated_duration_minutes": request.estimated_duration_minutes,
        "tasks": [
            {
                "task_id": str(uuid.uuid4()),
                "title": t.get("title"),
                "description": t.get("description"),
                "task_type": t.get("task_type", "checklist"),
                "required": t.get("required", True),
                "sequence_order": i,
                "completed": False
            }
            for i, t in enumerate(request.tasks)
        ],
        "verification": {
            "gps_confirmed": False,
            "photo_proof": [],
            "signature": None
        },
        "status": "pending",
        "metadata": request.metadata
    }
    
    # If inserting at specific position, update other stops' sequence
    if request.sequence_order is not None:
        await db.field_service_routes.update_one(
            {"route_id": route_id},
            {"$inc": {"stops.$[elem].sequence_order": 1}},
            array_filters=[{"elem.sequence_order": {"$gte": sequence_order}}]
        )
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$push": {"stops": stop},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "success": True,
        "data": {"stop": stop},
        "message": "Stop added successfully"
    }


@router.put("/routes/{route_id}/stops/{stop_id}")
async def update_stop(
    route_id: str,
    stop_id: str,
    update_data: dict,
    current_user: dict = Depends(require_role("employer"))
):
    """Update a stop"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Find and update the stop
    stops = route.get("stops", [])
    stop_index = None
    for i, stop in enumerate(stops):
        if stop["stop_id"] == stop_id:
            stop_index = i
            break
    
    if stop_index is None:
        raise HTTPException(status_code=404, detail="Stop not found")
    
    allowed_fields = [
        "location", "stop_name", "stop_type", "customer_name", "customer_phone",
        "customer_notes", "estimated_duration_minutes", "sequence_order", "metadata"
    ]
    
    for field in allowed_fields:
        if field in update_data:
            stops[stop_index][field] = update_data[field]
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {"$set": {
            "stops": stops,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": {"stop": stops[stop_index]},
        "message": "Stop updated"
    }


@router.delete("/routes/{route_id}/stops/{stop_id}")
async def delete_stop(
    route_id: str,
    stop_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Remove a stop from route"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$pull": {"stops": {"stop_id": stop_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "message": "Stop removed"}


@router.post("/routes/{route_id}/stops/{stop_id}/arrive")
async def arrive_at_stop(
    route_id: str,
    stop_id: str,
    gps_data: GPSUpdateRequest,
    current_user: dict = Depends(require_role("workforce"))
):
    """Mark arrival at a stop with GPS verification"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Route is not in progress")
    
    # Find the stop
    stops = route.get("stops", [])
    stop_index = None
    stop = None
    for i, s in enumerate(stops):
        if s["stop_id"] == stop_id:
            stop_index = i
            stop = s
            break
    
    if stop is None:
        raise HTTPException(status_code=404, detail="Stop not found")
    
    # Calculate distance from stop location
    stop_location = stop.get("location", {})
    if stop_location.get("lat") and stop_location.get("lng"):
        distance = calculate_distance_km(
            gps_data.lat, gps_data.lng,
            stop_location["lat"], stop_location["lng"]
        ) * 1000  # Convert to meters
        
        gps_confirmed = distance <= stop.get("geofence_radius_meters", 100)
    else:
        distance = None
        gps_confirmed = False
    
    now = datetime.now(timezone.utc)
    
    # Update stop
    stops[stop_index]["status"] = "arrived"
    stops[stop_index]["actual_arrival"] = now.isoformat()
    stops[stop_index]["verification"]["gps_confirmed"] = gps_confirmed
    stops[stop_index]["verification"]["gps_location"] = {"lat": gps_data.lat, "lng": gps_data.lng}
    stops[stop_index]["verification"]["arrival_distance_meters"] = distance
    stops[stop_index]["verification"]["verified_at"] = now.isoformat()
    
    # Add GPS breadcrumb
    breadcrumb = {
        "lat": gps_data.lat,
        "lng": gps_data.lng,
        "timestamp": now.isoformat(),
        "accuracy_meters": gps_data.accuracy_meters
    }
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$set": {
                "stops": stops,
                "current_stop_index": stop_index,
                "last_known_location": {"lat": gps_data.lat, "lng": gps_data.lng},
                "updated_at": now.isoformat()
            },
            "$push": {"gps_breadcrumbs": breadcrumb}
        }
    )
    
    return {
        "success": True,
        "data": {
            "stop": stops[stop_index],
            "gps_confirmed": gps_confirmed,
            "distance_meters": distance
        },
        "message": "Arrived at stop" + (" (GPS verified)" if gps_confirmed else " (outside geofence)")
    }


@router.post("/routes/{route_id}/stops/{stop_id}/complete")
async def complete_stop(
    route_id: str,
    stop_id: str,
    verification: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Complete a stop after finishing all tasks"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Find the stop
    stops = route.get("stops", [])
    stop_index = None
    stop = None
    for i, s in enumerate(stops):
        if s["stop_id"] == stop_id:
            stop_index = i
            stop = s
            break
    
    if stop is None:
        raise HTTPException(status_code=404, detail="Stop not found")
    
    # Check required tasks
    incomplete = [t for t in stop.get("tasks", []) if t.get("required") and not t.get("completed")]
    if incomplete:
        return {
            "success": False,
            "error": "Cannot complete stop - incomplete required tasks",
            "incomplete_tasks": [t["title"] for t in incomplete]
        }
    
    now = datetime.now(timezone.utc)
    
    # Update verification if provided
    if verification:
        if verification.get("photo_proof"):
            stops[stop_index]["verification"]["photo_proof"].extend(verification["photo_proof"])
        if verification.get("signature"):
            stops[stop_index]["verification"]["signature"] = verification["signature"]
        if verification.get("customer_name"):
            stops[stop_index]["verification"]["customer_name"] = verification["customer_name"]
        if verification.get("notes"):
            stops[stop_index]["verification"]["notes"] = verification["notes"]
    
    stops[stop_index]["status"] = "completed"
    stops[stop_index]["actual_departure"] = now.isoformat()
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$set": {
                "stops": stops,
                "completion_percentage": calculate_route_completion({"stops": stops, "beginning_tasks": route.get("beginning_tasks", []), "ending_tasks": route.get("ending_tasks", [])}),
                "updated_at": now.isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "data": {"stop": stops[stop_index]},
        "message": "Stop completed"
    }


@router.post("/routes/{route_id}/stops/{stop_id}/skip")
async def skip_stop(
    route_id: str,
    stop_id: str,
    reason: str,
    current_user: dict = Depends(require_role("workforce"))
):
    """Skip a stop with reason"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    stops = route.get("stops", [])
    stop_index = None
    for i, s in enumerate(stops):
        if s["stop_id"] == stop_id:
            stop_index = i
            break
    
    if stop_index is None:
        raise HTTPException(status_code=404, detail="Stop not found")
    
    now = datetime.now(timezone.utc)
    
    stops[stop_index]["status"] = "skipped"
    stops[stop_index]["skip_reason"] = reason
    
    issue = {
        "type": "stop_skipped",
        "stop_id": stop_id,
        "reason": reason,
        "timestamp": now.isoformat()
    }
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$set": {"stops": stops, "updated_at": now.isoformat()},
            "$push": {"issues_reported": issue}
        }
    )
    
    return {"success": True, "message": f"Stop skipped: {reason}"}


# ============== TASK MANAGEMENT ==============

@router.post("/routes/{route_id}/tasks/{task_id}/complete")
async def complete_task(
    route_id: str,
    task_id: str,
    task_location: str = Query(..., description="beginning, ending, or stop_id"),
    request: Optional[CompleteTaskRequest] = None,
    current_user: dict = Depends(require_role("workforce"))
):
    """Complete a task in beginning, ending, or at a stop"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    now = datetime.now(timezone.utc)
    task_found = False
    
    if task_location == "beginning":
        tasks = route.get("beginning_tasks", [])
        for task in tasks:
            if task["task_id"] == task_id:
                task["completed"] = True
                task["completed_at"] = now.isoformat()
                task["completed_by"] = current_user["user_id"]
                if request:
                    task["proof"] = request.proof
                    task["form_data"] = request.form_data
                    task["notes"] = request.notes
                task_found = True
                break
        if task_found:
            await db.field_service_routes.update_one(
                {"route_id": route_id},
                {"$set": {"beginning_tasks": tasks, "updated_at": now.isoformat()}}
            )
    
    elif task_location == "ending":
        tasks = route.get("ending_tasks", [])
        for task in tasks:
            if task["task_id"] == task_id:
                task["completed"] = True
                task["completed_at"] = now.isoformat()
                task["completed_by"] = current_user["user_id"]
                if request:
                    task["proof"] = request.proof
                    task["form_data"] = request.form_data
                    task["notes"] = request.notes
                task_found = True
                break
        if task_found:
            await db.field_service_routes.update_one(
                {"route_id": route_id},
                {"$set": {"ending_tasks": tasks, "updated_at": now.isoformat()}}
            )
    
    else:
        # task_location is a stop_id
        stops = route.get("stops", [])
        for stop in stops:
            if stop["stop_id"] == task_location:
                for task in stop.get("tasks", []):
                    if task["task_id"] == task_id:
                        task["completed"] = True
                        task["completed_at"] = now.isoformat()
                        task["completed_by"] = current_user["user_id"]
                        if request:
                            task["proof"] = request.proof
                            task["form_data"] = request.form_data
                            task["notes"] = request.notes
                        task_found = True
                        break
                break
        if task_found:
            await db.field_service_routes.update_one(
                {"route_id": route_id},
                {"$set": {"stops": stops, "updated_at": now.isoformat()}}
            )
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"success": True, "message": "Task completed"}


# ============== GPS TRACKING ==============

@router.post("/routes/{route_id}/gps")
async def update_gps_location(
    route_id: str,
    request: GPSUpdateRequest,
    current_user: dict = Depends(require_role("workforce"))
):
    """Update GPS location (called periodically during route)"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "worker_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route["status"] != "in_progress":
        return {"success": False, "message": "Route is not in progress"}
    
    now = datetime.now(timezone.utc)
    
    breadcrumb = {
        "lat": request.lat,
        "lng": request.lng,
        "timestamp": now.isoformat(),
        "accuracy_meters": request.accuracy_meters,
        "speed_kmh": request.speed_kmh
    }
    
    await db.field_service_routes.update_one(
        {"route_id": route_id},
        {
            "$push": {"gps_breadcrumbs": breadcrumb},
            "$set": {
                "last_known_location": {"lat": request.lat, "lng": request.lng},
                "updated_at": now.isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Location updated"}


@router.get("/routes/{route_id}/tracking")
async def get_route_tracking(
    route_id: str,
    current_user: dict = Depends(require_role("employer"))
):
    """Get live tracking data for a route (employer view)"""
    db = await get_database()
    
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    return {
        "success": True,
        "data": {
            "route_id": route_id,
            "status": route["status"],
            "worker_name": route.get("worker_name"),
            "current_stop_index": route.get("current_stop_index", 0),
            "total_stops": len(route.get("stops", [])),
            "completion_percentage": calculate_route_completion(route),
            "last_known_location": route.get("last_known_location"),
            "gps_breadcrumbs": route.get("gps_breadcrumbs", [])[-50:],  # Last 50 points
            "stops": [
                {
                    "stop_id": s["stop_id"],
                    "stop_name": s.get("stop_name"),
                    "location": s.get("location"),
                    "status": s["status"],
                    "sequence_order": s["sequence_order"]
                }
                for s in route.get("stops", [])
            ]
        }
    }


# ============== ROUTE TEMPLATES ==============

@router.post("/templates")
async def create_route_template(
    template_data: dict,
    current_user: dict = Depends(require_role("employer"))
):
    """Create a reusable route template"""
    db = await get_database()
    
    template = {
        "template_id": str(uuid.uuid4()),
        "employer_id": current_user["user_id"],
        "template_name": template_data.get("template_name"),
        "route_type": template_data.get("route_type", "custom"),
        "description": template_data.get("description"),
        "default_beginning_tasks": template_data.get("default_beginning_tasks", []),
        "default_ending_tasks": template_data.get("default_ending_tasks", []),
        "default_stop_tasks": template_data.get("default_stop_tasks", []),
        "default_stop_duration_minutes": template_data.get("default_stop_duration_minutes", 15),
        "geofence_radius_meters": template_data.get("geofence_radius_meters", 100),
        "tracking_enabled": template_data.get("tracking_enabled", True),
        "require_photo_proof": template_data.get("require_photo_proof", False),
        "require_signature": template_data.get("require_signature", False),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.route_templates.insert_one(template)
    template.pop("_id", None)
    
    return {
        "success": True,
        "data": {"template": template},
        "message": "Template created"
    }


@router.get("/templates")
async def get_route_templates(
    current_user: dict = Depends(require_role("employer"))
):
    """Get all route templates for employer"""
    db = await get_database()
    
    templates = await db.route_templates.find({
        "employer_id": current_user["user_id"],
        "is_active": True
    }).to_list(100)
    
    for t in templates:
        t.pop("_id", None)
    
    return {
        "success": True,
        "data": {"templates": templates}
    }


@router.post("/routes/from-template/{template_id}")
async def create_route_from_template(
    template_id: str,
    route_data: dict,
    current_user: dict = Depends(require_role("employer"))
):
    """Create a route from a template"""
    db = await get_database()
    
    template = await db.route_templates.find_one({
        "template_id": template_id,
        "employer_id": current_user["user_id"]
    })
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Build request from template + override data
    request = CreateRouteRequest(
        route_name=route_data.get("route_name", template["template_name"]),
        route_type=template["route_type"],
        route_description=route_data.get("route_description", template.get("description")),
        workplace_id=route_data.get("workplace_id"),
        worker_id=route_data.get("worker_id"),
        scheduled_date=route_data["scheduled_date"],
        scheduled_start_time=route_data["scheduled_start_time"],
        scheduled_end_time=route_data.get("scheduled_end_time"),
        beginning_tasks=template.get("default_beginning_tasks", []),
        stops=route_data.get("stops", []),
        ending_tasks=template.get("default_ending_tasks", []),
        tracking_enabled=template.get("tracking_enabled", True)
    )
    
    # Apply default stop tasks to each stop
    for stop in request.stops:
        if not stop.get("tasks"):
            stop["tasks"] = template.get("default_stop_tasks", [])
    
    return await create_route(request, current_user)


# ============== LIVE DASHBOARD ==============

@router.get("/dashboard/live")
async def get_live_routes_dashboard(
    workplace_id: Optional[str] = None,
    current_user: dict = Depends(require_role("employer"))
):
    """Get dashboard view of all active routes"""
    db = await get_database()
    
    query = {
        "employer_id": current_user["user_id"],
        "status": {"$in": ["in_progress", "paused"]}
    }
    
    if workplace_id:
        query["workplace_id"] = workplace_id
    
    routes = await db.field_service_routes.find(query).to_list(100)
    
    dashboard_data = []
    for route in routes:
        stops = route.get("stops", [])
        completed_stops = len([s for s in stops if s["status"] == "completed"])
        
        # Calculate time status
        time_status = "on_schedule"
        if route.get("scheduled_start_time"):
            scheduled = datetime.fromisoformat(route["scheduled_start_time"].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            
            # Simple heuristic: if current time > scheduled + estimated duration, behind
            estimated_duration = route.get("estimated_duration_minutes", 0)
            if estimated_duration:
                progress_expected = min(100, ((now - scheduled).total_seconds() / 60 / estimated_duration) * 100)
                actual_progress = calculate_route_completion(route)
                
                if actual_progress < progress_expected - 15:
                    time_status = "behind_schedule"
                elif actual_progress > progress_expected + 15:
                    time_status = "ahead_of_schedule"
        
        dashboard_data.append({
            "route_id": route["route_id"],
            "route_name": route["route_name"],
            "route_type": route["route_type"],
            "worker_id": route.get("worker_id"),
            "worker_name": route.get("worker_name"),
            "status": route["status"],
            "current_stop": completed_stops + 1,
            "total_stops": len(stops),
            "completion_percentage": calculate_route_completion(route),
            "time_status": time_status,
            "last_known_location": route.get("last_known_location"),
            "issues_count": len(route.get("issues_reported", []))
        })
    
    return {
        "success": True,
        "data": {
            "active_routes": dashboard_data,
            "summary": {
                "total_active": len(dashboard_data),
                "in_progress": len([r for r in dashboard_data if r["status"] == "in_progress"]),
                "paused": len([r for r in dashboard_data if r["status"] == "paused"]),
                "behind_schedule": len([r for r in dashboard_data if r["time_status"] == "behind_schedule"])
            }
        }
    }



# ============================================
# ROUTE OPTIMIZATION
# ============================================

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points using Haversine formula (in km)"""
    import math
    R = 6371  # Earth's radius in km
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


def optimize_route_nearest_neighbor(stops: list, start_lat: float = None, start_lng: float = None) -> tuple:
    """
    Optimize stop order using nearest neighbor algorithm.
    Returns optimized stops list and total distance.
    """
    if len(stops) <= 1:
        return stops, 0.0
    
    # Filter stops with valid coordinates
    valid_stops = [s for s in stops if s.get('location', {}).get('lat') and s.get('location', {}).get('lng')]
    if len(valid_stops) <= 1:
        return stops, 0.0
    
    # Starting point (use first stop if not provided)
    if start_lat is None or start_lng is None:
        start_lat = valid_stops[0]['location']['lat']
        start_lng = valid_stops[0]['location']['lng']
    
    # Nearest neighbor algorithm
    unvisited = valid_stops.copy()
    optimized = []
    current_lat, current_lng = start_lat, start_lng
    total_distance = 0.0
    
    while unvisited:
        # Find nearest unvisited stop
        nearest = None
        nearest_dist = float('inf')
        
        for stop in unvisited:
            stop_lat = stop['location']['lat']
            stop_lng = stop['location']['lng']
            dist = calculate_distance(current_lat, current_lng, stop_lat, stop_lng)
            
            if dist < nearest_dist:
                nearest_dist = dist
                nearest = stop
        
        if nearest:
            optimized.append(nearest)
            total_distance += nearest_dist
            current_lat = nearest['location']['lat']
            current_lng = nearest['location']['lng']
            unvisited.remove(nearest)
    
    # Update sequence_order
    for i, stop in enumerate(optimized):
        stop['sequence_order'] = i
    
    return optimized, round(total_distance, 2)


def optimize_route_2opt(stops: list) -> tuple:
    """
    Improve route using 2-opt algorithm after nearest neighbor.
    Iteratively removes crossing paths.
    """
    if len(stops) <= 3:
        return stops, sum_route_distance(stops)
    
    def route_distance(route):
        total = 0.0
        for i in range(len(route) - 1):
            loc1 = route[i].get('location', {})
            loc2 = route[i + 1].get('location', {})
            if loc1.get('lat') and loc2.get('lat'):
                total += calculate_distance(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
        return total
    
    def two_opt_swap(route, i, k):
        new_route = route[:i] + route[i:k+1][::-1] + route[k+1:]
        return new_route
    
    best_route = stops.copy()
    best_distance = route_distance(best_route)
    improved = True
    
    iterations = 0
    max_iterations = 100
    
    while improved and iterations < max_iterations:
        improved = False
        iterations += 1
        
        for i in range(1, len(best_route) - 1):
            for k in range(i + 1, len(best_route)):
                new_route = two_opt_swap(best_route, i, k)
                new_distance = route_distance(new_route)
                
                if new_distance < best_distance:
                    best_route = new_route
                    best_distance = new_distance
                    improved = True
                    break
            if improved:
                break
    
    # Update sequence_order
    for i, stop in enumerate(best_route):
        stop['sequence_order'] = i
    
    return best_route, round(best_distance, 2)


def sum_route_distance(stops: list) -> float:
    """Calculate total distance for a route."""
    total = 0.0
    for i in range(len(stops) - 1):
        loc1 = stops[i].get('location', {})
        loc2 = stops[i + 1].get('location', {})
        if loc1.get('lat') and loc2.get('lat'):
            total += calculate_distance(loc1['lat'], loc1['lng'], loc2['lat'], loc2['lng'])
    return round(total, 2)


@router.post("/routes/{route_id}/optimize")
async def optimize_route_stops(
    route_id: str,
    start_lat: float = Query(None, description="Starting latitude"),
    start_lng: float = Query(None, description="Starting longitude"),
    algorithm: str = Query("2opt", description="Algorithm: nearest_neighbor or 2opt"),
    apply: bool = Query(False, description="Apply optimization to the route"),
    current_user: dict = Depends(get_current_user)
):
    """
    Optimize stop order for a route to minimize travel distance.
    
    Algorithms:
    - nearest_neighbor: Fast, good results for most cases
    - 2opt: Better results but slower, refines nearest neighbor result
    """
    db = await get_database()
    
    # Verify route exists and belongs to employer
    route = await db.field_service_routes.find_one({
        "route_id": route_id,
        "employer_id": current_user["user_id"]
    })
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route.get("status") not in ["scheduled", "pending"]:
        raise HTTPException(
            status_code=400, 
            detail="Can only optimize routes that haven't started yet"
        )
    
    stops = route.get("stops", [])
    if len(stops) <= 1:
        return {
            "success": True,
            "data": {
                "message": "Route has only one stop, no optimization needed",
                "original_distance": 0,
                "optimized_distance": 0,
                "savings_km": 0,
                "savings_percent": 0
            }
        }
    
    # Calculate original distance
    original_distance = sum_route_distance(stops)
    
    # Run optimization
    if algorithm == "2opt":
        # First run nearest neighbor, then improve with 2-opt
        nn_stops, _ = optimize_route_nearest_neighbor(stops, start_lat, start_lng)
        optimized_stops, optimized_distance = optimize_route_2opt(nn_stops)
    else:
        optimized_stops, optimized_distance = optimize_route_nearest_neighbor(stops, start_lat, start_lng)
    
    savings_km = original_distance - optimized_distance
    savings_percent = (savings_km / original_distance * 100) if original_distance > 0 else 0
    
    result = {
        "success": True,
        "data": {
            "algorithm": algorithm,
            "original_distance_km": original_distance,
            "optimized_distance_km": optimized_distance,
            "savings_km": round(savings_km, 2),
            "savings_percent": round(savings_percent, 1),
            "original_order": [s.get("stop_name", f"Stop {i+1}") for i, s in enumerate(stops)],
            "optimized_order": [s.get("stop_name", f"Stop {i+1}") for i, s in enumerate(optimized_stops)],
            "applied": False
        }
    }
    
    # Apply optimization if requested
    if apply:
        now = datetime.now(timezone.utc).isoformat()
        await db.field_service_routes.update_one(
            {"route_id": route_id},
            {
                "$set": {
                    "stops": optimized_stops,
                    "estimated_distance_km": optimized_distance,
                    "updated_at": now,
                    "optimization_applied": True,
                    "optimization_algorithm": algorithm,
                    "optimization_savings_km": round(savings_km, 2)
                }
            }
        )
        result["data"]["applied"] = True
        result["data"]["message"] = f"Route optimized! Saved {round(savings_km, 2)} km ({round(savings_percent, 1)}%)"
    
    return result


@router.get("/routes/{route_id}/optimize/preview")
async def preview_route_optimization(
    route_id: str,
    start_lat: float = Query(None),
    start_lng: float = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Preview route optimization without applying changes."""
    return await optimize_route_stops(
        route_id=route_id,
        start_lat=start_lat,
        start_lng=start_lng,
        algorithm="2opt",
        apply=False,
        current_user=current_user
    )



# ============================================
# LABOR COMPLIANCE ENDPOINTS
# ============================================

@router.get("/compliance/worker/{worker_id}/hours")
async def get_worker_weekly_hours(
    worker_id: str,
    week_start: Optional[str] = Query(None, description="Week start date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role("employer"))
):
    """
    Get worker's hours for the current or specified week.
    Includes regular hours, overtime, and remaining capacity.
    """
    db = await get_database()
    from services.labor_compliance import get_worker_hours_this_week, get_labor_standards
    
    # Parse week start if provided
    week_start_dt = None
    if week_start:
        week_start_dt = datetime.strptime(week_start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    weekly_hours = await get_worker_hours_this_week(db, worker_id, week_start_dt)
    standards = get_labor_standards("ON")
    
    return {
        "success": True,
        "data": {
            "worker_id": worker_id,
            "hours": weekly_hours,
            "standards": {
                "province": "ON",
                "max_hours_week": standards["max_hours_week"],
                "overtime_threshold": standards["overtime_threshold_week"],
                "overtime_multiplier": standards["overtime_multiplier"]
            }
        }
    }


@router.post("/compliance/validate-route")
async def validate_route_compliance(
    estimated_duration_minutes: int = Query(..., description="Estimated route duration in minutes"),
    worker_id: Optional[str] = Query(None, description="Worker ID to check weekly hours"),
    scheduled_date: Optional[str] = Query(None, description="Scheduled date (YYYY-MM-DD)"),
    province: str = Query("ON", description="Province code"),
    current_user: dict = Depends(require_role("employer"))
):
    """
    Validate if a route duration is compliant with labor standards.
    Optionally check against worker's weekly hours.
    """
    db = await get_database()
    from services.labor_compliance import validate_route_duration, check_route_assignment_compliance
    
    if worker_id and scheduled_date:
        result = await check_route_assignment_compliance(
            db, worker_id, estimated_duration_minutes, scheduled_date, province
        )
    else:
        result = validate_route_duration(estimated_duration_minutes, province)
    
    return {
        "success": True,
        "data": result.to_dict()
    }


@router.get("/compliance/standards")
async def get_labor_standards_info(
    province: str = Query("ON", description="Province code"),
    current_user: dict = Depends(get_current_user)
):
    """Get labor standards for a province"""
    from services.labor_compliance import get_labor_standards, LABOR_STANDARDS
    
    if province.upper() == "ALL":
        return {
            "success": True,
            "data": {
                "standards": {k: v for k, v in LABOR_STANDARDS.items() if k != "DEFAULT"}
            }
        }
    
    standards = get_labor_standards(province)
    return {
        "success": True,
        "data": {
            "province": province.upper(),
            "standards": standards
        }
    }


@router.get("/shifts/route-based")
async def get_route_shifts(
    worker_id: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="pending, approved, paid"),
    current_user: dict = Depends(require_role("employer"))
):
    """Get route-based shift records for payroll processing"""
    db = await get_database()
    
    query = {"employer_id": current_user["user_id"]}
    
    if worker_id:
        query["worker_id"] = worker_id
    
    if start_date:
        query["shift_date"] = {"$gte": start_date}
    if end_date:
        if "shift_date" in query:
            query["shift_date"]["$lte"] = end_date
        else:
            query["shift_date"] = {"$lte": end_date}
    
    if status:
        query["payroll_status"] = status
    
    shifts = await db.route_shifts.find(query, {"_id": 0}).sort("shift_date", -1).to_list(100)
    
    # Calculate totals
    total_hours = sum(s.get("billable_hours", 0) for s in shifts)
    total_overtime = sum(s.get("overtime_hours", 0) for s in shifts)
    
    return {
        "success": True,
        "data": {
            "shifts": shifts,
            "summary": {
                "count": len(shifts),
                "total_billable_hours": round(total_hours, 2),
                "total_overtime_hours": round(total_overtime, 2)
            }
        }
    }
