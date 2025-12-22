"""
Comprehensive December Data Seeding Script
==========================================
Populates Swan Pizza with realistic data for December 2024:
- Shifts (On-Site, Route-Based, Continental) for the whole month
- Attendance records
- Timesheets (pending approval, approved, rejected)
- Payroll data (pending processing)
- Notifications (unread and read)
- Messages between employer and workers
"""

from datetime import datetime, timezone, timedelta
from uuid import uuid4
import random
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"

async def seed_december_data():
    """Seed comprehensive December data for Swan Pizza"""
    
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['hrbank_db']
    
    results = {"created": [], "errors": []}
    
    # Get employer info
    employer = await db.users.find_one({"email": "demo@swanpizza.ca"})
    if not employer:
        return {"error": "Employer demo@swanpizza.ca not found. Run seed-demo first."}
    
    employer_id = employer["user_id"]
    
    # Get employer profile
    employer_profile = await db.employer_profiles.find_one({"employer_id": employer_id})
    
    # Get workplaces
    workplaces = await db.workplaces.find({"employer_id": employer_id}).to_list(10)
    if not workplaces:
        return {"error": "No workplaces found for employer"}
    
    # Get workers
    workers = []
    assignments = await db.team_assignments.find({"employer_id": employer_id, "status": "active"}).to_list(20)
    for assignment in assignments:
        profile = await db.workforce_profiles.find_one({"workforce_id": assignment["workforce_id"]})
        if profile:
            workers.append({
                "workforce_id": assignment["workforce_id"],
                "full_name": profile.get("full_name", "Worker"),
                "email": profile.get("email", ""),
                "position_title": assignment.get("position_title", "Staff"),
                "hourly_rate": assignment.get("hourly_rate", 17.50)
            })
    
    if not workers:
        return {"error": "No workers found"}
    
    print(f"Found {len(workers)} workers and {len(workplaces)} workplaces")
    
    # ==========================================
    # 1. GENERATE SHIFTS FOR DECEMBER
    # ==========================================
    shift_types = ["on_site", "route_based", "continental"]
    shifts_created = 0
    
    # Clear existing December shifts
    await db.calendar_shifts.delete_many({
        "employer_id": employer_id,
        "shift_date": {"$regex": "^2024-12"}
    })
    
    # Generate shifts for December 1-22
    for day in range(1, 23):
        shift_date = datetime(2024, 12, day, tzinfo=timezone.utc)
        date_str = shift_date.strftime("%Y-%m-%d")
        
        # Morning shift (On-Site)
        morning_shift = {
            "shift_id": generate_id("shft"),
            "employer_id": employer_id,
            "workplace_id": workplaces[0]["workplace_id"],
            "workplace_name": workplaces[0]["workplace_name"],
            "shift_date": f"{date_str}T00:00:00",
            "start_time": "09:00",
            "end_time": "15:00",
            "shift_type": "on_site",
            "work_type": "on_site",
            "positions_needed": 3,
            "positions_filled": min(3, len(workers)),
            "status": "completed" if day < 22 else "scheduled",
            "assigned_workers": [w["workforce_id"] for w in workers[:3]],
            "created_at": shift_date.isoformat()
        }
        await db.calendar_shifts.insert_one(morning_shift)
        shifts_created += 1
        
        # Evening shift (On-Site)
        evening_shift = {
            "shift_id": generate_id("shft"),
            "employer_id": employer_id,
            "workplace_id": workplaces[0]["workplace_id"],
            "workplace_name": workplaces[0]["workplace_name"],
            "shift_date": f"{date_str}T00:00:00",
            "start_time": "16:00",
            "end_time": "23:00",
            "shift_type": "on_site",
            "work_type": "on_site",
            "positions_needed": 4,
            "positions_filled": min(4, len(workers)),
            "status": "completed" if day < 22 else "scheduled",
            "assigned_workers": [w["workforce_id"] for w in workers[:4]],
            "created_at": shift_date.isoformat()
        }
        await db.calendar_shifts.insert_one(evening_shift)
        shifts_created += 1
        
        # Route-based delivery shift (every other day)
        if day % 2 == 0:
            route_shift = {
                "shift_id": generate_id("shft"),
                "employer_id": employer_id,
                "workplace_id": workplaces[0]["workplace_id"],
                "workplace_name": workplaces[0]["workplace_name"],
                "shift_date": f"{date_str}T00:00:00",
                "start_time": "11:00",
                "end_time": "21:00",
                "shift_type": "route_based",
                "work_type": "route_based",
                "positions_needed": 2,
                "positions_filled": 2,
                "status": "completed" if day < 22 else "scheduled",
                "assigned_workers": [workers[0]["workforce_id"], workers[4]["workforce_id"]] if len(workers) > 4 else [workers[0]["workforce_id"]],
                "route_details": {
                    "start_location": "Swan Pizza - Downtown",
                    "coverage_area": "Windsor Downtown",
                    "estimated_deliveries": random.randint(15, 30)
                },
                "created_at": shift_date.isoformat()
            }
            await db.calendar_shifts.insert_one(route_shift)
            shifts_created += 1
        
        # Continental shift (weekends)
        if shift_date.weekday() in [5, 6]:  # Saturday or Sunday
            continental_shift = {
                "shift_id": generate_id("shft"),
                "employer_id": employer_id,
                "workplace_id": workplaces[1]["workplace_id"] if len(workplaces) > 1 else workplaces[0]["workplace_id"],
                "workplace_name": workplaces[1]["workplace_name"] if len(workplaces) > 1 else workplaces[0]["workplace_name"],
                "shift_date": f"{date_str}T00:00:00",
                "start_time": "07:00",
                "end_time": "19:00",
                "shift_type": "continental",
                "work_type": "continental",
                "positions_needed": 2,
                "positions_filled": 2,
                "status": "completed" if day < 22 else "scheduled",
                "assigned_workers": [workers[3]["workforce_id"]] if len(workers) > 3 else [workers[0]["workforce_id"]],
                "break_duration_minutes": 60,
                "created_at": shift_date.isoformat()
            }
            await db.calendar_shifts.insert_one(continental_shift)
            shifts_created += 1
    
    results["created"].append(f"Created {shifts_created} shifts for December")
    
    # ==========================================
    # 2. GENERATE ATTENDANCE RECORDS
    # ==========================================
    attendance_created = 0
    
    # Clear existing December attendance
    await db.attendance_records.delete_many({
        "employer_id": employer_id,
        "date": {"$regex": "^2024-12"}
    })
    
    # Get all completed shifts
    completed_shifts = await db.calendar_shifts.find({
        "employer_id": employer_id,
        "status": "completed"
    }).to_list(200)
    
    for shift in completed_shifts:
        assigned_workers = shift.get("assigned_workers", [])
        shift_date = shift.get("shift_date", "")[:10]
        
        for worker_id in assigned_workers:
            worker = next((w for w in workers if w["workforce_id"] == worker_id), None)
            if not worker:
                continue
            
            # Parse times
            start_time = shift.get("start_time", "09:00")
            end_time = shift.get("end_time", "17:00")
            
            # Add some variation to clock times
            clock_in_variation = random.randint(-5, 10)  # -5 to +10 minutes
            clock_out_variation = random.randint(-10, 15)  # -10 to +15 minutes
            
            start_hour, start_min = map(int, start_time.split(":"))
            end_hour, end_min = map(int, end_time.split(":"))
            
            actual_start = datetime(2024, 12, int(shift_date.split("-")[2]), start_hour, start_min, tzinfo=timezone.utc) + timedelta(minutes=clock_in_variation)
            actual_end = datetime(2024, 12, int(shift_date.split("-")[2]), end_hour, end_min, tzinfo=timezone.utc) + timedelta(minutes=clock_out_variation)
            
            hours_worked = (actual_end - actual_start).total_seconds() / 3600
            
            attendance = {
                "attendance_id": generate_id("att"),
                "shift_id": shift["shift_id"],
                "employer_id": employer_id,
                "workforce_id": worker_id,
                "worker_name": worker["full_name"],
                "date": shift_date,
                "scheduled_start": start_time,
                "scheduled_end": end_time,
                "clock_in": actual_start.isoformat(),
                "clock_out": actual_end.isoformat(),
                "hours_worked": round(hours_worked, 2),
                "status": "completed",
                "notes": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.attendance_records.insert_one(attendance)
            attendance_created += 1
    
    results["created"].append(f"Created {attendance_created} attendance records")
    
    # ==========================================
    # 3. GENERATE TIMESHEETS
    # ==========================================
    timesheets_created = 0
    
    # Clear existing December timesheets
    await db.timesheets.delete_many({
        "employer_id": employer_id,
        "week_start": {"$regex": "^2024-12"}
    })
    
    # Generate weekly timesheets for December
    # Week 1: Dec 1-7 (Approved, processed)
    # Week 2: Dec 8-14 (Approved, pending payroll)
    # Week 3: Dec 15-21 (Pending approval)
    
    weeks = [
        {"start": "2024-12-01", "end": "2024-12-07", "status": "processed", "payroll_status": "paid"},
        {"start": "2024-12-08", "end": "2024-12-14", "status": "approved", "payroll_status": "pending"},
        {"start": "2024-12-15", "end": "2024-12-21", "status": "pending", "payroll_status": None},
    ]
    
    for worker in workers:
        for week in weeks:
            # Calculate hours for the week
            total_hours = random.uniform(30, 45)
            regular_hours = min(total_hours, 40)
            overtime_hours = max(0, total_hours - 40)
            hourly_rate = worker.get("hourly_rate", 17.50)
            
            timesheet = {
                "timesheet_id": generate_id("ts"),
                "employer_id": employer_id,
                "workforce_id": worker["workforce_id"],
                "worker_name": worker["full_name"],
                "week_start": week["start"],
                "week_end": week["end"],
                "total_hours": round(total_hours, 2),
                "regular_hours": round(regular_hours, 2),
                "overtime_hours": round(overtime_hours, 2),
                "hourly_rate": hourly_rate,
                "gross_pay": round((regular_hours * hourly_rate) + (overtime_hours * hourly_rate * 1.5), 2),
                "status": week["status"],
                "payroll_status": week["payroll_status"],
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "approved_at": datetime.now(timezone.utc).isoformat() if week["status"] in ["approved", "processed"] else None,
                "approved_by": employer_id if week["status"] in ["approved", "processed"] else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.timesheets.insert_one(timesheet)
            timesheets_created += 1
    
    results["created"].append(f"Created {timesheets_created} timesheets (5 pending approval, 5 approved pending payroll, 5 processed)")
    
    # ==========================================
    # 4. GENERATE PAYROLL RECORDS
    # ==========================================
    payroll_created = 0
    
    # Clear existing December payroll
    await db.payroll_records.delete_many({
        "employer_id": employer_id,
        "pay_period_start": {"$regex": "^2024-12"}
    })
    
    # Week 1 payroll (processed and paid)
    for worker in workers:
        timesheet = await db.timesheets.find_one({
            "workforce_id": worker["workforce_id"],
            "week_start": "2024-12-01",
            "status": "processed"
        })
        
        if timesheet:
            payroll = {
                "payroll_id": generate_id("pay"),
                "employer_id": employer_id,
                "workforce_id": worker["workforce_id"],
                "worker_name": worker["full_name"],
                "pay_period_start": "2024-12-01",
                "pay_period_end": "2024-12-07",
                "timesheet_id": timesheet["timesheet_id"],
                "regular_hours": timesheet["regular_hours"],
                "overtime_hours": timesheet["overtime_hours"],
                "hourly_rate": timesheet["hourly_rate"],
                "gross_pay": timesheet["gross_pay"],
                "deductions": {
                    "cpp": round(timesheet["gross_pay"] * 0.0595, 2),
                    "ei": round(timesheet["gross_pay"] * 0.0163, 2),
                    "tax": round(timesheet["gross_pay"] * 0.15, 2)
                },
                "net_pay": round(timesheet["gross_pay"] * 0.775, 2),
                "status": "paid",
                "paid_at": "2024-12-13T10:00:00Z",
                "payment_method": "direct_deposit",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.payroll_records.insert_one(payroll)
            payroll_created += 1
    
    # Week 2 payroll (pending processing)
    for worker in workers:
        timesheet = await db.timesheets.find_one({
            "workforce_id": worker["workforce_id"],
            "week_start": "2024-12-08",
            "status": "approved"
        })
        
        if timesheet:
            payroll = {
                "payroll_id": generate_id("pay"),
                "employer_id": employer_id,
                "workforce_id": worker["workforce_id"],
                "worker_name": worker["full_name"],
                "pay_period_start": "2024-12-08",
                "pay_period_end": "2024-12-14",
                "timesheet_id": timesheet["timesheet_id"],
                "regular_hours": timesheet["regular_hours"],
                "overtime_hours": timesheet["overtime_hours"],
                "hourly_rate": timesheet["hourly_rate"],
                "gross_pay": timesheet["gross_pay"],
                "deductions": {
                    "cpp": round(timesheet["gross_pay"] * 0.0595, 2),
                    "ei": round(timesheet["gross_pay"] * 0.0163, 2),
                    "tax": round(timesheet["gross_pay"] * 0.15, 2)
                },
                "net_pay": round(timesheet["gross_pay"] * 0.775, 2),
                "status": "pending",
                "payment_method": "direct_deposit",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.payroll_records.insert_one(payroll)
            payroll_created += 1
    
    results["created"].append(f"Created {payroll_created} payroll records (5 paid, 5 pending)")
    
    # ==========================================
    # 5. GENERATE NOTIFICATIONS
    # ==========================================
    notifications_created = 0
    
    # Clear existing notifications for this employer and workers
    all_user_ids = [employer_id] + [w["workforce_id"] for w in workers]
    await db.notifications.delete_many({"user_id": {"$in": all_user_ids}})
    
    notification_templates = [
        # Employer notifications
        {
            "user_id": employer_id,
            "title": "Timesheet Pending Approval",
            "message": "5 timesheets are waiting for your approval for the week of Dec 15-21.",
            "type": "timesheet_approval",
            "priority": "high",
            "read_status": False,
            "action_url": "/employer/timesheets"
        },
        {
            "user_id": employer_id,
            "title": "Payroll Ready for Processing",
            "message": "Payroll for Dec 8-14 is ready to be processed. Total: $3,245.50",
            "type": "payroll_pending",
            "priority": "high",
            "read_status": False,
            "action_url": "/employer/payroll"
        },
        {
            "user_id": employer_id,
            "title": "New Shift Coverage Request",
            "message": "Alex Johnson has requested time off for Dec 24. A replacement is needed.",
            "type": "shift_coverage",
            "priority": "medium",
            "read_status": False,
            "action_url": "/employer/calendar-scheduling"
        },
        {
            "user_id": employer_id,
            "title": "Weekly Performance Report",
            "message": "Your team completed 156 hours this week with 98% attendance rate.",
            "type": "report",
            "priority": "low",
            "read_status": True,
            "action_url": "/employer/dashboard"
        },
        {
            "user_id": employer_id,
            "title": "Document Expiring Soon",
            "message": "Maria Santos's Food Handler Certificate expires in 7 days.",
            "type": "document_expiry",
            "priority": "medium",
            "read_status": False,
            "action_url": "/employer/workforce"
        },
        {
            "user_id": employer_id,
            "title": "New Message from Alex Johnson",
            "message": "You have a new message from Alex Johnson regarding shift schedule.",
            "type": "message",
            "priority": "medium",
            "read_status": False,
            "action_url": "/employer/messages"
        },
    ]
    
    # Worker notifications
    for i, worker in enumerate(workers):
        worker_notifications = [
            {
                "user_id": worker["workforce_id"],
                "title": "Shift Scheduled",
                "message": f"You have been scheduled for a shift on Dec {22 + i} at Swan Pizza - Downtown.",
                "type": "shift_assigned",
                "priority": "medium",
                "read_status": False,
                "action_url": "/workforce/shifts"
            },
            {
                "user_id": worker["workforce_id"],
                "title": "Timesheet Approved",
                "message": "Your timesheet for Dec 1-7 has been approved. Payment will be processed soon.",
                "type": "timesheet_approved",
                "priority": "low",
                "read_status": True,
                "action_url": "/workforce/timesheets"
            },
            {
                "user_id": worker["workforce_id"],
                "title": "Payment Received",
                "message": f"Your payment of ${random.randint(450, 650)}.00 has been deposited to your account.",
                "type": "payment",
                "priority": "low",
                "read_status": True,
                "action_url": "/workforce/earnings"
            },
        ]
        
        # Add unread notification for first 3 workers
        if i < 3:
            worker_notifications.append({
                "user_id": worker["workforce_id"],
                "title": "New Message from Swan Pizza",
                "message": "Marco DiStefano sent you a message about your upcoming shift.",
                "type": "message",
                "priority": "medium",
                "read_status": False,
                "action_url": "/workforce/messages"
            })
        
        notification_templates.extend(worker_notifications)
    
    # Insert all notifications
    for notif in notification_templates:
        notif["notification_id"] = generate_id("notif")
        notif["created_date"] = (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))).isoformat()
        await db.notifications.insert_one(notif)
        notifications_created += 1
    
    results["created"].append(f"Created {notifications_created} notifications ({sum(1 for n in notification_templates if not n['read_status'])} unread)")
    
    # ==========================================
    # 6. GENERATE MORE CHAT MESSAGES
    # ==========================================
    messages_created = 0
    
    # Create chat threads with more workers
    for worker in workers[1:4]:  # Priya, Maria, James
        # Check if thread exists
        existing = await db.chat_threads.find_one({
            "employer_id": employer_id,
            "workforce_id": worker["workforce_id"]
        })
        
        if not existing:
            thread_id = generate_id("thread")
            thread = {
                "thread_id": thread_id,
                "employer_id": employer_id,
                "workforce_id": worker["workforce_id"],
                "employer_name": employer_profile.get("company_name", "Swan Pizza"),
                "workforce_name": worker["full_name"],
                "other_user_name": worker["full_name"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_message": "Hi",
                "last_message_at": datetime.now(timezone.utc).isoformat(),
                "last_message_from": worker["workforce_id"],
                "employer_unread_count": 1,
                "workforce_unread_count": 0
            }
            await db.chat_threads.insert_one(thread)
            
            # Add initial message from worker
            from models.messaging import Message
            msg = Message(
                thread_id=thread_id,
                from_user_id=worker["workforce_id"],
                from_user_type="workforce",
                to_user_id=employer_id,
                message_text="Hi",
                delivered=True,
                delivered_at=datetime.now(timezone.utc)
            )
            await db.messages.insert_one(msg.model_dump())
            messages_created += 1
    
    results["created"].append(f"Created {messages_created} additional messages")
    
    # ==========================================
    # SUMMARY
    # ==========================================
    return {
        "success": True,
        "message": "🍕 Swan Pizza December data seeded successfully!",
        "summary": {
            "shifts": shifts_created,
            "attendance_records": attendance_created,
            "timesheets": timesheets_created,
            "payroll_records": payroll_created,
            "notifications": notifications_created,
            "messages": messages_created
        },
        "data_created": results["created"]
    }


if __name__ == "__main__":
    result = asyncio.run(seed_december_data())
    print(result)
