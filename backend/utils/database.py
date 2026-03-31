"""MongoDB connection manager"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        name = os.getenv("DB_NAME", "log_analyzer")
        try:
            _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            _client.admin.command("ping")
            _db = _client[name]
            print(f"[DB] Connected to MongoDB: {name}")
        except ConnectionFailure as e:
            print(f"[DB] MongoDB connection failed: {e}")
            raise
    return _db


def get_collection(name: str):
    return get_db()[name]
