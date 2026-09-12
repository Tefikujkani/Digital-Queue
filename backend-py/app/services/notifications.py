from __future__ import annotations

from app.db import col
from app.serialize import oid, to_json
from app.services.email import send_email, ticket_called_email, ticket_completed_email, ticket_issued_email
from app.services.sms import (
    build_appointment_sms,
    build_appointment_whatsapp,
    deliver_smart_message,
    send_sms,
    send_via_telegram,
    send_via_viber,
    send_via_whatsapp,
)
from app.services.whatsapp import to_e164_kosovo
from app.utils import format_appointment_local, now_utc


class NotificationService:
    def __init__(self, sio):
        self.sio = sio

    async def notify(self, user_id, ntype, title, message, data=None, channels=None):
        data = data or {}
        channels = channels or {}
        user = await col.users.find_one({"_id": oid(user_id)})
        prefs = (user or {}).get("notificationPrefs") or {"inApp": True, "email": True, "sms": False}

        force_sms = channels.get("forceSms") is True
        in_app = channels.get("inApp") is not False and prefs.get("inApp") is not False
        wants_telegram = bool((user or {}).get("telegramChatId")) and prefs.get("telegram") is not False
        wants_viber = bool((user or {}).get("viberId")) and prefs.get("viber") is not False
        wa_phone = data.get("phoneOverride") or (user or {}).get("whatsappPhone") or (user or {}).get("phone")
        force_whatsapp = channels.get("forceWhatsApp") is not False and str(ntype).startswith("appointment_")
        wants_whatsapp = (force_whatsapp and bool(wa_phone)) or (
            bool((user or {}).get("whatsappPhone")) and prefs.get("whatsapp") is not False
        )
        sms = (bool(channels.get("sms")) and prefs.get("sms") is True) or (
            force_sms and bool((user or {}).get("phone") or data.get("phoneOverride"))
        )
        has_email = bool((user or {}).get("email"))
        email = bool(channels.get("email")) and prefs.get("email") is not False and has_email
        smart = str(ntype).startswith("appointment_") and (
            sms or wants_telegram or wants_viber or wants_whatsapp or force_sms or force_whatsapp
        )

        doc = {
            "userId": oid(user_id),
            "type": ntype,
            "title": title,
            "message": message,
            "data": data,
            "read": False,
            "channels": {"inApp": in_app, "email": email, "sms": sms or wants_telegram or wants_viber or wants_whatsapp},
            "createdAt": now_utc(),
            "updatedAt": now_utc(),
        }
        result = await col.notifications.insert_one(doc)
        doc["_id"] = result.inserted_id

        if in_app and self.sio:
            await self.sio.emit(
                "notification",
                {
                    "id": str(doc["_id"]),
                    "type": ntype,
                    "title": title,
                    "message": message,
                    "data": to_json(data),
                    "read": False,
                    "createdAt": to_json(doc["createdAt"]),
                },
                room=f"user_{user_id}",
            )

        if email and user and user.get("email"):
            try:
                if ntype in {"ticket_issued", "appointment_booked"}:
                    content = ticket_issued_email(
                        user.get("name"),
                        data.get("ticketNumber"),
                        data.get("institutionName"),
                        data.get("scheduledAt"),
                        data.get("serviceName"),
                    )
                elif ntype == "ticket_called":
                    content = ticket_called_email(user.get("name"), data.get("ticketNumber"), data.get("counterId"))
                elif ntype == "ticket_completed":
                    content = ticket_completed_email(user.get("name"), data.get("ticketNumber"))
                elif ntype == "appointment_reminder":
                    content = {"subject": title, "html": f"<div style='font-family:sans-serif;padding:24px'><h2>{title}</h2><p>{message}</p></div>"}
                else:
                    content = {"subject": title, "html": f"<p>{message}</p>"}
                await send_email(user["email"], content["subject"], content["html"])
            except Exception as err:
                print("Email notification failed:", err)

        if smart:
            phone = data.get("phoneOverride") or (user or {}).get("phone")
            try:
                delivery = await deliver_smart_message(
                    phone=phone if sms else None,
                    email=(user or {}).get("email"),
                    telegram_chat_id=(user or {}).get("telegramChatId") if wants_telegram else None,
                    viber_id=(user or {}).get("viberId") if wants_viber else None,
                    whatsapp_phone=wa_phone if wants_whatsapp else None,
                    body=message,
                    subject=f"📱 {title}",
                )
                await col.notifications.update_one({"_id": doc["_id"]}, {"$set": {"delivery": delivery}})
                doc["delivery"] = delivery
            except Exception as err:
                print("Smart delivery failed:", err)
        elif sms:
            phone = data.get("phoneOverride") or (user or {}).get("phone")
            try:
                if phone:
                    await send_sms(phone, message)
            except Exception as err:
                print("SMS notification failed:", err)

        if not smart and ntype == "ticket_called":
            try:
                if wants_telegram:
                    await send_via_telegram(user.get("telegramChatId"), message)
                if wants_whatsapp:
                    await send_via_whatsapp(user.get("whatsappPhone"), message)
                if wants_viber:
                    await send_via_viber(user.get("viberId"), message)
            except Exception as err:
                print("Messenger notify failed:", err)

        return doc

    async def ticket_issued(self, user_id, ticket, institution_name, service_name):
        if ticket.get("scheduledAt"):
            return await self.appointment_booked(user_id, ticket, institution_name, service_name)
        return await self.notify(
            user_id,
            "ticket_issued",
            "Biletë e Re",
            f"Bileta {ticket.get('number')} u lëshua për {institution_name}.",
            {
                "ticketId": str(ticket["_id"]),
                "ticketNumber": ticket.get("number"),
                "institutionId": str(ticket.get("institutionId")),
                "institutionName": institution_name,
                "serviceName": service_name,
                "scheduledAt": ticket.get("scheduledAt"),
            },
            {"inApp": True, "email": True, "sms": True},
        )

    async def appointment_booked(self, user_id, ticket, institution_name, service_name, opts=None):
        opts = opts or {}
        user = await col.users.find_one({"_id": oid(user_id)})
        phone = opts.get("phone") or (user or {}).get("whatsappPhone") or (user or {}).get("phone")
        e164 = to_e164_kosovo(phone)
        wa_body = build_appointment_whatsapp(
            (user or {}).get("name") or ticket.get("userName"),
            ticket.get("number"),
            institution_name,
            service_name,
            ticket.get("scheduledAt"),
        )
        date_str, time_str = format_appointment_local(ticket.get("scheduledAt"))
        if user and e164:
            prefs = dict(user.get("notificationPrefs") or {})
            prefs["whatsapp"] = True
            prefs["inApp"] = True
            prefs["sms"] = opts.get("notifySms") is True or prefs.get("sms")
            await col.users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "phone": user.get("phone") or e164,
                        "whatsappPhone": user.get("whatsappPhone") or e164,
                        "notificationPrefs": prefs,
                    }
                },
            )
        return await self.notify(
            user_id,
            "appointment_booked",
            "Termini u konfirmua në WhatsApp",
            wa_body,
            {
                "ticketId": str(ticket["_id"]),
                "ticketNumber": ticket.get("number"),
                "institutionId": str(ticket.get("institutionId")),
                "institutionName": institution_name,
                "serviceName": service_name,
                "scheduledAt": ticket.get("scheduledAt"),
                "dateStr": date_str,
                "timeStr": time_str,
                "phoneOverride": e164 or phone,
            },
            {
                "inApp": True,
                "email": bool((user or {}).get("email")),
                "sms": True,
                "forceSms": True,
                "forceWhatsApp": opts.get("notifyWhatsApp") is not False,
            },
        )

    async def appointment_reminder(self, user_id, ticket, institution_name, service_name):
        sms_body = build_appointment_sms(
            ticket.get("number"), institution_name, service_name, ticket.get("scheduledAt"), "reminder"
        )
        return await self.notify(
            user_id,
            "appointment_reminder",
            "Kujtesë termini",
            sms_body,
            {
                "ticketId": str(ticket["_id"]),
                "ticketNumber": ticket.get("number"),
                "institutionId": str(ticket.get("institutionId")),
                "institutionName": institution_name,
                "serviceName": service_name,
                "scheduledAt": ticket.get("scheduledAt"),
            },
            {"inApp": True, "email": True, "sms": True, "forceSms": True},
        )

    async def ticket_called(self, user_id, ticket, institution_name):
        return await self.notify(
            user_id,
            "ticket_called",
            "Radha Juaj!",
            f"Numri {ticket.get('number')} u thirr te sporteli {ticket.get('counterId')}.",
            {
                "ticketId": str(ticket["_id"]),
                "ticketNumber": ticket.get("number"),
                "institutionId": str(ticket.get("institutionId")),
                "institutionName": institution_name,
                "counterId": ticket.get("counterId"),
            },
            {"inApp": True, "email": True, "sms": True, "forceSms": True},
        )

    async def ticket_completed(self, user_id, ticket):
        return await self.notify(
            user_id,
            "ticket_completed",
            "Shërbimi Përfundoi",
            f"Bileta {ticket.get('number')} u përfundua me sukses.",
            {"ticketId": str(ticket["_id"]), "ticketNumber": ticket.get("number")},
            {"inApp": True, "email": True},
        )
