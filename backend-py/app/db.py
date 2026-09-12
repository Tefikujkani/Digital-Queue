from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import MONGODB_URI

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        if not MONGODB_URI:
            raise RuntimeError("MONGODB_URI mungon")
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client().get_default_database()
    return _db


async def ping() -> bool:
    try:
        await get_client().admin.command("ping")
        return True
    except Exception:
        return False


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


class Collections:
    @property
    def users(self):
        return get_db()["users"]

    @property
    def institutions(self):
        return get_db()["institutions"]

    @property
    def tickets(self):
        return get_db()["tickets"]

    @property
    def notifications(self):
        return get_db()["notifications"]

    @property
    def ratings(self):
        return get_db()["ratings"]

    @property
    def counters(self):
        return get_db()["counters"]

    @property
    def appsettings(self):
        return get_db()["appsettings"]

    @property
    def seqcounters(self):
        return get_db()["seqcounters"]


col = Collections()


async def ensure_indexes() -> None:
    db = get_db()
    await db["users"].create_index("email", unique=True)
    await db["tickets"].create_index([("institutionId", 1), ("status", 1), ("priorityRank", 1), ("createdAt", 1)])
    await db["tickets"].create_index("qrCode")
    await db["notifications"].create_index("userId")
    await db["notifications"].create_index("createdAt", expireAfterSeconds=30 * 24 * 60 * 60)
    await db["ratings"].create_index([("userId", 1), ("institutionId", 1)], unique=True)
    await db["seqcounters"].create_index("key", unique=True)
    await db["appsettings"].create_index("key", unique=True)
