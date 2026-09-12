from __future__ import annotations

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Request

from app.config import MAX_SLOT_BOOKINGS, SLOT_MINUTES
from app.db import col
from app.deps import optional_user, require_admin, require_user
from app.errors import api_error
from app.serialize import oid, public_ticket_view, to_json
from pymongo import ReturnDocument

from app.utils import now_utc, parse_kosovo_local, priority_rank, random_hex, within_kosovo_working_hours

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


def assert_admin_institution(user, institution_id) -> bool:
    if user.get("role") == "superadmin":
        return True
    return user.get("role") == "admin" and str(user.get("institutionId")) == str(institution_id)


def find_service(institution, service_id):
    if not service_id:
        return None
    return next(
        (s for s in (institution.get("services") or []) if str(s.get("_id")) == str(service_id) or s.get("id") == service_id),
        None,
    )


async def next_ticket_sequence(institution_id) -> int:
    day = now_utc().strftime("%Y-%m-%d")
    key = f"ticket:{institution_id}:{day}"
    doc = await col.seqcounters.find_one_and_update(
        {"key": key}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return int((doc or {}).get("seq") or 1)


@router.get("/")
async def get_tickets(
    request: Request,
    user: Annotated[dict | None, Depends(optional_user)],
    institutionId: str | None = None,
    mine: str | None = None,
):
    filt: dict = {}
    if institutionId and oid(institutionId):
        filt["institutionId"] = oid(institutionId)

    if user and user.get("role") in {"admin", "superadmin"}:
        if user.get("role") == "admin" and user.get("institutionId"):
            filt["institutionId"] = user["institutionId"]
        rows = await col.tickets.find(filt).sort([("priorityRank", 1), ("createdAt", 1)]).to_list(500)
        return to_json(rows)

    if user and (mine == "1" or not institutionId):
        rows = await col.tickets.find({"userId": user["_id"]}).sort("createdAt", -1).to_list(200)
        return to_json(rows)

    if not institutionId:
        raise api_error(400, "institutionId është i detyrueshëm për listën publike")

    filt["status"] = {"$in": ["waiting", "called", "checked_in"]}
    rows = await col.tickets.find(
        filt,
        {
            "number": 1,
            "status": 1,
            "priority": 1,
            "priorityRank": 1,
            "counterId": 1,
            "estimatedWaitTime": 1,
            "scheduledAt": 1,
            "calledAt": 1,
            "createdAt": 1,
            "institutionId": 1,
            "serviceId": 1,
        },
    ).sort([("priorityRank", 1), ("createdAt", 1)]).to_list(400)
    return to_json(rows)


@router.get("/slots")
async def slots(institutionId: str | None = None, serviceId: str | None = None, date: str | None = None):
    if not institutionId or not date:
        raise api_error(400, "institutionId dhe date janë të detyrueshme")
    institution = await col.institutions.find_one({"_id": oid(institutionId)}) if oid(institutionId) else None
    if not institution:
        raise api_error(404, "Institucioni nuk u gjet")
    hours = institution.get("workingHours") or {}
    open_s = hours.get("open") or "08:00"
    close_s = hours.get("close") or "16:00"
    oh = int(open_s.split(":")[0])
    ch = int(close_s.split(":")[0])
    now_ms = now_utc().timestamp() * 1000
    out = []
    for h in range(oh, ch):
        for m in (0, 30):
            time = f"{h:02d}:{m:02d}"
            start = parse_kosovo_local(date[:10], time)
            if not start or not within_kosovo_working_hours(institution, start):
                continue
            end = start + timedelta(minutes=SLOT_MINUTES)
            q = {
                "institutionId": oid(institutionId),
                "scheduledAt": {"$gte": start, "$lt": end},
                "status": {"$nin": ["cancelled"]},
            }
            if serviceId:
                q["serviceId"] = serviceId
            booked = await col.tickets.count_documents(q)
            available = max(0, MAX_SLOT_BOOKINGS - booked)
            out.append({
                "time": time,
                "booked": booked,
                "capacity": MAX_SLOT_BOOKINGS,
                "available": available,
                "past": start.timestamp() * 1000 < now_ms - 60_000,
                "open": available > 0 and start.timestamp() * 1000 >= now_ms - 60_000,
            })
    return {"date": date, "slots": out, "capacity": MAX_SLOT_BOOKINGS}


@router.post("/")
async def issue(request: Request, user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    institution_id = body.get("institutionId")
    service_id = body.get("serviceId")
    if not institution_id or not service_id:
        raise api_error(400, "Institucioni dhe shërbimi janë të detyrueshëm")
    institution = await col.institutions.find_one({"_id": oid(institution_id)}) if oid(institution_id) else None
    if not institution or not institution.get("isActive", True):
        raise api_error(404, "Institucioni nuk u gjet ose është joaktiv")
    service = find_service(institution, service_id)
    if not service:
        raise api_error(400, "Shërbimi nuk u gjet për këtë institucion")
    service_name = service.get("name") or "Shërbim i Përgjithshëm"
    scheduled_at = None
    if body.get("scheduledDate") and body.get("scheduledTime"):
        scheduled_at = parse_kosovo_local(str(body["scheduledDate"])[:10], str(body["scheduledTime"])[:5])
        if not scheduled_at:
            raise api_error(400, "Data ose ora e terminit nuk është valide")
        if scheduled_at.timestamp() * 1000 < now_utc().timestamp() * 1000 - 60_000:
            raise api_error(400, "Termini nuk mund të jetë në të kaluarën")
        if not within_kosovo_working_hours(institution, scheduled_at):
            hours = institution.get("workingHours") or {}
            raise api_error(400, f"Jashtë orarit të punës ({hours.get('open') or '08:00'}–{hours.get('close') or '16:00'})")
        slot_end = scheduled_at + timedelta(minutes=SLOT_MINUTES)
        booked = await col.tickets.count_documents({
            "institutionId": institution["_id"],
            "serviceId": service_id,
            "scheduledAt": {"$gte": scheduled_at, "$lt": slot_end},
            "status": {"$nin": ["cancelled"]},
        })
        if booked >= MAX_SLOT_BOOKINGS:
            raise api_error(409, "Ky orar është i plotë. Zgjidh një orë tjetër.")
    seq = await next_ticket_sequence(institution["_id"])
    prio = body.get("priority") or "normal"
    prefix = {"emergency": "E", "elderly": "S", "disability": "D"}.get(prio, "N")
    number = f"{prefix}-{str(seq).zfill(3)}"
    qr = f"SQK:{institution['_id']}:{number}:{random_hex(8)}"
    waiting_ahead = await col.tickets.count_documents({"institutionId": institution["_id"], "status": "waiting"})
    now = now_utc()
    ticket = {
        "userId": user["_id"],
        "userName": str(body.get("userName") or user.get("name") or "Qytetar")[:80],
        "institutionId": institution["_id"],
        "serviceId": service_id,
        "number": number,
        "status": "waiting",
        "priority": prio,
        "priorityRank": priority_rank(prio),
        "qrCode": qr,
        "estimatedWaitTime": waiting_ahead * 5 + 5,
        "scheduledAt": scheduled_at,
        "remindersSent": {"reminder24h": False, "reminder2h": False},
        "createdAt": now,
        "updatedAt": now,
    }
    result = await col.tickets.insert_one(ticket)
    ticket["_id"] = result.inserted_id
    sio = request.app.state.sio
    if sio:
        await sio.emit("new_ticket", public_ticket_view(ticket), room=str(institution["_id"]))
    delivery = None
    try:
        notifier = request.app.state.notifier
        if scheduled_at:
            delivery = await notifier.appointment_booked(
                user["_id"],
                ticket,
                institution.get("name"),
                service_name,
                {
                    "notifySms": body.get("notifySms") is True,
                    "notifyWhatsApp": body.get("notifyWhatsApp") is not False,
                    "phone": body.get("phone") or user.get("whatsappPhone") or user.get("phone"),
                },
            )
        else:
            await notifier.ticket_issued(user["_id"], ticket, institution.get("name"), service_name)
    except Exception as err:
        print("Ticket notify failed:", err)
    if scheduled_at:
        deliv = (delivery or {}).get("delivery") if isinstance(delivery, dict) else None
        if delivery and isinstance(delivery, dict) and "delivery" not in delivery:
            deliv = delivery.get("delivery") if False else {"delivered": bool((delivery or {}).get("delivery", {}).get("delivered") if isinstance(delivery.get("delivery"), dict) else False)}
        # Node returns notification.delivery from appointmentBooked which returns notify() doc with .delivery
        raw_delivery = None
        if isinstance(delivery, dict):
            raw_delivery = delivery.get("delivery")
        return {
            **to_json(ticket),
            "notification": {
                "type": "appointment",
                "whatsapp": body.get("notifyWhatsApp") is not False,
                "smsRequested": body.get("notifySms") is True,
                "delivered": bool((raw_delivery or {}).get("delivered")),
                "sent": bool((raw_delivery or {}).get("delivered")),
                "via": (raw_delivery or {}).get("via") or ("whatsapp_link" if (raw_delivery or {}).get("shareLink") else None),
                "shareLink": (raw_delivery or {}).get("shareLink"),
                "delivery": raw_delivery,
            },
        }
    return to_json(ticket)


@router.post("/call-next")
async def call_next(request: Request, user: Annotated[dict, Depends(require_admin)], body: dict = Body(...)):
    institution_id = body.get("institutionId")
    if not institution_id:
        raise api_error(400, "institutionId është i detyrueshëm")
    if not assert_admin_institution(user, institution_id):
        raise api_error(403, "Nuk ke qasje në këtë institucion")
    ticket = await col.tickets.find_one(
        {"institutionId": oid(institution_id), "status": {"$in": ["waiting", "checked_in"]}},
        sort=[("priorityRank", 1), ("createdAt", 1)],
    )
    if not ticket:
        raise api_error(404, "Nuk ka qytetarë në pritje")
    now = now_utc()
    await col.tickets.update_one(
        {"_id": ticket["_id"]},
        {"$set": {"status": "called", "counterId": body.get("counterId"), "calledAt": now, "updatedAt": now}},
    )
    ticket["status"] = "called"
    ticket["counterId"] = body.get("counterId")
    ticket["calledAt"] = now
    sio = request.app.state.sio
    if sio:
        await sio.emit("ticket_updated", public_ticket_view(ticket), room=str(institution_id))
        await sio.emit("ticket_updated", to_json(ticket), room=f"user_{ticket.get('userId')}")
    institution = await col.institutions.find_one({"_id": oid(institution_id)})
    await request.app.state.notifier.ticket_called(ticket.get("userId"), ticket, (institution or {}).get("name") or "Institucioni")
    return to_json(ticket)


@router.post("/check-in")
async def check_in(request: Request, user: Annotated[dict, Depends(require_admin)], body: dict = Body(...)):
    qr = str(body.get("qrCode") or "").strip()
    if not qr:
        raise api_error(400, "qrCode mungon")
    ticket = await col.tickets.find_one({"qrCode": qr})
    if not ticket:
        raise api_error(404, "QR i pavlefshëm")
    inst_id = body.get("institutionId") or ticket.get("institutionId")
    if not assert_admin_institution(user, inst_id):
        raise api_error(403, "Nuk ke qasje në këtë institucion")
    if str(ticket.get("institutionId")) != str(inst_id):
        raise api_error(400, "Bileta nuk i përket këtij institucioni")
    if ticket.get("status") in {"completed", "cancelled"}:
        raise api_error(400, f"Bileta është {ticket.get('status')}")
    now = now_utc()
    await col.tickets.update_one({"_id": ticket["_id"]}, {"$set": {"status": "checked_in", "checkedInAt": now, "updatedAt": now}})
    ticket["status"] = "checked_in"
    ticket["checkedInAt"] = now
    sio = request.app.state.sio
    if sio:
        await sio.emit("ticket_updated", public_ticket_view(ticket), room=str(ticket.get("institutionId")))
    return {"message": "Check-in u krye", "ticket": to_json(ticket)}


@router.put("/{id}/status")
async def update_status(id: str, request: Request, user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    status = body.get("status")
    if status not in {"waiting", "called", "completed", "cancelled", "checked_in"}:
        raise api_error(400, "Status i pavlefshëm")
    ticket = await col.tickets.find_one({"_id": oid(id)}) if oid(id) else None
    if not ticket:
        raise api_error(404, "Bileta nuk u gjet")
    is_owner = str(ticket.get("userId")) == str(user["_id"])
    is_staff = assert_admin_institution(user, ticket.get("institutionId"))
    if status == "cancelled":
        if not is_owner and not is_staff:
            raise api_error(403, "Nuk mund ta anulosh këtë biletë")
        if is_owner and ticket.get("status") not in {"waiting", "checked_in"}:
            raise api_error(400, "Bileta nuk mund të anulohet në këtë status")
    elif status in {"completed", "called", "checked_in", "waiting"} and not is_staff:
        raise api_error(403, "Vetëm stafi i institucionit mund ta ndryshojë")
    now = now_utc()
    updates = {"status": status, "updatedAt": now}
    if status == "completed":
        updates["completedAt"] = now
    if status == "checked_in":
        updates["checkedInAt"] = now
    await col.tickets.update_one({"_id": ticket["_id"]}, {"$set": updates})
    ticket.update(updates)
    sio = request.app.state.sio
    if sio:
        await sio.emit("ticket_updated", public_ticket_view(ticket), room=str(ticket.get("institutionId")))
    if status == "completed":
        await request.app.state.notifier.ticket_completed(ticket.get("userId"), ticket)
    return to_json(ticket)
