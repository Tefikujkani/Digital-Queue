from __future__ import annotations

import httpx

from app.config import (
    INFOBIP_API_KEY,
    INFOBIP_BASE_URL,
    INFOBIP_SENDER,
    SMS_GATEWAY_TOKEN,
    SMS_GATEWAY_URL,
    SMS_PROVIDER_ORDER,
    TELEGRAM_BOT_TOKEN,
    TEXTBEE_API_KEY,
    TEXTBEE_DEVICE_ID,
    TEXTBELT_KEY,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_PHONE_NUMBER,
    VIBER_AUTH_TOKEN,
    VIBER_BOT_URI,
    VONAGE_API_KEY,
    VONAGE_API_SECRET,
    VONAGE_FROM,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_TOKEN,
    SMTP_USER,
    configured,
)
from app.services.email import send_email
from app.utils import to_e164_kosovo


def get_provider_order() -> list[str]:
    return [s.strip().lower() for s in SMS_PROVIDER_ORDER.split(",") if s.strip()]


def get_sms_provider_status() -> dict:
    return {
        "order": get_provider_order(),
        "providers": {
            "textbee": {
                "configured": configured(TEXTBEE_API_KEY) and configured(TEXTBEE_DEVICE_ID),
                "note": "⭐ SMS falas me telefon Android — textbee.dev (deri ~50 SMS/ditë)",
            },
            "textbelt": {"configured": True, "note": "TEXTBELT_KEY=textbelt → ~1 SMS falas/ditë për test"},
            "gateway": {"configured": configured(SMS_GATEWAY_URL), "note": "Webhook i përgjithshëm Android/SIM gateway"},
            "infobip": {"configured": configured(INFOBIP_API_KEY), "note": "Mirë për Evropë/Ballkan"},
            "vonage": {
                "configured": configured(VONAGE_API_KEY) and configured(VONAGE_API_SECRET),
                "note": "Vonage (Nexmo)",
            },
            "twilio": {
                "configured": configured(TWILIO_ACCOUNT_SID) and configured(TWILIO_AUTH_TOKEN),
                "note": "Twilio — kërkon kredi",
            },
            "telegram": {"configured": configured(TELEGRAM_BOT_TOKEN, 10), "note": "Messenger falas"},
            "viber": {
                "configured": configured(VIBER_AUTH_TOKEN, 10) and bool((VIBER_BOT_URI or "").strip()),
                "note": "Viber Bot falas",
            },
            "whatsapp": {
                "configured": configured(WHATSAPP_TOKEN, 8) and configured(WHATSAPP_PHONE_NUMBER_ID, 8),
                "note": "WhatsApp Meta Cloud API",
            },
            "email_fallback": {"configured": configured(SMTP_USER), "note": "Gmail SMTP — gjithmonë si backup"},
        },
    }


def get_free_notify_status() -> dict:
    return {
        "textbee": {
            "configured": configured(TEXTBEE_API_KEY) and configured(TEXTBEE_DEVICE_ID),
            "label": "TextBee SMS",
            "note": "SMS reale falas nga telefon Android",
        },
        "textbelt": {"configured": True, "label": "Textbelt", "note": "~1 SMS falas / ditë"},
        "telegram": {"configured": configured(TELEGRAM_BOT_TOKEN, 10), "label": "Telegram", "note": "Messenger falas"},
        "viber": {
            "configured": configured(VIBER_AUTH_TOKEN, 10) and bool((VIBER_BOT_URI or "").strip()),
            "label": "Viber",
            "note": "Messenger falas · iOS & Android",
        },
        "whatsapp": {
            "configured": configured(WHATSAPP_TOKEN, 8) and configured(WHATSAPP_PHONE_NUMBER_ID, 8),
            "label": "WhatsApp",
            "note": "Messenger falas · iOS & Android",
        },
    }


async def _send_twilio(to: str, body: str) -> dict:
    if not configured(TWILIO_ACCOUNT_SID) or not configured(TWILIO_AUTH_TOKEN):
        return {"success": False, "provider": "twilio", "reason": "not_configured"}
    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        opts = {"body": body, "to": to}
        if configured(TWILIO_MESSAGING_SERVICE_SID):
            opts["messaging_service_sid"] = TWILIO_MESSAGING_SERVICE_SID
        elif configured(TWILIO_PHONE_NUMBER):
            opts["from_"] = TWILIO_PHONE_NUMBER
        msg = client.messages.create(**opts)
        return {"success": True, "provider": "twilio", "id": msg.sid}
    except Exception as err:
        return {"success": False, "provider": "twilio", "error": str(err)}


async def _send_infobip(to: str, body: str) -> dict:
    if not configured(INFOBIP_API_KEY):
        return {"success": False, "provider": "infobip", "reason": "not_configured"}
    base = INFOBIP_BASE_URL.rstrip("/")
    sender = INFOBIP_SENDER
    digits = "".join(ch for ch in to if ch.isdigit())
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{base}/sms/3/messages",
                headers={"Authorization": f"App {INFOBIP_API_KEY}", "Content-Type": "application/json"},
                json={"messages": [{"sender": sender, "destinations": [{"to": digits}], "content": {"text": body}}]},
            )
            if res.status_code in (404, 405):
                res = await client.post(
                    f"{base}/sms/2/text/advanced",
                    headers={"Authorization": f"App {INFOBIP_API_KEY}", "Content-Type": "application/json"},
                    json={"messages": [{"from": sender, "destinations": [{"to": digits}], "text": body}]},
                )
        data = res.json() if res.content else {}
        if not res.is_success:
            return {"success": False, "provider": "infobip", "error": str(data)[:200]}
        mid = ((data.get("messages") or [{}])[0].get("messageId")) or "infobip-ok"
        return {"success": True, "provider": "infobip", "id": mid}
    except Exception as err:
        return {"success": False, "provider": "infobip", "error": str(err)}


async def _send_vonage(to: str, body: str) -> dict:
    if not configured(VONAGE_API_KEY) or not configured(VONAGE_API_SECRET):
        return {"success": False, "provider": "vonage", "reason": "not_configured"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                "https://rest.nexmo.com/sms/json",
                data={
                    "api_key": VONAGE_API_KEY,
                    "api_secret": VONAGE_API_SECRET,
                    "to": "".join(ch for ch in to if ch.isdigit()),
                    "from": VONAGE_FROM,
                    "text": body,
                },
            )
        data = res.json()
        msg = (data.get("messages") or [{}])[0]
        if str(msg.get("status")) == "0":
            return {"success": True, "provider": "vonage", "id": msg.get("message-id")}
        return {"success": False, "provider": "vonage", "error": msg.get("error-text") or str(data)[:200]}
    except Exception as err:
        return {"success": False, "provider": "vonage", "error": str(err)}


async def _send_textbee(to: str, body: str) -> dict:
    if not configured(TEXTBEE_API_KEY) or not configured(TEXTBEE_DEVICE_ID):
        return {"success": False, "provider": "textbee", "reason": "not_configured"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"https://api.textbee.dev/api/v1/gateway/devices/{TEXTBEE_DEVICE_ID}/send-sms",
                headers={"Content-Type": "application/json", "x-api-key": TEXTBEE_API_KEY},
                json={"recipients": [to], "message": body[:1000]},
            )
        data = res.json() if res.content else {}
        if not res.is_success:
            return {"success": False, "provider": "textbee", "error": data.get("message") or data.get("error") or f"HTTP {res.status_code}"}
        return {"success": True, "provider": "textbee", "id": str(((data.get("data") or {}).get("_id")) or data.get("id") or "")}
    except Exception as err:
        return {"success": False, "provider": "textbee", "error": str(err)}


async def _send_gateway(to: str, body: str) -> dict:
    if not configured(SMS_GATEWAY_URL):
        return {"success": False, "provider": "gateway", "reason": "not_configured"}
    headers = {"Content-Type": "application/json"}
    if configured(SMS_GATEWAY_TOKEN):
        headers["Authorization"] = f"Bearer {SMS_GATEWAY_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(SMS_GATEWAY_URL, headers=headers, json={"to": to, "phone": to, "message": body, "text": body})
        if not res.is_success:
            return {"success": False, "provider": "gateway", "error": res.text[:200]}
        return {"success": True, "provider": "gateway"}
    except Exception as err:
        return {"success": False, "provider": "gateway", "error": str(err)}


async def _send_textbelt(to: str, body: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                "https://textbelt.com/text",
                json={"phone": to, "message": body[:320], "key": TEXTBELT_KEY or "textbelt"},
            )
        data = res.json()
        if data.get("success"):
            return {"success": True, "provider": "textbelt", "id": data.get("textId")}
        return {"success": False, "provider": "textbelt", "error": data.get("error") or "failed"}
    except Exception as err:
        return {"success": False, "provider": "textbelt", "error": str(err)}


async def send_via_telegram(chat_id, body: str) -> dict:
    from app.services.telegram import send_telegram_message

    return await send_telegram_message(chat_id, f"📱 SmartQueue\n\n{body}")


async def send_via_viber(viber_id, body: str) -> dict:
    from app.services.viber import send_viber_message

    return await send_viber_message(viber_id, f"📱 SmartQueue\n\n{body}")


async def send_via_whatsapp(phone, body: str) -> dict:
    from app.services.whatsapp import send_whatsapp_message

    return await send_whatsapp_message(phone, f"📱 SmartQueue\n\n{body}")


PROVIDERS = {
    "textbee": _send_textbee,
    "textbelt": _send_textbelt,
    "gateway": _send_gateway,
    "infobip": _send_infobip,
    "vonage": _send_vonage,
    "twilio": _send_twilio,
}


async def send_sms(to: str, body: str) -> dict:
    phone = to_e164_kosovo(to)
    if not phone:
        return {"success": False, "reason": "invalid_phone"}
    attempts = []
    for name in get_provider_order():
        fn = PROVIDERS.get(name)
        if not fn:
            continue
        result = await fn(phone, body)
        attempts.append(result)
        if result.get("success"):
            return {**result, "attempts": attempts}
    return {"success": False, "reason": "all_providers_failed", "attempts": attempts}


async def deliver_smart_message(
    phone=None,
    email=None,
    telegram_chat_id=None,
    viber_id=None,
    whatsapp_phone=None,
    body="",
    subject=None,
) -> dict:
    results = []
    share_link = None
    if whatsapp_phone:
        from app.services.whatsapp import send_booking_confirmation

        wa = await send_booking_confirmation(whatsapp_phone, body)
        share_link = wa.get("shareLink")
        results.append({"channel": "whatsapp", **wa})
        if wa.get("success"):
            return {"delivered": True, "via": "whatsapp", "shareLink": share_link, "results": results}
    if telegram_chat_id:
        tg = await send_via_telegram(telegram_chat_id, body)
        results.append({"channel": "telegram", **tg})
        if tg.get("success"):
            return {"delivered": True, "via": "telegram", "shareLink": share_link, "results": results}
    if viber_id:
        vb = await send_via_viber(viber_id, body)
        results.append({"channel": "viber", **vb})
        if vb.get("success"):
            return {"delivered": True, "via": "viber", "results": results}
    if phone:
        sms = await send_sms(phone, body)
        results.append({"channel": "sms", **sms})
        if sms.get("success"):
            return {"delivered": True, "via": sms.get("provider"), "shareLink": share_link, "results": results}
    if email:
        mail = await send_email(
            email,
            subject or "📱 SmartQueue — njoftim",
            f"<div style='font-family:sans-serif;padding:24px'><h2>SmartQueue · Njoftim</h2><p style='white-space:pre-wrap'>{body}</p></div>",
        )
        results.append({"channel": "email_fallback", "success": bool(mail.get("success"))})
        if mail.get("success"):
            return {"delivered": True, "via": "email_fallback", "shareLink": share_link, "results": results}
    return {"delivered": False, "via": "whatsapp_link" if share_link else None, "shareLink": share_link, "results": results}


def build_appointment_sms(ticket_number, institution_name, service_name, scheduled_at, kind="confirm"):
    from app.utils import format_appointment_local

    date_str, time_str = format_appointment_local(scheduled_at)
    if kind == "reminder":
        return f"SmartQueue Kujtesë: Termini juaj te {institution_name} ({service_name or 'shërbim'}) është {date_str} ora {time_str}. Numri: {ticket_number}. Merrni QR-në me vete."
    return f"SmartQueue: Termini u KONFIRMUAR. {institution_name} — {service_name or 'shërbim'}. {date_str} ora {time_str}. Numri: {ticket_number}. Hap aplikacionin për QR."


def build_appointment_whatsapp(name, ticket_number, institution_name, service_name, scheduled_at, address=None):
    from app.services.whatsapp import build_booking_whatsapp_text
    from app.utils import format_appointment_local

    date_str, time_str = format_appointment_local(scheduled_at)
    return build_booking_whatsapp_text(name, ticket_number, institution_name, service_name, date_str, time_str, address)
