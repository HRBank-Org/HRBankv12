"""
Comprehensive occupation categories and titles for HR Bank
Organized by industry sectors with common job titles
"""

# Platform-wide minimum wage (Ontario default)
MINIMUM_WAGE = 17.20

# Platform fee structure
PLATFORM_FEE_PER_HOUR = 1.00  # $1.00 per worked hour
PLATFORM_FEE_PER_STOP = 0.25  # $0.25 per stop for route-based workers

OCCUPATION_CATEGORIES = {
    "Food & Hospitality": {
        "icon": "🍽️",
        "description": "Restaurants, hotels, catering, events",
        "occupations": [
            {
                "title": "Server / Waiter / Waitress",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Line Cook",
                "minimum_hourly_rate": 18.5
            },
            {
                "title": "Prep Cook",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Dishwasher",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Host / Hostess",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Barista",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Fast Food Worker",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Food Runner",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Busser",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Catering Staff",
                "minimum_hourly_rate": 18.0
            },
            {
                "title": "Banquet Server",
                "minimum_hourly_rate": 18.5
            },
            {
                "title": "Hotel Front Desk",
                "minimum_hourly_rate": 18.5
            },
            {
                "title": "Housekeeper",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Concierge",
                "minimum_hourly_rate": 19.5
            },
            {
                "title": "Room Attendant",
                "minimum_hourly_rate": 17.6
            },
            {
                "title": "Event Staff",
                "minimum_hourly_rate": 18.0
            },
            {
                "title": "Kitchen Manager",
                "minimum_hourly_rate": 22.0
            },
            {
                "title": "Restaurant Manager",
                "minimum_hourly_rate": 24.0
            },
            {
                "title": "Bartender",
                "minimum_hourly_rate": 18.0,
                "required_certifications": [
                    "Smart Serve Ontario",
                    "Safe Food Handling Certificate"
                ]
            },
            {
                "title": "Chef",
                "minimum_hourly_rate": 22.0
            },
            {
                "title": "Sous Chef",
                "minimum_hourly_rate": 20.0
            },
            {
                "title": "Shift Supervisor",
                "minimum_hourly_rate": 20.0
            }
        ]
    },
    "Retail & Grocery": {
        "icon": "🛒",
        "description": "Stores, supermarkets, pharmacies",
        "occupations": [
            {
                "title": "Cashier",
                "required_certifications": []
            },
            {
                "title": "Sales Associate",
                "required_certifications": []
            },
            {
                "title": "Stock Clerk",
                "required_certifications": []
            },
            {
                "title": "Grocery Clerk",
                "required_certifications": []
            },
            {
                "title": "Pharmacy Assistant",
                "required_certifications": []
            },
            {
                "title": "Store Manager",
                "required_certifications": []
            },
            {
                "title": "Assistant Manager",
                "required_certifications": []
            },
            {
                "title": "Customer Service Representative",
                "required_certifications": []
            },
            {
                "title": "Receiving Clerk",
                "required_certifications": []
            },
            {
                "title": "Inventory Clerk",
                "required_certifications": []
            },
            {
                "title": "Visual Merchandiser",
                "required_certifications": []
            },
            {
                "title": "Loss Prevention",
                "required_certifications": []
            },
            {
                "title": "Department Supervisor",
                "required_certifications": []
            },
            {
                "title": "Produce Clerk",
                "required_certifications": []
            },
            {
                "title": "Deli Clerk",
                "required_certifications": []
            },
            {
                "title": "Bakery Clerk",
                "required_certifications": []
            },
            {
                "title": "Meat Clerk",
                "required_certifications": []
            },
            {
                "title": "Floral Associate",
                "required_certifications": []
            }
        ]
    },
    "Healthcare & Personal Care": {
        "icon": "🏥",
        "description": "Nursing, home care, clinics",
        "occupations": [
            {
                "title": "Personal Support Worker (PSW)",
                "required_certifications": [
                    "Personal Support Worker (PSW) Certificate",
                    "CPR/First Aid Certification"
                ]
            },
            {
                "title": "Registered Nurse (RN)",
                "required_certifications": [
                    "Registered Nurse (RN)",
                    "CPR/First Aid Certification"
                ]
            },
            {
                "title": "Licensed Practical Nurse (LPN)",
                "required_certifications": [
                    "Registered Practical Nurse (RPN)",
                    "CPR/First Aid Certification"
                ]
            },
            {
                "title": "Caregiver",
                "required_certifications": [
                    "Personal Support Worker (PSW) Certificate",
                    "CPR/First Aid Certification"
                ]
            },
            {
                "title": "Home Care Aide",
                "required_certifications": [
                    "Personal Support Worker (PSW) Certificate",
                    "CPR/First Aid Certification"
                ]
            },
            {
                "title": "Dental Assistant",
                "required_certifications": [
                    "Ontario College Certificate"
                ]
            },
            {
                "title": "Dental Hygienist",
                "required_certifications": [
                    "Ontario College Diploma"
                ]
            },
            {
                "title": "Medical Office Assistant",
                "required_certifications": []
            },
            {
                "title": "Pharmacy Technician",
                "required_certifications": [
                    "Ontario College Diploma"
                ]
            },
            {
                "title": "Physiotherapy Assistant",
                "required_certifications": []
            },
            {
                "title": "Registered Massage Therapist (RMT)",
                "required_certifications": [
                    "Ontario College Diploma"
                ]
            },
            {
                "title": "Chiropractor Assistant",
                "required_certifications": []
            },
            {
                "title": "Veterinary Assistant",
                "required_certifications": []
            },
            {
                "title": "Veterinary Technician",
                "required_certifications": []
            },
            {
                "title": "Lab Technician",
                "required_certifications": []
            },
            {
                "title": "Phlebotomist",
                "required_certifications": []
            },
            {
                "title": "Recreation Aide",
                "required_certifications": []
            },
            {
                "title": "Dietary Aide",
                "required_certifications": []
            }
        ]
    },
    "Cleaning & Janitorial": {
        "icon": "🧹",
        "description": "Commercial & residential cleaning",
        "occupations": [
            {
                "title": "Janitor",
                "required_certifications": []
            },
            {
                "title": "Cleaner",
                "required_certifications": []
            },
            {
                "title": "Housekeeper",
                "required_certifications": []
            },
            {
                "title": "Office Cleaner",
                "required_certifications": []
            },
            {
                "title": "Building Cleaner",
                "required_certifications": []
            },
            {
                "title": "Window Cleaner",
                "required_certifications": []
            },
            {
                "title": "Carpet Cleaner",
                "required_certifications": []
            },
            {
                "title": "Floor Technician",
                "required_certifications": []
            },
            {
                "title": "Disinfection Specialist",
                "required_certifications": []
            },
            {
                "title": "Post-Construction Cleaner",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Working at Heights Certificate"
                ]
            },
            {
                "title": "Residential Cleaner",
                "required_certifications": []
            },
            {
                "title": "Commercial Cleaner",
                "required_certifications": []
            },
            {
                "title": "Custodian",
                "required_certifications": []
            },
            {
                "title": "Maintenance Cleaner",
                "required_certifications": []
            },
            {
                "title": "Airbnb Cleaner",
                "required_certifications": []
            }
        ]
    },
    "Security & Safety": {
        "icon": "🛡️",
        "description": "Security guards, loss prevention",
        "occupations": [
            {
                "title": "Security Guard",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Security Officer",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Loss Prevention Officer",
                "required_certifications": []
            },
            {
                "title": "Event Security",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Construction Site Security",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Retail Security",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Parking Enforcement Officer",
                "required_certifications": []
            },
            {
                "title": "Traffic Control Person",
                "required_certifications": []
            },
            {
                "title": "Fire Watch",
                "required_certifications": []
            },
            {
                "title": "Concierge Security",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Mobile Patrol Officer",
                "required_certifications": []
            },
            {
                "title": "CCTV Operator",
                "required_certifications": []
            },
            {
                "title": "Access Control Officer",
                "required_certifications": []
            },
            {
                "title": "Site Supervisor",
                "required_certifications": []
            }
        ]
    },
    "Property Management & Maintenance": {
        "icon": "🏢",
        "description": "Building maintenance, landscaping",
        "occupations": [
            {
                "title": "Property Manager",
                "required_certifications": []
            },
            {
                "title": "Building Superintendent",
                "required_certifications": []
            },
            {
                "title": "Maintenance Worker",
                "required_certifications": []
            },
            {
                "title": "Handyman",
                "required_certifications": []
            },
            {
                "title": "HVAC Technician",
                "required_certifications": [
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Plumber",
                "required_certifications": [
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Electrician",
                "required_certifications": [
                    "Electrical License",
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Landscaper",
                "required_certifications": []
            },
            {
                "title": "Groundskeeper",
                "required_certifications": []
            },
            {
                "title": "Snow Removal Operator",
                "required_certifications": []
            },
            {
                "title": "Lawn Care Technician",
                "required_certifications": []
            },
            {
                "title": "Pool Maintenance Technician",
                "required_certifications": []
            },
            {
                "title": "Pest Control Technician",
                "required_certifications": []
            },
            {
                "title": "Elevator Mechanic",
                "required_certifications": []
            },
            {
                "title": "Painter",
                "required_certifications": []
            },
            {
                "title": "General Laborer",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Working at Heights Certificate"
                ]
            }
        ]
    },
    "Construction & Trades": {
        "icon": "🔨",
        "description": "Construction, electrical, plumbing",
        "occupations": [
            {
                "title": "General Laborer",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Working at Heights Certificate"
                ]
            },
            {
                "title": "Construction Worker",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Working at Heights Certificate"
                ]
            },
            {
                "title": "Electrician",
                "required_certifications": [
                    "Electrical License",
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Plumber",
                "required_certifications": [
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "HVAC Technician",
                "required_certifications": [
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Carpenter",
                "required_certifications": [
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Drywall Installer",
                "required_certifications": []
            },
            {
                "title": "Flooring Installer",
                "required_certifications": []
            },
            {
                "title": "Roofer",
                "required_certifications": []
            },
            {
                "title": "Concrete Worker",
                "required_certifications": []
            },
            {
                "title": "Demolition Worker",
                "required_certifications": []
            },
            {
                "title": "Scaffolder",
                "required_certifications": []
            },
            {
                "title": "Welder",
                "required_certifications": [
                    "Certificate of Qualification (Red Seal)"
                ]
            },
            {
                "title": "Painter",
                "required_certifications": []
            },
            {
                "title": "Mason",
                "required_certifications": []
            },
            {
                "title": "Foreman",
                "required_certifications": []
            },
            {
                "title": "Site Supervisor",
                "required_certifications": []
            },
            {
                "title": "Heavy Equipment Operator",
                "required_certifications": []
            }
        ]
    },
    "Transportation & Logistics": {
        "icon": "🚚",
        "description": "Delivery, moving, warehouse",
        "occupations": [
            {
                "title": "Delivery Driver",
                "required_certifications": [
                    "Ontario Driver's License (G)"
                ]
            },
            {
                "title": "Courier",
                "required_certifications": []
            },
            {
                "title": "Truck Driver",
                "required_certifications": [
                    "Commercial Driver's License (AZ)"
                ]
            },
            {
                "title": "Mover",
                "required_certifications": []
            },
            {
                "title": "Warehouse Worker",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Forklift Operator Certificate"
                ]
            },
            {
                "title": "Forklift Operator",
                "required_certifications": [
                    "Forklift Operator Certificate",
                    "WHMIS 2015 Certificate"
                ]
            },
            {
                "title": "Order Picker",
                "required_certifications": []
            },
            {
                "title": "Packer",
                "required_certifications": []
            },
            {
                "title": "Shipper / Receiver",
                "required_certifications": []
            },
            {
                "title": "Dock Worker",
                "required_certifications": []
            },
            {
                "title": "Material Handler",
                "required_certifications": []
            },
            {
                "title": "Logistics Coordinator",
                "required_certifications": []
            },
            {
                "title": "Dispatch Coordinator",
                "required_certifications": []
            },
            {
                "title": "Shuttle Driver",
                "required_certifications": [
                    "Ontario Driver's License (G)"
                ]
            },
            {
                "title": "Taxi Driver",
                "required_certifications": [
                    "Ontario Driver's License (G)"
                ]
            },
            {
                "title": "Limousine Driver",
                "required_certifications": [
                    "Ontario Driver's License (G)"
                ]
            },
            {
                "title": "Food Delivery Driver",
                "required_certifications": [
                    "Food Handler Certificate"
                ]
            }
        ]
    },
    "Agriculture & Greenhouses": {
        "icon": "🌱",
        "description": "Farms, greenhouses, nurseries",
        "occupations": [
            {
                "title": "Greenhouse Worker",
                "required_certifications": []
            },
            {
                "title": "Farm Worker",
                "required_certifications": []
            },
            {
                "title": "Harvest Worker",
                "required_certifications": []
            },
            {
                "title": "Packer",
                "required_certifications": []
            },
            {
                "title": "Sorter",
                "required_certifications": []
            },
            {
                "title": "Plant Care Worker",
                "required_certifications": []
            },
            {
                "title": "Nursery Worker",
                "required_certifications": [
                    "CPR/First Aid Certification"
                ]
            },
            {
                "title": "Livestock Worker",
                "required_certifications": []
            },
            {
                "title": "Dairy Farm Worker",
                "required_certifications": []
            },
            {
                "title": "Poultry Farm Worker",
                "required_certifications": []
            },
            {
                "title": "Aquaculture Worker",
                "required_certifications": []
            },
            {
                "title": "Winery Worker",
                "required_certifications": []
            },
            {
                "title": "Irrigation Technician",
                "required_certifications": []
            },
            {
                "title": "Equipment Operator",
                "required_certifications": []
            },
            {
                "title": "Farm Supervisor",
                "required_certifications": []
            }
        ]
    },
    "Education & Childcare": {
        "icon": "📚",
        "description": "Daycares, schools, camps",
        "occupations": [
            {
                "title": "Childcare Worker",
                "required_certifications": []
            },
            {
                "title": "Daycare Teacher",
                "required_certifications": []
            },
            {
                "title": "Early Childhood Educator (ECE)",
                "required_certifications": []
            },
            {
                "title": "Teaching Assistant",
                "required_certifications": []
            },
            {
                "title": "Tutor",
                "required_certifications": []
            },
            {
                "title": "Camp Counselor",
                "required_certifications": []
            },
            {
                "title": "After-School Program Leader",
                "required_certifications": []
            },
            {
                "title": "Recreation Instructor",
                "required_certifications": []
            },
            {
                "title": "Lifeguard",
                "required_certifications": [
                    "Security Guard License"
                ]
            },
            {
                "title": "Swim Instructor",
                "required_certifications": []
            },
            {
                "title": "Sports Coach",
                "required_certifications": []
            },
            {
                "title": "Dance Instructor",
                "required_certifications": []
            },
            {
                "title": "Martial Arts Instructor",
                "required_certifications": []
            },
            {
                "title": "Music Teacher",
                "required_certifications": []
            },
            {
                "title": "Art Instructor",
                "required_certifications": []
            },
            {
                "title": "Educational Assistant",
                "required_certifications": []
            }
        ]
    },
    "Entertainment & Recreation": {
        "icon": "🎭",
        "description": "Theaters, parks, sports facilities",
        "occupations": [
            {
                "title": "Movie Theater Attendant",
                "required_certifications": []
            },
            {
                "title": "Usher",
                "required_certifications": []
            },
            {
                "title": "Ticket Sales",
                "required_certifications": []
            },
            {
                "title": "Concession Worker",
                "required_certifications": []
            },
            {
                "title": "Bowling Alley Attendant",
                "required_certifications": []
            },
            {
                "title": "Arcade Attendant",
                "required_certifications": []
            },
            {
                "title": "Amusement Park Attendant",
                "required_certifications": []
            },
            {
                "title": "Ride Operator",
                "required_certifications": []
            },
            {
                "title": "Ski Lift Operator",
                "required_certifications": []
            },
            {
                "title": "Ski Instructor",
                "required_certifications": []
            },
            {
                "title": "Golf Course Attendant",
                "required_certifications": []
            },
            {
                "title": "Fitness Instructor",
                "required_certifications": []
            },
            {
                "title": "Personal Trainer",
                "required_certifications": []
            },
            {
                "title": "Yoga Instructor",
                "required_certifications": []
            },
            {
                "title": "Front Desk Attendant",
                "required_certifications": []
            },
            {
                "title": "Recreation Leader",
                "required_certifications": []
            },
            {
                "title": "Event Coordinator",
                "required_certifications": []
            }
        ]
    },
    "Manufacturing & Industrial": {
        "icon": "🏭",
        "description": "Factories, warehouses, assembly",
        "occupations": [
            {
                "title": "Production Worker",
                "required_certifications": []
            },
            {
                "title": "Assembly Line Worker",
                "required_certifications": []
            },
            {
                "title": "Machine Operator",
                "required_certifications": []
            },
            {
                "title": "Packaging Worker",
                "required_certifications": []
            },
            {
                "title": "Quality Control Inspector",
                "required_certifications": []
            },
            {
                "title": "Forklift Operator",
                "required_certifications": [
                    "Forklift Operator Certificate",
                    "WHMIS 2015 Certificate"
                ]
            },
            {
                "title": "Warehouse Associate",
                "required_certifications": [
                    "WHMIS 2015 Certificate"
                ]
            },
            {
                "title": "Material Handler",
                "required_certifications": []
            },
            {
                "title": "Picker / Packer",
                "required_certifications": []
            },
            {
                "title": "Shipper / Receiver",
                "required_certifications": []
            },
            {
                "title": "Maintenance Technician",
                "required_certifications": []
            },
            {
                "title": "Industrial Cleaner",
                "required_certifications": []
            },
            {
                "title": "Production Supervisor",
                "required_certifications": []
            },
            {
                "title": "Team Lead",
                "required_certifications": []
            }
        ]
    },
    "Government & Municipal": {
        "icon": "🏛️",
        "description": "City services, public works",
        "occupations": [
            {
                "title": "Parks Worker",
                "required_certifications": []
            },
            {
                "title": "Recreation Leader",
                "required_certifications": []
            },
            {
                "title": "Library Assistant",
                "required_certifications": []
            },
            {
                "title": "Public Works Laborer",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Working at Heights Certificate"
                ]
            },
            {
                "title": "Road Maintenance Worker",
                "required_certifications": []
            },
            {
                "title": "Transit Operator",
                "required_certifications": []
            },
            {
                "title": "Bus Driver",
                "required_certifications": [
                    "Ontario Driver's License (G)"
                ]
            },
            {
                "title": "Waste Collection Worker",
                "required_certifications": []
            },
            {
                "title": "Recycling Worker",
                "required_certifications": []
            },
            {
                "title": "Bylaw Officer",
                "required_certifications": []
            },
            {
                "title": "Community Program Coordinator",
                "required_certifications": []
            },
            {
                "title": "Facility Attendant",
                "required_certifications": []
            },
            {
                "title": "Pool Operator",
                "required_certifications": []
            },
            {
                "title": "Arena Attendant",
                "required_certifications": []
            }
        ]
    },
    "Professional Services": {
        "icon": "💼",
        "description": "Call centers, IT support, staffing",
        "occupations": [
            {
                "title": "Customer Service Representative",
                "required_certifications": []
            },
            {
                "title": "Call Center Agent",
                "required_certifications": []
            },
            {
                "title": "Tech Support Specialist",
                "required_certifications": []
            },
            {
                "title": "Help Desk Technician",
                "required_certifications": []
            },
            {
                "title": "IT Support Technician",
                "required_certifications": []
            },
            {
                "title": "Data Entry Clerk",
                "required_certifications": []
            },
            {
                "title": "Administrative Assistant",
                "required_certifications": []
            },
            {
                "title": "Receptionist",
                "required_certifications": []
            },
            {
                "title": "Brand Ambassador",
                "required_certifications": []
            },
            {
                "title": "Event Staff",
                "required_certifications": []
            },
            {
                "title": "Promotional Staff",
                "required_certifications": []
            },
            {
                "title": "Market Research Interviewer",
                "required_certifications": []
            },
            {
                "title": "Sales Representative",
                "required_certifications": []
            },
            {
                "title": "Telemarketer",
                "required_certifications": []
            }
        ]
    },
    "Personal Services": {
        "icon": "💇",
        "description": "Salons, spas, personal care",
        "occupations": [
            {
                "title": "Hair Stylist",
                "required_certifications": []
            },
            {
                "title": "Barber",
                "required_certifications": [
                    "Smart Serve Certificate",
                    "Food Handler Certificate"
                ]
            },
            {
                "title": "Salon Assistant",
                "required_certifications": []
            },
            {
                "title": "Receptionist",
                "required_certifications": []
            },
            {
                "title": "Nail Technician",
                "required_certifications": []
            },
            {
                "title": "Esthetician",
                "required_certifications": []
            },
            {
                "title": "Massage Therapist",
                "required_certifications": []
            },
            {
                "title": "Spa Attendant",
                "required_certifications": []
            },
            {
                "title": "Tanning Salon Attendant",
                "required_certifications": []
            },
            {
                "title": "Dry Cleaner",
                "required_certifications": []
            },
            {
                "title": "Laundry Attendant",
                "required_certifications": []
            },
            {
                "title": "Car Wash Attendant",
                "required_certifications": []
            },
            {
                "title": "Auto Detailer",
                "required_certifications": []
            },
            {
                "title": "Kennel Attendant",
                "required_certifications": []
            },
            {
                "title": "Pet Groomer",
                "required_certifications": []
            }
        ]
    },
    "Emergency & Seasonal": {
        "icon": "❄️",
        "description": "Snow removal, disaster response",
        "occupations": [
            {
                "title": "Snow Removal Operator",
                "required_certifications": []
            },
            {
                "title": "Snow Shoveler",
                "required_certifications": []
            },
            {
                "title": "Plow Driver",
                "required_certifications": [
                    "Ontario Driver's License (G)"
                ]
            },
            {
                "title": "Salt Truck Driver",
                "required_certifications": [
                    "Commercial Driver's License (AZ)"
                ]
            },
            {
                "title": "Disaster Cleanup Worker",
                "required_certifications": []
            },
            {
                "title": "Restoration Technician",
                "required_certifications": []
            },
            {
                "title": "Water Damage Technician",
                "required_certifications": []
            },
            {
                "title": "Mold Remediation Specialist",
                "required_certifications": []
            },
            {
                "title": "Seasonal Decorator",
                "required_certifications": []
            },
            {
                "title": "Christmas Light Installer",
                "required_certifications": []
            },
            {
                "title": "Event Setup Crew",
                "required_certifications": []
            },
            {
                "title": "Festival Vendor",
                "required_certifications": []
            },
            {
                "title": "Seasonal Laborer",
                "required_certifications": [
                    "WHMIS 2015 Certificate",
                    "Working at Heights Certificate"
                ]
            }
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
