from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'hrbank_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def get_database():
    return db
