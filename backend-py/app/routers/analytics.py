from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import col
from app.deps import require_admin
from app.serialize import oid

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/{id}")
async def institution_stats(id: str, _: Annotated[dict, Depends(require_admin)]):
    institution_id = oid(id)
    stats = await col.tickets.aggregate([
        {"$match": {"institutionId": institution_id}},
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "avgWaitTime": {
                    "$avg": {
                        "$cond": [
                            {"$and": ["$calledAt", "$createdAt"]},
                            {"$subtract": ["$calledAt", "$createdAt"]},
                            None,
                        ]
                    }
                },
            }
        },
    ]).to_list(20)
    daily = await col.tickets.aggregate([
        {"$match": {"institutionId": institution_id}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 7},
    ]).to_list(7)
    return {"summary": stats, "dailyVolume": daily}
