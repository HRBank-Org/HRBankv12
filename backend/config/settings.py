import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    # Database
    MONGO_URL: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    DB_NAME: str = os.environ.get('DB_NAME', 'hrbank_db')
    
    # JWT
    JWT_SECRET: str = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
    JWT_ALGORITHM: str = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Third-Party APIs
    SENDGRID_API_KEY: str = os.environ.get('SENDGRID_API_KEY', '')
    SENDGRID_FROM_EMAIL: str = os.environ.get('SENDGRID_FROM_EMAIL', 'notifications@hrbank.ca')
    GOOGLE_MAPS_API_KEY: str = os.environ.get('GOOGLE_MAPS_API_KEY', '')
    GOOGLE_OAUTH_CLIENT_ID: str = os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '')
    GOOGLE_OAUTH_CLIENT_SECRET: str = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')
    GOOGLE_OAUTH_REDIRECT_URI: str = os.environ.get('GOOGLE_OAUTH_REDIRECT_URI', '')
    STRIPE_PUBLISHABLE_KEY: str = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    STRIPE_SECRET_KEY: str = os.environ.get('STRIPE_SECRET_KEY', '')
    
    # Security
    BCRYPT_ROUNDS: int = 12
    PASSWORD_MIN_LENGTH: int = 8
    
    # CORS
    CORS_ORIGINS: str = os.environ.get('CORS_ORIGINS', '*')
    
    # Frontend URL for email links
    FRONTEND_URL: str = os.environ.get('FRONTEND_URL', 'https://hrbank.ca')
    
    # Platform
    PLATFORM_FEE_PERCENTAGE: float = 5.0  # 5% platform fee
    
    # Geofencing
    ATTENDANCE_GEOFENCE_RADIUS_M: int = 100  # 100 meters for attendance
    JOB_MATCHING_RADIUS_KM_DEFAULT: int = 20  # 20km for job matching
    
    # Ontario Overtime Rules
    ONTARIO_OVERTIME_THRESHOLD_HOURS: int = 44
    ONTARIO_OVERTIME_RATE_MULTIPLIER: float = 1.5

settings = Settings()
