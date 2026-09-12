from __future__ import annotations

import socketio

from app.config import CLIENT_URL, IS_PROD
from app.db import col
from app.serialize import oid
from app.utils import decode_token

origins = [CLIENT_URL, "http://localhost:5173", "http://localhost:5178"] if not IS_PROD else [CLIENT_URL]

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=origins,
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ, auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        header = (environ.get("HTTP_AUTHORIZATION") or "").replace("Bearer ", "")
        token = header or None
    if not token:
        await sio.save_session(sid, {"guest": True})
        print(f"⚡ Guest connected: {sid}")
        return True
    try:
        decoded = decode_token(token)
        user = await col.users.find_one({"_id": oid(decoded.get("id"))}, {"password": 0})
        if not user:
            return False
        await sio.save_session(sid, {"user": user})
        await sio.enter_room(sid, f"user_{user['_id']}")
        print(f"⚡ {user.get('email')} connected: {sid}")
        return True
    except Exception:
        return False


@sio.event
async def join_institution(sid, institution_id):
    if institution_id:
        await sio.enter_room(sid, str(institution_id))


@sio.event
async def join_user(sid, user_id):
    session = await sio.get_session(sid)
    user = session.get("user")
    if user and str(user["_id"]) == str(user_id):
        await sio.enter_room(sid, f"user_{user_id}")


@sio.event
async def leave_institution(sid, institution_id):
    if institution_id:
        await sio.leave_room(sid, str(institution_id))


@sio.event
async def disconnect(sid):
    print(f"❌ Client disconnected: {sid}")
