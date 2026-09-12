from __future__ import annotations

import asyncio
from datetime import timedelta

from app.db import col
from app.serialize import oid
from app.services.notifications import NotificationService
from app.utils import now_utc


async def start_appointment_reminder_job(sio) -> None:
    notifier = NotificationService(sio)

    async def run():
        try:
            now = now_utc()
            windows = [
                {"key": "reminder24h", "min": timedelta(hours=23), "max": timedelta(hours=25)},
                {"key": "reminder2h", "min": timedelta(minutes=90), "max": timedelta(minutes=150)},
            ]
            for w in windows:
                tickets = await col.tickets.find(
                    {
                        "status": "waiting",
                        "scheduledAt": {"$gte": now + w["min"], "$lte": now + w["max"]},
                        f"remindersSent.{w['key']}": {"$ne": True},
                    }
                ).to_list(50)
                for ticket in tickets:
                    institution = await col.institutions.find_one({"_id": oid(ticket.get("institutionId"))})
                    service = None
                    for s in (institution or {}).get("services") or []:
                        if str(s.get("_id")) == str(ticket.get("serviceId")) or s.get("id") == ticket.get("serviceId"):
                            service = s
                            break
                    await notifier.appointment_reminder(
                        ticket.get("userId"),
                        ticket,
                        (institution or {}).get("name") or "Institucioni",
                        (service or {}).get("name") or "Shërbim",
                    )
                    await col.tickets.update_one(
                        {"_id": ticket["_id"]},
                        {"$set": {f"remindersSent.{w['key']}": True}},
                    )
                    print(f"⏰ Reminder {w['key']} → ticket {ticket.get('number')}")
        except Exception as err:
            print("Reminder job error:", err)

    async def loop():
        await asyncio.sleep(15)
        while True:
            await run()
            await asyncio.sleep(5 * 60)

    asyncio.create_task(loop())
    print("⏰ Appointment reminder job started (24h + 2h, every 5 min)")
