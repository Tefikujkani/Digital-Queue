"""Serialize Mongo documents the same way Mongoose JSON does."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId


def oid(value: Any) -> ObjectId | None:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    text = str(value).strip()
    if ObjectId.is_valid(text):
        return ObjectId(text)
    return None


def oid_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def to_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")
    if isinstance(value, list):
        return [to_json(item) for item in value]
    if isinstance(value, dict):
        return {key: to_json(item) for key, item in value.items()}
    return value


def public_user(user: dict | None) -> dict | None:
    if not user:
        return None
    prefs = user.get("notificationPrefs") or {
        "inApp": True,
        "email": True,
        "sms": False,
        "telegram": False,
        "viber": False,
        "whatsapp": False,
    }
    return {
        "_id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role") or "citizen",
        "institutionId": oid_str(user.get("institutionId")),
        "phone": user.get("phone"),
        "favorites": [str(fid) for fid in (user.get("favorites") or [])],
        "preferredCity": user.get("preferredCity") or "Prishtinë",
        "telegramChatId": user.get("telegramChatId") or "",
        "viberId": user.get("viberId") or "",
        "whatsappPhone": user.get("whatsappPhone") or "",
        "notificationPrefs": to_json(prefs),
    }


def public_ticket_view(ticket: dict) -> dict:
    return {
        "_id": str(ticket["_id"]),
        "number": ticket.get("number"),
        "status": ticket.get("status"),
        "priority": ticket.get("priority"),
        "priorityRank": ticket.get("priorityRank"),
        "counterId": ticket.get("counterId"),
        "estimatedWaitTime": ticket.get("estimatedWaitTime"),
        "scheduledAt": to_json(ticket.get("scheduledAt")),
        "calledAt": to_json(ticket.get("calledAt")),
        "createdAt": to_json(ticket.get("createdAt")),
        "institutionId": oid_str(ticket.get("institutionId")),
        "serviceId": ticket.get("serviceId"),
    }
