from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Request

from app.db import col
from app.deps import require_admin, require_superadmin, require_user
from app.errors import api_error
from app.serialize import oid, to_json
from app.utils import now_utc

router = APIRouter(prefix="/api/institutions", tags=["institutions"])


@router.get("/")
async def list_institutions(city: str | None = None, type: str | None = None, q: str | None = None):
    filt: dict = {"isActive": True}
    if city:
        filt["location.city"] = {"$regex": city.strip(), "$options": "i"}
    if type and type != "all":
        filt["type"] = type
    if q:
        query = q.strip()
        filt["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"location.city": {"$regex": query, "$options": "i"}},
            {"location.address": {"$regex": query, "$options": "i"}},
            {"services.name": {"$regex": query, "$options": "i"}},
        ]
    rows = await col.institutions.find(filt).sort([("ratingAvg", -1), ("name", 1)]).to_list(400)
    return to_json(rows)


@router.get("/all")
async def all_institutions(_: Annotated[dict, Depends(require_superadmin)]):
    rows = await col.institutions.find({}).to_list(800)
    return to_json(rows)


@router.get("/{id}")
async def get_one(id: str):
    inst = await col.institutions.find_one({"_id": oid(id)}) if oid(id) else None
    if not inst:
        raise api_error(404, "Institution not found")
    return to_json(inst)


@router.get("/{id}/services")
async def services(id: str):
    inst = await col.institutions.find_one({"_id": oid(id)}) if oid(id) else None
    if not inst:
        raise api_error(404, "Institution not found")
    return to_json(inst.get("services") or [])


@router.get("/{id}/counters")
async def counters(id: str, _: Annotated[dict, Depends(require_user)]):
    rows = await col.counters.find({"institutionId": oid(id)}).to_list(100)
    return to_json(rows)


@router.get("/{id}/analytics")
async def analytics(id: str, _: Annotated[dict, Depends(require_admin)]):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    inst_id = oid(id)
    today = await col.tickets.count_documents({"institutionId": inst_id, "createdAt": {"$gte": start}})
    completed = await col.tickets.count_documents({"institutionId": inst_id, "status": "completed", "createdAt": {"$gte": start}})
    cancelled = await col.tickets.count_documents({"institutionId": inst_id, "status": "cancelled", "createdAt": {"$gte": start}})
    return {
        "todayTickets": today,
        "completedToday": completed,
        "cancelledToday": cancelled,
        "peakHoursData": [
            {"hour": "08:00", "count": 12},
            {"hour": "10:00", "count": 45},
            {"hour": "12:00", "count": 30},
            {"hour": "14:00", "count": 55},
            {"hour": "16:00", "count": 20},
        ],
    }


@router.post("/")
async def create(user: Annotated[dict, Depends(require_admin)], body: dict = Body(...)):
    if not body.get("name") or not body.get("type") or not body.get("workingHours"):
        raise api_error(400, "Emri, tipi dhe orari i punes jane te detyrueshem")
    now = now_utc()
    doc = {
        "name": body["name"],
        "type": body["type"],
        "location": body.get("location") or {},
        "services": body.get("services") or [],
        "workingHours": body["workingHours"],
        "logo": body.get("logo"),
        "isActive": body.get("isActive", True),
        "adminId": user["_id"],
        "ratingAvg": 0,
        "ratingCount": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await col.institutions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return to_json(doc)


@router.put("/{id}/status")
async def update_status(id: str, _: Annotated[dict, Depends(require_superadmin)], body: dict = Body(...)):
    inst = await col.institutions.find_one({"_id": oid(id)}) if oid(id) else None
    if not inst:
        raise api_error(404, "Institution not found")
    await col.institutions.update_one({"_id": inst["_id"]}, {"$set": {"isActive": body.get("isActive"), "updatedAt": now_utc()}})
    inst["isActive"] = body.get("isActive")
    return to_json(inst)
