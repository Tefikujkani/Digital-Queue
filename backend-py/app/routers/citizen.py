from __future__ import annotations

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query

from app.db import col
from app.deps import require_admin, require_user
from app.errors import api_error
from app.serialize import oid, to_json
from app.services.sms import get_free_notify_status, get_sms_provider_status
from app.utils import now_utc

router = APIRouter(prefix="/api/citizen", tags=["citizen"])

KOSOVO_ORDER = [
    "Prishtinë", "Prizren", "Pejë", "Gjakovë", "Mitrovicë", "Gjilan",
    "Ferizaj", "Fushë Kosovë", "Podujevë", "Vushtrri",
]


@router.get("/cities")
async def cities():
    pipeline = [
        {"$match": {"isActive": True, "location.city": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$location.city", "count": {"$sum": 1}, "types": {"$addToSet": "$type"}, "sampleLat": {"$first": "$location.lat"}, "sampleLng": {"$first": "$location.lng"}}},
        {"$sort": {"count": -1, "_id": 1}},
    ]
    rows = await col.institutions.aggregate(pipeline).to_list(100)
    cities_out = [{"name": r["_id"], "count": r["count"], "types": r.get("types"), "lat": r.get("sampleLat"), "lng": r.get("sampleLng")} for r in rows]

    def key(c):
        try:
            return KOSOVO_ORDER.index(c["name"])
        except ValueError:
            return 1000 + (-c["count"])

    cities_out.sort(key=key)
    return {"cities": cities_out, "totalInstitutions": sum(c["count"] for c in cities_out)}


@router.get("/wait-stats")
async def batch_wait(ids: str = ""):
    raw = [s.strip() for s in ids.split(",") if s.strip()][:50]
    if not raw:
        return {}
    object_ids = [oid(i) for i in raw if oid(i)]
    agg = await col.tickets.aggregate([
        {"$match": {"institutionId": {"$in": object_ids}, "status": "waiting"}},
        {"$group": {"_id": "$institutionId", "waiting": {"$sum": 1}}},
    ]).to_list(50)
    out = {}
    for row in agg:
        waiting = row["waiting"]
        out[str(row["_id"])] = {
            "waiting": waiting,
            "estimatedWaitMinutes": waiting * 5,
            "load": "low" if waiting <= 3 else "medium" if waiting <= 10 else "high",
        }
    for i in raw:
        out.setdefault(i, {"waiting": 0, "estimatedWaitMinutes": 0, "load": "low"})
    return out


@router.get("/wait-stats/{id}")
async def wait_one(id: str):
    institution = await col.institutions.find_one({"_id": oid(id)}) if oid(id) else None
    if not institution or not institution.get("isActive", True):
        raise api_error(404, "Institucioni nuk u gjet")
    waiting = await col.tickets.count_documents({"institutionId": institution["_id"], "status": "waiting"})
    called = await col.tickets.count_documents({"institutionId": institution["_id"], "status": "called"})
    since = now_utc() - timedelta(days=7)
    completed = await col.tickets.find(
        {"institutionId": institution["_id"], "status": "completed", "completedAt": {"$gte": since}, "calledAt": {"$exists": True}},
        {"createdAt": 1, "calledAt": 1, "completedAt": 1},
    ).to_list(200)
    avg = 0
    if completed:
        total = 0
        for t in completed:
            start = t["createdAt"].timestamp() if hasattr(t["createdAt"], "timestamp") else 0
            end = (t.get("calledAt") or t.get("completedAt")).timestamp()
            total += max(0, (end - start) / 60)
        avg = round(total / len(completed))
    services = institution.get("services") or []
    avg_service = (sum(s.get("estimatedTime") or 5 for s in services) / max(len(services), 1)) if services else 5
    estimated = round(waiting * avg_service)
    load = "low" if waiting <= 3 else "medium" if waiting <= 10 else "high"
    buckets = [{"hour": 8 + i, "count": 0} for i in range(12)]
    for t in completed:
        h = t["createdAt"].hour if hasattr(t["createdAt"], "hour") else 0
        for b in buckets:
            if b["hour"] == h:
                b["count"] += 1
    quietest = sorted(buckets, key=lambda b: b["count"])[0]
    return {
        "institutionId": str(institution["_id"]),
        "name": institution.get("name"),
        "waiting": waiting,
        "called": called,
        "estimatedWaitMinutes": estimated,
        "avgWaitMinutes": avg or estimated,
        "load": load,
        "ratingAvg": institution.get("ratingAvg") or 0,
        "ratingCount": institution.get("ratingCount") or 0,
        "bestHourHint": f"{quietest['hour']:02d}:00–{quietest['hour'] + 1:02d}:00",
        "peakHours": buckets,
        "updatedAt": now_utc().isoformat(),
    }


@router.get("/ratings/{id}")
async def ratings(id: str):
    rows = await col.ratings.find({"institutionId": oid(id)}).sort("createdAt", -1).to_list(20) if oid(id) else []
    institution = await col.institutions.find_one({"_id": oid(id)}, {"ratingAvg": 1, "ratingCount": 1, "name": 1}) if oid(id) else None
    reviews = []
    for r in rows:
        user = await col.users.find_one({"_id": r.get("userId")}, {"name": 1})
        reviews.append({
            "id": str(r["_id"]),
            "score": r.get("score"),
            "comment": r.get("comment"),
            "userName": (user or {}).get("name") or "Qytetar",
            "createdAt": to_json(r.get("createdAt")),
        })
    return {
        "ratingAvg": (institution or {}).get("ratingAvg") or 0,
        "ratingCount": (institution or {}).get("ratingCount") or 0,
        "reviews": reviews,
    }


@router.post("/ratings")
async def create_rating(user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    institution_id = body.get("institutionId")
    score = body.get("score")
    if not institution_id or not score or score < 1 or score > 5:
        raise api_error(400, "institutionId dhe score (1-5) janë të detyrueshme")
    institution = await col.institutions.find_one({"_id": oid(institution_id)}) if oid(institution_id) else None
    if not institution:
        raise api_error(404, "Institucioni nuk u gjet")
    if body.get("ticketId"):
        ticket = await col.tickets.find_one({"_id": oid(body["ticketId"])})
        if not ticket or str(ticket.get("userId")) != str(user["_id"]):
            raise api_error(403, "Ticket i pavlefshëm")
    now = now_utc()
    rating = await col.ratings.find_one_and_update(
        {"userId": user["_id"], "institutionId": institution["_id"]},
        {"$set": {"score": int(score), "comment": str(body.get("comment") or "")[:500] if body.get("comment") else None, "ticketId": oid(body.get("ticketId")) if body.get("ticketId") else None, "updatedAt": now}, "$setOnInsert": {"createdAt": now}},
        upsert=True,
        return_document=True,
    )
    stats = await col.ratings.aggregate([
        {"$match": {"institutionId": institution["_id"]}},
        {"$group": {"_id": "$institutionId", "avg": {"$avg": "$score"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    avg = round((stats[0]["avg"] if stats else 0) * 10) / 10
    count = stats[0]["count"] if stats else 0
    await col.institutions.update_one({"_id": institution["_id"]}, {"$set": {"ratingAvg": avg, "ratingCount": count}})
    return {"rating": to_json(rating), "ratingAvg": avg, "ratingCount": count}


@router.get("/notify-channels")
async def notify_channels():
    return get_free_notify_status()


@router.get("/sms-providers")
async def sms_providers(_: Annotated[dict, Depends(require_admin)]):
    return get_sms_provider_status()
