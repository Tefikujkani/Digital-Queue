from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends

from app.db import col
from app.deps import require_user
from app.errors import api_error
from app.serialize import oid, to_json
from app.utils import now_utc

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("/")
async def get_favorites(user: Annotated[dict, Depends(require_user)]):
    ids = user.get("favorites") or []
    if not ids:
        return []
    rows = await col.institutions.find({"_id": {"$in": ids}, "isActive": True}).to_list(100)
    return to_json(rows)


@router.put("/prefs")
async def update_prefs(user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    updates: dict = {"updatedAt": now_utc()}
    if body.get("preferredCity") is not None:
        updates["preferredCity"] = str(body["preferredCity"])[:80]
    if body.get("telegramChatId") is not None:
        updates["telegramChatId"] = str(body["telegramChatId"]).strip()[:64]
    if body.get("notificationPrefs"):
        prev = user.get("notificationPrefs") or {}
        np = body["notificationPrefs"]
        updates["notificationPrefs"] = {
            "inApp": np.get("inApp", prev.get("inApp", True)),
            "email": np.get("email", prev.get("email", True)),
            "sms": np.get("sms", prev.get("sms", False)),
            "telegram": np.get("telegram", prev.get("telegram", False)),
            "viber": np.get("viber", prev.get("viber", False)),
            "whatsapp": np.get("whatsapp", prev.get("whatsapp", False)),
        }
    await col.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await col.users.find_one({"_id": user["_id"]}, {"password": 0})
    return {
        "preferredCity": (fresh or {}).get("preferredCity"),
        "telegramChatId": (fresh or {}).get("telegramChatId"),
        "viberId": (fresh or {}).get("viberId"),
        "whatsappPhone": (fresh or {}).get("whatsappPhone"),
        "notificationPrefs": (fresh or {}).get("notificationPrefs"),
        "favorites": [str(x) for x in (fresh or {}).get("favorites") or []],
    }


@router.post("/{institutionId}/toggle")
async def toggle(institutionId: str, user: Annotated[dict, Depends(require_user)]):
    institution = await col.institutions.find_one({"_id": oid(institutionId)}) if oid(institutionId) else None
    if not institution or not institution.get("isActive", True):
        raise api_error(404, "Institucioni nuk u gjet")
    favorites = [str(x) for x in (user.get("favorites") or [])]
    favorited = False
    if institutionId in favorites:
        favorites = [x for x in favorites if x != institutionId]
    else:
        favorites.append(str(institution["_id"]))
        favorited = True
    await col.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"favorites": [oid(x) for x in favorites if oid(x)], "updatedAt": now_utc()}},
    )
    return {
        "favorited": favorited,
        "favorites": favorites,
        "message": "U shtua te të preferuarat" if favorited else "U hoq nga të preferuarat",
    }
