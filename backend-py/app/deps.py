from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import col
from app.serialize import oid
from app.utils import decode_token

bearer = HTTPBearer(auto_error=False)


async def load_user_from_token(token: str) -> dict | None:
    try:
        decoded = decode_token(token)
    except Exception:
        return None
    user_id = oid(decoded.get("id"))
    if not user_id:
        return None
    return await col.users.find_one({"_id": user_id}, {"password": 0})


async def optional_user(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> dict | None:
    token = creds.credentials if creds else None
    if not token:
        auth = request.headers.get("authorization") or ""
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        return None
    return await load_user_from_token(token)


async def require_user(user: Annotated[dict | None, Depends(optional_user)]) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authorized, no token")
    return user


async def require_admin(user: Annotated[dict, Depends(require_user)]) -> dict:
    if user.get("role") not in {"admin", "superadmin"}:
        raise HTTPException(status_code=401, detail="Not authorized as an admin")
    return user


async def require_superadmin(user: Annotated[dict, Depends(require_user)]) -> dict:
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=401, detail="Not authorized as a super admin")
    return user


def get_io(request: Request) -> Any:
    return getattr(request.app.state, "sio", None)


def get_notifier(request: Request):
    return request.app.state.notifier


def http_error(status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail=message)
