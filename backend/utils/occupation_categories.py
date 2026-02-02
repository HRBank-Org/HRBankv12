"""
Comprehensive occupation categories and titles for HR Bank
Organized by industry sectors with common job titles

Pricing Structure:
- Super-admin sets minimum rates per occupation
- Workers receive gross pay (deductions handled by payroll processors)
- Platform fees:
  * Minimum wage jobs: $1/hour fee to employer only
  * Above minimum wage: $1/hour fee to BOTH worker and employer
  * Route-based: +$0.25 per verified stop (covers GPS verification overhead)

Work Types:
- on_site: Standard GPS clock-in at workplace (Server, Chef, Cashier)
- route_based: Multi-stop tasks with GPS at each location (Delivery Driver, Cleaner)
- continental: 12-hour rotating shifts (Security Guard, Factory Worker)
"""

# Ontario minimum wage (effective October 1, 2025)
MINIMUM_WAGE = 17.60

# Platform fee structure
PLATFORM_FEE_PER_HOUR = 1.00
PLATFORM_FEE_PER_STOP = 0.25  # Additional fee per verified stop (route-based only)

# Default work type mappings by occupation title
# Super-admin controlled - employers can override when creating roles
DEFAULT_WORK_TYPES = {
    # Continental (12-hour rotating shifts)
    "Security Guard": "continental",
    "Security Officer": "continental",
    "Fire Watch": "continental",
    "Concierge Security": "continental",
    "Mobile Patrol Officer": "continental",
    "CCTV Operator": "continental",
    "Access Control Officer": "continental",
    "Site Supervisor": "continental",
    "Production Worker": "continental",
    "Assembly Line Worker": "continental",
    "Machine Operator": "continental",
    
    # Route-based (multi-stop GPS tracking)
    "Delivery Driver": "route_based",
    "Courier": "route_based",
    "Food Delivery Driver": "route_based",
    "Truck Driver": "route_based",
    "Mover": "route_based",
    "Shuttle Driver": "route_based",
    "Residential Cleaner": "route_based",
    "Airbnb Cleaner": "route_based",
    "Home Care Aide": "route_based",
    "Caregiver": "route_based",
    "Personal Support Worker (PSW)": "route_based",
    "Pest Control Technician": "route_based",
    "Pool Maintenance Technician": "route_based",
    "Snow Removal Operator": "route_based",
    "Christmas Light Installer": "route_based",
    
    # All others default to on_site
}

def get_default_work_type(occupation_title: str) -> str:
    """
    Get the default work type for an occupation.
    Returns 'on_site' if no specific mapping exists.
    """
    # Exact match first
    if occupation_title in DEFAULT_WORK_TYPES:
        return DEFAULT_WORK_TYPES[occupation_title]
    
    # Partial match for variations
    title_lower = occupation_title.lower()
    
    # Security roles -> continental
    if any(kw in title_lower for kw in ["security", "guard", "patrol", "fire watch"]):
        return "continental"
    
    # Delivery/driver roles -> route_based
    if any(kw in title_lower for kw in ["delivery", "courier", "driver", "mover"]):
        return "route_based"
    
    # Home service roles -> route_based
    if any(kw in title_lower for kw in ["home care", "home aide", "residential clean", "airbnb"]):
        return "route_based"
    
    # Default to on_site
    return "on_site"

OCCUPATION_CATEGORIES = {
    "Food & Hospitality": {
        "icon": "🍽️",
        "description": "Restaurants, hotels, catering, events",
        "occupations": [
            {"title": "Server / Waiter / Waitress", "minimum_hourly_rate": 17.60},
            {"title": "Line Cook", "minimum_hourly_rate": 18.50},
            {"title": "Prep Cook", "minimum_hourly_rate": 17.60},
            {"title": "Dishwasher", "minimum_hourly_rate": 17.60},
            {"title": "Host / Hostess", "minimum_hourly_rate": 17.60},
            {"title": "Barista", "minimum_hourly_rate": 17.60},
            {"title": "Fast Food Worker", "minimum_hourly_rate": 17.60},
            {"title": "Food Runner", "minimum_hourly_rate": 17.60},
            {"title": "Busser", "minimum_hourly_rate": 17.60},
            {"title": "Catering Staff", "minimum_hourly_rate": 18.00},
            {"title": "Banquet Server", "minimum_hourly_rate": 18.50},
            {"title": "Hotel Front Desk", "minimum_hourly_rate": 18.50},
            {"title": "Housekeeper", "minimum_hourly_rate": 17.60},
            {"title": "Concierge", "minimum_hourly_rate": 19.50},
            {"title": "Room Attendant", "minimum_hourly_rate": 17.60},
            {"title": "Event Staff", "minimum_hourly_rate": 18.00},
            {"title": "Kitchen Manager", "minimum_hourly_rate": 22.00},
            {"title": "Restaurant Manager", "minimum_hourly_rate": 24.00},
            {
                "title": "Bartender",
                "minimum_hourly_rate": 18.00,
                "required_certifications": [
                    "Smart Serve Ontario",
                    "Safe Food Handling Certificate"
                ]
            },
            {"title": "Chef", "minimum_hourly_rate": 22.00},
            {"title": "Sous Chef", "minimum_hourly_rate": 20.00},
            {"title": "Shift Supervisor", "minimum_hourly_rate": 20.00}
        ]
    },
    "Retail & Grocery": {
        "icon": "🛒",
        "description": "Stores, supermarkets, pharmacies",
        "occupations": [
            "Cashier",
            "Sales Associate",
            "Stock Clerk",
            "Grocery Clerk",
            "Pharmacy Assistant",
            "Store Manager",
            "Assistant Manager",
            "Customer Service Representative",
            "Receiving Clerk",
            "Inventory Clerk",
            "Visual Merchandiser",
            "Loss Prevention",
            "Department Supervisor",
            "Produce Clerk",
            "Deli Clerk",
            "Bakery Clerk",
            "Meat Clerk",
            "Floral Associate"
        ]
    },
    "Healthcare & Personal Care": {
        "icon": "🏥",
        "description": "Nursing, home care, clinics",
        "occupations": [
            "Personal Support Worker (PSW)",
            "Registered Nurse (RN)",
            "Licensed Practical Nurse (LPN)",
            "Caregiver",
            "Home Care Aide",
            "Dental Assistant",
            "Dental Hygienist",
            "Medical Office Assistant",
            "Pharmacy Technician",
            "Physiotherapy Assistant",
            "Registered Massage Therapist (RMT)",
            "Chiropractor Assistant",
            "Veterinary Assistant",
            "Veterinary Technician",
            "Lab Technician",
            "Phlebotomist",
            "Recreation Aide",
            "Dietary Aide"
        ]
    },
    "Cleaning & Janitorial": {
        "icon": "🧹",
        "description": "Commercial & residential cleaning",
        "occupations": [
            "Janitor",
            "Cleaner",
            "Housekeeper",
            "Office Cleaner",
            "Building Cleaner",
            "Window Cleaner",
            "Carpet Cleaner",
            "Floor Technician",
            "Disinfection Specialist",
            "Post-Construction Cleaner",
            "Residential Cleaner",
            "Commercial Cleaner",
            "Custodian",
            "Maintenance Cleaner",
            "Airbnb Cleaner"
        ]
    },
    "Security & Safety": {
        "icon": "🛡️",
        "description": "Security guards, loss prevention",
        "occupations": [
            "Security Guard",
            "Security Officer",
            "Loss Prevention Officer",
            "Event Security",
            "Construction Site Security",
            "Retail Security",
            "Parking Enforcement Officer",
            "Traffic Control Person",
            "Fire Watch",
            "Concierge Security",
            "Mobile Patrol Officer",
            "CCTV Operator",
            "Access Control Officer",
            "Site Supervisor"
        ]
    },
    "Property Management & Maintenance": {
        "icon": "🏢",
        "description": "Building maintenance, landscaping",
        "occupations": [
            "Property Manager",
            "Building Superintendent",
            "Maintenance Worker",
            "Handyman",
            "HVAC Technician",
            "Plumber",
            "Electrician",
            "Landscaper",
            "Groundskeeper",
            "Snow Removal Operator",
            "Lawn Care Technician",
            "Pool Maintenance Technician",
            "Pest Control Technician",
            "Elevator Mechanic",
            "Painter",
            "General Laborer"
        ]
    },
    "Construction & Trades": {
        "icon": "🔨",
        "description": "Construction, electrical, plumbing",
        "occupations": [
            "General Laborer",
            "Construction Worker",
            "Electrician",
            "Plumber",
            "HVAC Technician",
            "Carpenter",
            "Drywall Installer",
            "Flooring Installer",
            "Roofer",
            "Concrete Worker",
            "Demolition Worker",
            "Scaffolder",
            "Welder",
            "Painter",
            "Mason",
            "Foreman",
            "Site Supervisor",
            "Heavy Equipment Operator"
        ]
    },
    "Transportation & Logistics": {
        "icon": "🚚",
        "description": "Delivery, moving, warehouse",
        "occupations": [
            "Delivery Driver",
            "Courier",
            "Truck Driver",
            "Mover",
            "Warehouse Worker",
            "Forklift Operator",
            "Order Picker",
            "Packer",
            "Shipper / Receiver",
            "Dock Worker",
            "Material Handler",
            "Logistics Coordinator",
            "Dispatch Coordinator",
            "Shuttle Driver",
            "Taxi Driver",
            "Limousine Driver",
            "Food Delivery Driver"
        ]
    },
    "Agriculture & Greenhouses": {
        "icon": "🌱",
        "description": "Farms, greenhouses, nurseries",
        "occupations": [
            "Greenhouse Worker",
            "Farm Worker",
            "Harvest Worker",
            "Packer",
            "Sorter",
            "Plant Care Worker",
            "Nursery Worker",
            "Livestock Worker",
            "Dairy Farm Worker",
            "Poultry Farm Worker",
            "Aquaculture Worker",
            "Winery Worker",
            "Irrigation Technician",
            "Equipment Operator",
            "Farm Supervisor"
        ]
    },
    "Education & Childcare": {
        "icon": "📚",
        "description": "Daycares, schools, camps",
        "occupations": [
            "Childcare Worker",
            "Daycare Teacher",
            "Early Childhood Educator (ECE)",
            "Teaching Assistant",
            "Tutor",
            "Camp Counselor",
            "After-School Program Leader",
            "Recreation Instructor",
            "Lifeguard",
            "Swim Instructor",
            "Sports Coach",
            "Dance Instructor",
            "Martial Arts Instructor",
            "Music Teacher",
            "Art Instructor",
            "Educational Assistant"
        ]
    },
    "Entertainment & Recreation": {
        "icon": "🎭",
        "description": "Theaters, parks, sports facilities",
        "occupations": [
            "Movie Theater Attendant",
            "Usher",
            "Ticket Sales",
            "Concession Worker",
            "Bowling Alley Attendant",
            "Arcade Attendant",
            "Amusement Park Attendant",
            "Ride Operator",
            "Ski Lift Operator",
            "Ski Instructor",
            "Golf Course Attendant",
            "Fitness Instructor",
            "Personal Trainer",
            "Yoga Instructor",
            "Front Desk Attendant",
            "Recreation Leader",
            "Event Coordinator"
        ]
    },
    "Manufacturing & Industrial": {
        "icon": "🏭",
        "description": "Factories, warehouses, assembly",
        "occupations": [
            "Production Worker",
            "Assembly Line Worker",
            "Machine Operator",
            "Packaging Worker",
            "Quality Control Inspector",
            "Forklift Operator",
            "Warehouse Associate",
            "Material Handler",
            "Picker / Packer",
            "Shipper / Receiver",
            "Maintenance Technician",
            "Industrial Cleaner",
            "Production Supervisor",
            "Team Lead"
        ]
    },
    "Government & Municipal": {
        "icon": "🏛️",
        "description": "City services, public works",
        "occupations": [
            "Parks Worker",
            "Recreation Leader",
            "Library Assistant",
            "Public Works Laborer",
            "Road Maintenance Worker",
            "Transit Operator",
            "Bus Driver",
            "Waste Collection Worker",
            "Recycling Worker",
            "Bylaw Officer",
            "Community Program Coordinator",
            "Facility Attendant",
            "Pool Operator",
            "Arena Attendant"
        ]
    },
    "Professional Services": {
        "icon": "💼",
        "description": "Call centers, IT support, staffing",
        "occupations": [
            "Customer Service Representative",
            "Call Center Agent",
            "Tech Support Specialist",
            "Help Desk Technician",
            "IT Support Technician",
            "Data Entry Clerk",
            "Administrative Assistant",
            "Receptionist",
            "Brand Ambassador",
            "Event Staff",
            "Promotional Staff",
            "Market Research Interviewer",
            "Sales Representative",
            "Telemarketer"
        ]
    },
    "Personal Services": {
        "icon": "💇",
        "description": "Salons, spas, personal care",
        "occupations": [
            "Hair Stylist",
            "Barber",
            "Salon Assistant",
            "Receptionist",
            "Nail Technician",
            "Esthetician",
            "Massage Therapist",
            "Spa Attendant",
            "Tanning Salon Attendant",
            "Dry Cleaner",
            "Laundry Attendant",
            "Car Wash Attendant",
            "Auto Detailer",
            "Kennel Attendant",
            "Pet Groomer"
        ]
    },
    "Emergency & Seasonal": {
        "icon": "❄️",
        "description": "Snow removal, disaster response",
        "occupations": [
            "Snow Removal Operator",
            "Snow Shoveler",
            "Plow Driver",
            "Salt Truck Driver",
            "Disaster Cleanup Worker",
            "Restoration Technician",
            "Water Damage Technician",
            "Mold Remediation Specialist",
            "Seasonal Decorator",
            "Christmas Light Installer",
            "Event Setup Crew",
            "Festival Vendor",
            "Seasonal Laborer"
        ]
    }
}

def get_all_categories():
    """Return list of all category names"""
    return list(OCCUPATION_CATEGORIES.keys())

def get_category_occupations(category):
    """Return occupations for a specific category"""
    return OCCUPATION_CATEGORIES.get(category, {}).get("occupations", [])

def get_all_occupations():
    """Return flat list of all occupations"""
    all_occupations = []
    for category_data in OCCUPATION_CATEGORIES.values():
        all_occupations.extend(category_data.get("occupations", []))
    return all_occupations
