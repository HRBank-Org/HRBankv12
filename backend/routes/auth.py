from fastapi import APIRouter, HTTPException
from models import User, UserCreate, UserLogin
from database import get_database
import logging
from passlib.context import CryptContext

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/signup")
async def signup(user_data: UserCreate):
    """
    Register a new user
    """
    try:
        db = await get_database()
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            user_type=user_data.user_type,
            password_hash=hash_password(user_data.password)
        )
        
        # Save to database
        await db.users.insert_one(user.dict())
        
        # Return user without password
        user_dict = user.dict()
        del user_dict['password_hash']
        
        return {"message": "User created successfully", "user": user_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during signup: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.post("/login")
async def login(credentials: UserLogin):
    """
    Login user
    """
    try:
        db = await get_database()
        
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not verify_password(credentials.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify user type
        if user['user_type'] != credentials.user_type:
            raise HTTPException(status_code=401, detail="Invalid user type")
        
        # Return user without password
        user_dict = dict(user)
        del user_dict['password_hash']
        del user_dict['_id']
        
        return {"message": "Login successful", "user": user_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")
