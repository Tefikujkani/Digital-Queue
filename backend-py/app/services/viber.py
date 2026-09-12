from __future__ import annotations

from datetime import timedelta
from urllib.parse import quote

import httpx

from app.config import VIBER_AUTH_TOKEN, VIBER_BOT_URI, VIBER_SENDER_NAME, VIBER_WEBHOOK_URL, configured
from app.db import col
from app.serialize import oid
from app.utils import now_utc, random_hex

_account_info = None
_webhook_ready = False


def is_viber_configured() -> bool:
    return configured(VIBER_AUTH_TOKEN, 10) and bool((VIBER_BOT_URI or "").strip())


def bot_uri() -> str:
    return (VIBER_BOT_URI or "").strip().lstrip("@")


async def viber_api(path: str, body: dict | None = None):
    if not configured(VIBER_AUTH_TOKEN, 10):
        raise RuntimeError("VIBER_AUTH_TOKEN mungon")
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            f"https://chatapi.viber.com/pa/{path}",
            headers={"Content-Type": "application/json", "X-Viber-Auth-Token": VIBER_AUTH_TOKEN},
            json=body or {},
        )
    data = res.json()
    if data.get("status") != 0:
        raise RuntimeError(data.get("status_message") or f"Viber {path} failed")
    return data


async def get_viber_account_info():
    global _account_info
    if not is_viber_configured():
        return None
    if _account_info:
        return _account_info
    try:
        _account_info = await viber_api("get_account_info")
        return _account_info
    except Exception as err:
        print("⚠️ Viber get_account_info:", err)
        return None


async def send_viber_message(receiver_id, text: str) -> dict:
    if not is_viber_configured() or not receiver_id:
        return {"success": False, "provider": "viber", "reason": "not_configured"}
    try:
        data = await viber_api(
            "send_message",
            {
                "receiver": str(receiver_id),
                "type": "text",
                "text": str(text)[:7000],
                "sender": {"name": VIBER_SENDER_NAME[:28]},
                "min_api_version": 1,
            },
        )
        return {"success": True, "provider": "viber", "id": str(data.get("message_token") or "")}
    except Exception as err:
        return {"success": False, "provider": "viber", "error": str(err)}


async def create_viber_link(user_id) -> dict:
    if not is_viber_configured():
        return {
            "ok": False,
            "message": "Viber bot nuk është konfiguruar. Vendos VIBER_AUTH_TOKEN dhe VIBER_BOT_URI në backend/.env (partners.viber.com).",
        }
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    code = random_hex(12)
    await col.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"viberLinkCode": code, "viberLinkExpires": now_utc() + timedelta(minutes=15)}},
    )
    uri = bot_uri()
    return {
        "ok": True,
        "deepLink": f"viber://pa?chatURI={quote(uri)}&context={code}",
        "webLink": f"https://viber.com/{quote(uri)}?context={code}",
        "botUri": uri,
        "expiresInMinutes": 15,
        "alreadyLinked": bool(user.get("viberId")),
        "needsWebhook": not VIBER_WEBHOOK_URL,
    }


async def unlink_viber(user_id) -> dict:
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    viber_id = user.get("viberId")
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"viberId": "", "notificationPrefs.viber": False},
            "$unset": {"viberLinkCode": "", "viberLinkExpires": ""},
        },
    )
    if viber_id:
        await send_viber_message(viber_id, "🔕 SmartQueue u shkëput nga Viber.\nMund ta lidhësh përsëri nga Cilësimet.")
    return {"ok": True}


async def _link_user_by_code(code, viber_user_id, name) -> bool:
    if not code or not viber_user_id:
        return False
    user = await col.users.find_one({"viberLinkCode": code, "viberLinkExpires": {"$gt": now_utc()}})
    if not user:
        await send_viber_message(
            viber_user_id,
            "⚠️ Lidhja skadoi ose kodi është i pavlefshëm.\nHap SmartQueue → Cilësimet → Lidhu me Viber.",
        )
        return False
    await col.users.update_many(
        {"viberId": str(viber_user_id), "_id": {"$ne": user["_id"]}},
        {"$set": {"viberId": ""}},
    )
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"viberId": str(viber_user_id), "notificationPrefs.viber": True},
            "$unset": {"viberLinkCode": "", "viberLinkExpires": ""},
        },
    )
    greet = name or user.get("name") or "qytetar"
    await send_viber_message(
        viber_user_id,
        f"✅ Përshëndetje {greet}!\n\nLlogaria SmartQueue u lidh me Viber.\nTani merr njoftime falas për termine, kujtesa dhe radhën.\n\nSmartQueue Kosova 🇽🇰",
    )
    return True


async def handle_viber_event(body: dict):
    event = (body or {}).get("event")
    if not event:
        return None
    if event == "webhook":
        return None
    if event == "conversation_started":
        viber_user_id = (body.get("user") or {}).get("id")
        context = str(body.get("context") or "").strip()
        name = (body.get("user") or {}).get("name")
        if context and viber_user_id:
            await _link_user_by_code(context, viber_user_id, name)
        return {
            "sender": {"name": VIBER_SENDER_NAME[:28]},
            "type": "text",
            "text": "✅ Mirë se erdhe! Nëse lidhja nuk u aktivizua, dërgo çdo mesazh këtu."
            if context
            else "👋 SmartQueue Kosova\n\nPër të lidhur llogarinë: Hap app → Cilësimet → Lidhu me Viber.",
        }
    if event == "subscribed":
        viber_user_id = (body.get("user") or {}).get("id")
        if viber_user_id:
            existing = await col.users.find_one({"viberId": str(viber_user_id)})
            if existing:
                await col.users.update_one({"_id": existing["_id"]}, {"$set": {"notificationPrefs.viber": True}})
                await send_viber_message(viber_user_id, "✅ Abonimi Viber aktiv — njoftimet janë gati.")
        return None
    if event == "unsubscribed":
        viber_user_id = body.get("user_id") or (body.get("user") or {}).get("id")
        if viber_user_id:
            await col.users.update_many(
                {"viberId": str(viber_user_id)},
                {"$set": {"viberId": "", "notificationPrefs.viber": False}},
            )
        return None
    if event == "message":
        viber_user_id = (body.get("sender") or {}).get("id")
        text = str((body.get("message") or {}).get("text") or "").strip()
        if not viber_user_id:
            return None
        if len(text) >= 16 and all(ch in "0123456789abcdefABCDEF" for ch in text):
            await _link_user_by_code(text, viber_user_id, (body.get("sender") or {}).get("name"))
            return None
        if text in {"/status", "status"}:
            user = await col.users.find_one({"viberId": str(viber_user_id)})
            await send_viber_message(
                viber_user_id,
                f"✅ I lidhur si: {user.get('name')}\n📧 {user.get('email')}"
                if user
                else "Nuk je i lidhur. Hap Cilësimet → Lidhu me Viber.",
            )
    return None


async def start_viber_webhook() -> None:
    global _webhook_ready
    if not is_viber_configured():
        return
    base = (VIBER_WEBHOOK_URL or "").rstrip("/")
    if not base:
        print("💡 Viber: vendos VIBER_WEBHOOK_URL (HTTPS, p.sh. ngrok) për lidhjen e qytetarëve")
        return
    try:
        await viber_api(
            "set_webhook",
            {
                "url": f"{base}/api/viber/webhook",
                "event_types": [
                    "delivered",
                    "seen",
                    "failed",
                    "subscribed",
                    "unsubscribed",
                    "conversation_started",
                    "message",
                ],
                "send_name": True,
                "send_photo": False,
            },
        )
        _webhook_ready = True
        info = await get_viber_account_info()
        print(f"📱 Viber webhook aktiv (@{bot_uri()}{(' · ' + info.get('name')) if info and info.get('name') else ''})")
    except Exception as err:
        print("⚠️ Viber set_webhook dështoi:", err)


def get_viber_public_status() -> dict:
    return {
        "configured": is_viber_configured(),
        "botUri": bot_uri() or None,
        "webhook": _webhook_ready or bool(VIBER_WEBHOOK_URL),
        "note": "Njoftime falas në Viber — lidhe nga Cilësimet (kërkon HTTPS webhook)",
    }
