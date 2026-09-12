from __future__ import annotations

import asyncio
import os
from datetime import timedelta

import httpx

from app.config import (
    GREEN_API_ID,
    GREEN_API_TOKEN,
    GREEN_API_URL,
    WHATSAPP_API_VERSION,
    WHATSAPP_BUSINESS_NUMBER,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_TEMPLATE_CONFIRM,
    WHATSAPP_TEMPLATE_LANG,
    WHATSAPP_TOKEN,
    WHATSAPP_VERIFY_TOKEN,
    configured,
    env,
)
from app.db import col
from app.serialize import oid
from app.utils import now_utc, random_hex, to_e164_kosovo

GREEN_KEY = "green_api"
GRAPH = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"


def _green_url_from_id(id_instance: str) -> str:
    if GREEN_API_URL:
        return GREEN_API_URL.rstrip("/")
    ident = str(id_instance or "").strip()
    if len(ident) >= 4:
        return f"https://{ident[:4]}.api.green-api.com"
    return "https://api.green-api.com"


def _qr_page_url(id_instance: str, api_token: str) -> str:
    return f"https://qr.green-api.com/waInstance{id_instance}/{api_token}"


def env_green_config() -> dict | None:
    if not configured(GREEN_API_ID, 8) or not configured(GREEN_API_TOKEN, 8):
        return None
    return {
        "idInstance": GREEN_API_ID.strip(),
        "apiToken": GREEN_API_TOKEN.strip(),
        "apiUrl": _green_url_from_id(GREEN_API_ID),
    }


async def resolve_green_config() -> dict | None:
    row = await col.appsettings.find_one({"key": GREEN_KEY})
    value = (row or {}).get("value") or {}
    if configured(str(value.get("idInstance") or ""), 8) and configured(str(value.get("apiToken") or ""), 8):
        ident = str(value["idInstance"]).strip()
        token = str(value["apiToken"]).strip()
        return {
            "idInstance": ident,
            "apiToken": token,
            "apiUrl": str(value.get("apiUrl") or _green_url_from_id(ident)).rstrip("/"),
        }
    return env_green_config()


async def save_green_config(body: dict) -> dict:
    ident = str(body.get("idInstance") or "").strip()
    token_val = str(body.get("apiToken") or "").replace(" ", "").strip()
    if not configured(ident, 8) or not configured(token_val, 8):
        return {"ok": False, "message": "Vendos idInstance dhe apiToken nga console.green-api.com (falas)."}
    value = {
        "idInstance": ident,
        "apiToken": token_val,
        "apiUrl": str(body.get("apiUrl") or _green_url_from_id(ident)).rstrip("/"),
    }
    await col.appsettings.update_one({"key": GREEN_KEY}, {"$set": {"value": value}}, upsert=True)
    os.environ["GREEN_API_ID"] = ident
    os.environ["GREEN_API_TOKEN"] = token_val
    os.environ["GREEN_API_URL"] = value["apiUrl"]
    return {"ok": True, "idInstance": ident, "apiUrl": value["apiUrl"], "pageUrl": _qr_page_url(ident, token_val)}


async def get_green_state() -> dict:
    cfg = await resolve_green_config()
    if not cfg:
        return {"configured": False, "authorized": False}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(
                f"{cfg['apiUrl']}/waInstance{cfg['idInstance']}/getStateInstance/{cfg['apiToken']}"
            )
        data = res.json() if res.content else {}
        if res.status_code == 401:
            return {
                "configured": False,
                "authorized": False,
                "state": "invalid_token",
                "idInstance": cfg["idInstance"],
                "error": "Tokeni i Green-API s’është i saktë",
            }
        state = data.get("stateInstance") or data.get("state") or ""
        return {
            "configured": True,
            "authorized": state == "authorized",
            "state": state,
            "idInstance": cfg["idInstance"],
        }
    except Exception as err:
        return {"configured": True, "authorized": False, "error": str(err)}


async def get_green_qr() -> dict:
    cfg = await resolve_green_config()
    if not cfg:
        return {"ok": False, "message": "Green-API nuk është konfiguruar."}
    page_url = _qr_page_url(cfg["idInstance"], cfg["apiToken"])
    for attempt in range(6):
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                res = await client.get(f"{cfg['apiUrl']}/waInstance{cfg['idInstance']}/qr/{cfg['apiToken']}")
            raw = res.text
            try:
                data = res.json() if raw else {}
            except Exception:
                data = {"message": raw}
            if res.status_code == 401:
                return {
                    "ok": False,
                    "pageUrl": page_url,
                    "message": "Tokeni s’u pranua (401). Te Green-API shtyp Copy te apiTokenInstance dhe ngjite sërish këtu.",
                }
            if data.get("type") == "alreadyLogged":
                return {"ok": True, "authorized": True, "pageUrl": page_url}
            if data.get("type") == "qrCode" and data.get("message"):
                msg = str(data["message"])
                qr = msg if msg.startswith("data:") else f"data:image/png;base64,{msg}"
                return {"ok": True, "authorized": False, "qr": qr, "pageUrl": page_url}
        except Exception:
            pass
        if attempt < 5:
            await asyncio.sleep(1.5)
    return {
        "ok": True,
        "authorized": False,
        "pageUrl": page_url,
        "message": "Hape QR-në te Green-API dhe skanoje me WhatsApp.",
    }


async def get_green_auth_code(phone_raw: str | None) -> dict:
    cfg = await resolve_green_config()
    if not cfg:
        return {"ok": False, "message": "Green-API nuk është konfiguruar."}
    state = await get_green_state()
    if state.get("authorized"):
        return {"ok": True, "authorized": True, "message": "WhatsApp osht tashmë i lidhur."}
    if state.get("state") == "invalid_token":
        return {
            "ok": False,
            "message": "Tokeni i Green-API s’pranohet. Te console.green-api.com shtyp Copy te apiTokenInstance dhe ngjite sërish.",
        }
    digits = (to_e164_kosovo(phone_raw) or "").replace(r"\D", "")
    digits = "".join(ch for ch in (to_e164_kosovo(phone_raw) or "") if ch.isdigit())
    if not digits:
        return {"ok": False, "message": "Numër i pavlefshëm (+383…)"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{cfg['apiUrl']}/waInstance{cfg['idInstance']}/getAuthorizationCode/{cfg['apiToken']}",
                json={"phoneNumber": int(digits)},
            )
        data = res.json() if res.content else {}
        if res.status_code == 401:
            return {"ok": False, "message": "Tokeni s’pranohet. Kopjoje sërish me Copy te Green-API."}
        if data.get("status") and data.get("code"):
            return {"ok": True, "code": data["code"], "phone": digits}
        return {
            "ok": False,
            "pageUrl": _qr_page_url(cfg["idInstance"], cfg["apiToken"]),
            "message": "Kodi s’u mor. Hap QR-në e Green-API dhe skanoje me WhatsApp.",
        }
    except Exception as err:
        return {"ok": False, "message": str(err)}


def is_meta_configured() -> bool:
    return configured(WHATSAPP_TOKEN, 8) and configured(WHATSAPP_PHONE_NUMBER_ID, 8)


def is_whatsapp_configured() -> bool:
    return is_meta_configured() or bool(env_green_config())


async def is_whatsapp_ready() -> bool:
    if is_meta_configured():
        return True
    green = await get_green_state()
    return bool(green.get("configured") and green.get("authorized"))


async def send_via_green_api(to_digits: str, text: str) -> dict:
    cfg = await resolve_green_config()
    if not cfg:
        return {"success": False, "provider": "green-api", "reason": "not_configured"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{cfg['apiUrl']}/waInstance{cfg['idInstance']}/sendMessage/{cfg['apiToken']}",
                json={"chatId": f"{to_digits}@c.us", "message": str(text)[:4000]},
            )
        data = res.json() if res.content else {}
        if not res.is_success or not data.get("idMessage"):
            return {
                "success": False,
                "provider": "green-api",
                "error": data.get("message") or data.get("error") or str(data)[:200],
            }
        return {"success": True, "provider": "green-api", "id": data["idMessage"]}
    except Exception as err:
        return {"success": False, "provider": "green-api", "error": str(err)}


async def send_whatsapp_message(to_phone: str | None, text: str) -> dict:
    if not to_phone:
        return {"success": False, "provider": "whatsapp", "reason": "not_configured"}
    to = "".join(ch for ch in (to_e164_kosovo(to_phone) or "") if ch.isdigit())
    if not to:
        return {"success": False, "provider": "whatsapp", "reason": "invalid_phone"}

    green = await send_via_green_api(to, text)
    if green.get("success"):
        return green
    if green.get("error"):
        print("Green-API:", green.get("error"))

    if not is_meta_configured():
        return green if green.get("reason") != "not_configured" else {"success": False, "provider": "whatsapp", "reason": "not_configured"}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{GRAPH}/{WHATSAPP_PHONE_NUMBER_ID}/messages",
                headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to,
                    "type": "text",
                    "text": {"body": str(text)[:4000], "preview_url": False},
                },
            )
        data = res.json() if res.content else {}
        if not res.is_success or data.get("error"):
            return {
                "success": False,
                "provider": "whatsapp",
                "error": (data.get("error") or {}).get("message") or str(data)[:200],
            }
        return {"success": True, "provider": "whatsapp", "id": str((data.get("messages") or [{}])[0].get("id") or "")}
    except Exception as err:
        return {"success": False, "provider": "whatsapp", "error": str(err)}


async def send_whatsapp_template(to_phone: str, template_name: str, language_code: str = "sq") -> dict:
    if not is_whatsapp_configured() or not to_phone or not template_name:
        return {"success": False, "provider": "whatsapp", "reason": "not_configured"}
    to = "".join(ch for ch in (to_e164_kosovo(to_phone) or "") if ch.isdigit())
    if not to:
        return {"success": False, "provider": "whatsapp", "reason": "invalid_phone"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{GRAPH}/{WHATSAPP_PHONE_NUMBER_ID}/messages",
                headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "template",
                    "template": {"name": template_name, "language": {"code": language_code}},
                },
            )
        data = res.json() if res.content else {}
        if not res.is_success or data.get("error"):
            return {"success": False, "provider": "whatsapp", "error": (data.get("error") or {}).get("message") or str(data)[:200]}
        return {"success": True, "provider": "whatsapp_template", "id": str((data.get("messages") or [{}])[0].get("id") or "")}
    except Exception as err:
        return {"success": False, "provider": "whatsapp", "error": str(err)}


def business_e164() -> str:
    raw = WHATSAPP_BUSINESS_NUMBER or ""
    parsed = to_e164_kosovo(raw)
    return "".join(ch for ch in (parsed or "") if ch.isdigit())


async def create_whatsapp_link(user_id) -> dict:
    if not is_whatsapp_configured():
        return {
            "ok": False,
            "message": "WhatsApp nuk është konfiguruar. Vendos WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta Developers).",
        }
    biz = business_e164()
    if not biz:
        return {"ok": False, "message": "Vendos WHATSAPP_BUSINESS_NUMBER (p.sh. 38344111222) në .env për deep link iOS/Android."}
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    code = random_hex(10)
    await col.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"whatsappLinkCode": code, "whatsappLinkExpires": now_utc() + timedelta(minutes=15)}},
    )
    from urllib.parse import quote

    deep_link = f"https://wa.me/{biz}?text={quote(f'SmartQueue {code}')}"
    return {
        "ok": True,
        "deepLink": deep_link,
        "businessNumber": biz,
        "expiresInMinutes": 15,
        "alreadyLinked": bool(user.get("whatsappPhone")),
        "platforms": ["ios", "android"],
    }


async def unlink_whatsapp(user_id) -> dict:
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    phone = user.get("whatsappPhone")
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"whatsappPhone": "", "notificationPrefs.whatsapp": False},
            "$unset": {"whatsappLinkCode": "", "whatsappLinkExpires": ""},
        },
    )
    if phone:
        await send_whatsapp_message(
            phone,
            "🔕 SmartQueue u shkëput nga WhatsApp.\nMund ta lidhësh përsëri nga Cilësimet (iOS/Android).",
        )
    return {"ok": True}


async def save_whatsapp_phone(user_id, phone_raw: str) -> dict:
    phone = to_e164_kosovo(phone_raw)
    if not phone:
        return {"ok": False, "message": "Numër i pavlefshëm (+383…)"}
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    await col.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"whatsappPhone": phone, "notificationPrefs.whatsapp": True}},
    )
    sent = await send_whatsapp_message(
        phone,
        "✅ SmartQueue: numri u ruajt.\nNëse nuk e more këtë mesazh, hap WhatsApp → shkruaj botit një herë, pastaj provo përsëri.",
    )
    return {"ok": True, "phone": phone, "delivery": sent}


async def _link_by_code(code: str, from_phone: str, profile_name: str | None) -> bool:
    if not code or not from_phone:
        return False
    phone = to_e164_kosovo(from_phone) or f"+{''.join(ch for ch in from_phone if ch.isdigit())}"
    user = await col.users.find_one({"whatsappLinkCode": code, "whatsappLinkExpires": {"$gt": now_utc()}})
    if not user:
        await send_whatsapp_message(phone, "⚠️ Lidhja skadoi. Hap SmartQueue → Cilësimet → Lidhu me WhatsApp.")
        return False
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"whatsappPhone": phone, "notificationPrefs.whatsapp": True},
            "$unset": {"whatsappLinkCode": "", "whatsappLinkExpires": ""},
        },
    )
    await send_whatsapp_message(
        phone,
        f"✅ Përshëndetje {profile_name or user.get('name') or ''}!\n\nLlogaria SmartQueue u lidh me WhatsApp (iOS/Android).\nDo të marrësh njoftime për termine dhe radhën.",
    )
    return True


def verify_whatsapp_webhook(mode, verify_token, challenge):
    if mode == "subscribe" and verify_token == WHATSAPP_VERIFY_TOKEN:
        return challenge
    return None


async def handle_whatsapp_webhook(body: dict) -> None:
    import re

    for entry in body.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for msg in value.get("messages") or []:
                frm = msg.get("from")
                text = str((msg.get("text") or {}).get("body") or "").strip()
                name = ((value.get("contacts") or [{}])[0].get("profile") or {}).get("name")
                match = re.search(r"SmartQueue\s+([a-f0-9]{12,24})", text, re.I) or re.match(r"^([a-f0-9]{20})$", text, re.I)
                if match:
                    await _link_by_code(match.group(1), frm, name)
                    continue
                if text.lower() == "status" or text == "/status":
                    digits = "".join(ch for ch in str(frm) if ch.isdigit())
                    user = await col.users.find_one({"whatsappPhone": {"$regex": digits + "$"}})
                    await send_whatsapp_message(
                        frm,
                        f"✅ I lidhur: {user.get('name')}\n📧 {user.get('email')}"
                        if user
                        else "Nuk je i lidhur. Hap Cilësimet → Lidhu me WhatsApp.",
                    )


def build_whatsapp_share_link(text: str, to_phone: str | None) -> str:
    from urllib.parse import quote

    encoded = quote(str(text or "")[:1800])
    digits = "".join(ch for ch in (to_e164_kosovo(to_phone) or "") if ch.isdigit())
    return f"https://wa.me/{digits}?text={encoded}" if digits else f"https://wa.me/?text={encoded}"


def build_booking_whatsapp_text(name, ticket_number, institution_name, service_name, date_str, time_str, address=None):
    lines = [
        "✅ SmartQueue Kosova",
        "Termini u konfirmua — nuk ju duhet email.",
        "",
        f"👤 {name or 'Qytetar'}",
        f"🏛️ {institution_name or 'Institucioni'}",
        f"📋 {service_name or 'Shërbim'}",
        f"📅 {date_str}" if date_str else None,
        f"🕐 Ora {time_str}" if time_str else None,
        f"🎫 Numri: {ticket_number}",
        f"📍 {address}" if address else None,
        "",
        "Merrni me vete dokumentet e nevojshme dhe QR-në në SmartQueue.",
        "Ky mesazh është konfirmimi juaj. Ruajeni këtu në WhatsApp.",
    ]
    return "\n".join(line for line in lines if line is not None)


async def send_booking_confirmation(phone: str | None, text: str) -> dict:
    share_link = build_whatsapp_share_link(text, phone)
    if not phone or not text:
        return {"success": False, "provider": "whatsapp", "reason": "missing", "shareLink": share_link}
    sent = await send_whatsapp_message(phone, text)
    if not sent.get("success") and WHATSAPP_TEMPLATE_CONFIRM:
        sent = await send_whatsapp_template(phone, WHATSAPP_TEMPLATE_CONFIRM, WHATSAPP_TEMPLATE_LANG)
    return {**sent, "shareLink": share_link, "phone": to_e164_kosovo(phone)}


_session = {"status": "idle", "qr": "", "pairingCode": "", "ready": False}


async def start_wa_session(phone: str | None = None) -> dict:
    """Green-API QR/code — Baileys (Node) nuk ekziston në Python."""
    state = await get_green_state()
    if state.get("authorized"):
        _session.update({"ready": True, "status": "ready", "qr": "", "pairingCode": "", "hasSession": True})
        return get_wa_session_state()
    qr = await get_green_qr()
    code = ""
    if phone:
        auth = await get_green_auth_code(phone)
        code = auth.get("code") or ""
    _session.update(
        {
            "ready": bool(qr.get("authorized")),
            "status": "ready" if qr.get("authorized") else "qr",
            "qr": qr.get("qr") or "",
            "pairingCode": code,
            "hasSession": bool(qr.get("authorized")),
            "pageUrl": qr.get("pageUrl"),
        }
    )
    return get_wa_session_state()


def get_wa_session_state() -> dict:
    return {
        "ready": _session.get("ready", False),
        "status": _session.get("status", "idle"),
        "qr": "" if _session.get("ready") else _session.get("qr") or "",
        "pairingCode": _session.get("pairingCode") or "",
        "hasSession": bool(_session.get("hasSession") or _session.get("ready")),
        "error": _session.get("error"),
        "pageUrl": _session.get("pageUrl"),
    }


async def stop_wa_session() -> dict:
    cfg = await resolve_green_config()
    if cfg:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                await client.get(f"{cfg['apiUrl']}/waInstance{cfg['idInstance']}/logout/{cfg['apiToken']}")
        except Exception:
            pass
    _session.update({"ready": False, "status": "idle", "qr": "", "pairingCode": "", "hasSession": False})
    return get_wa_session_state()


async def get_whatsapp_public_status() -> dict:
    green = await get_green_state()
    session = get_wa_session_state()
    ready = is_meta_configured() or green.get("authorized") or session.get("ready")
    return {
        "configured": ready,
        "provider": "whatsapp-session" if session.get("ready") else ("green-api" if green.get("authorized") else None),
        "autoSend": ready,
        "sessionReady": session.get("ready"),
        "sessionStatus": session.get("status"),
        "qr": session.get("qr") or "",
        "pairingCode": session.get("pairingCode") or "",
        "greenConfigured": green.get("configured"),
        "greenAuthorized": green.get("authorized"),
        "greenState": green.get("state"),
        "hasBusinessNumber": bool(business_e164()),
        "signupUrl": "https://console.green-api.com",
        "platforms": ["ios", "android"],
        "note": "WhatsApp dërgon vetë — s’ke nevojë ta hapësh"
        if ready
        else "Lidh WhatsApp një herë me QR/kod, pastaj konfirmimet shkojnë vetë.",
    }
