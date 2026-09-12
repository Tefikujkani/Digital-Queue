from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import col
from app.deps import require_user
from app.errors import api_error
from app.serialize import oid, to_json

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(user: Annotated[dict, Depends(require_user)]):
    rows = await col.notifications.find({"userId": user["_id"]}).sort("createdAt", -1).to_list(50)
    unread = await col.notifications.count_documents({"userId": user["_id"], "read": False})
    return {"notifications": to_json(rows), "unreadCount": unread}


@router.put("/read-all")
async def read_all(user: Annotated[dict, Depends(require_user)]):
    await col.notifications.update_many({"userId": user["_id"], "read": False}, {"$set": {"read": True}})
    return {"message": "Të gjitha njoftimet u shënuan si të lexuara"}


@router.put("/{id}/read")
async def read_one(id: str, user: Annotated[dict, Depends(require_user)]):
    doc = await col.notifications.find_one_and_update(
        {"_id": oid(id), "userId": user["_id"]},
        {"$set": {"read": True}},
        return_document=True,
    ) if oid(id) else None
    if not doc:
        raise api_error(404, "Njoftimi nuk u gjet")
    return to_json(doc)
