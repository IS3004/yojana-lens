from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None


async def connect_db():
    """Connect to MongoDB on app startup."""
    global client
    client = AsyncIOMotorClient(settings.mongodb_url)
    print(f"✅ Connected to MongoDB: {settings.mongodb_url}")


async def close_db():
    """Close MongoDB connection on app shutdown."""
    global client
    if client:
        client.close()
        print("🔌 Disconnected from MongoDB")


def get_database():
    """Return the database instance."""
    return client[settings.db_name]


def get_collection(name: str):
    """Return a specific collection."""
    return get_database()[name]
