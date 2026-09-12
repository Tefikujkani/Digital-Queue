from __future__ import annotations

from datetime import timedelta

import httpx

from app.config import TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_WEBHOOK_URL, configured
from app.db import col
from app.serialize import oid
from app.utils import now_utc, random_hex

_cached_bot = None
_poller_running = False
_poll_offset = 0


def is_telegram_configured() -> bool:
    return configured(TELEGRAM_BOT_TOKEN, 10)


async def tg_api(method: str, body: dict | None = None):
    if not is_telegram_configured():
        raise RuntimeError("TELEGRAM_BOT_TOKEN mungon")
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(url, json=body) if body else await client.get(url)
    data = res.json()
    if not data.get("ok"):
        raise RuntimeError(data.get("description") or f"Telegram {method} failed")
    return data["result"]


async def get_bot_info():
    global _cached_bot
    if not is_telegram_configured():
        return None
    if _cached_bot:
        return _cached_bot
    try:
        _cached_bot = await tg_api("getMe")
        return _cached_bot
    except Exception as err:
        print("⚠️ Telegram getMe:", err)
        return None


async def send_telegram_message(chat_id, text: str, extra: dict | None = None) -> dict:
    if not is_telegram_configured() or not chat_id:
        return {"success": False, "provider": "telegram", "reason": "not_configured"}
    try:
        payload = {
            "chat_id": chat_id,
            "text": (text[:3990] + "…") if len(text) > 4000 else text,
            "disable_web_page_preview": True,
            **(extra or {}),
        }
        result = await tg_api("sendMessage", payload)
        return {"success": True, "provider": "telegram", "id": str(result.get("message_id"))}
    except Exception as err:
        return {"success": False, "provider": "telegram", "error": str(err)}


async def create_telegram_link(user_id) -> dict:
    bot = await get_bot_info()
    if not bot or not bot.get("username"):
        return {
            "ok": False,
            "message": "Telegram bot nuk është konfiguruar. Vendos TELEGRAM_BOT_TOKEN në backend/.env (nga @BotFather).",
        }
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    code = random_hex(12)
    await col.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"telegramLinkCode": code, "telegramLinkExpires": now_utc() + timedelta(minutes=15)}},
    )
    return {
        "ok": True,
        "deepLink": f"https://t.me/{bot['username']}?start={code}",
        "botUsername": bot["username"],
        "expiresInMinutes": 15,
        "alreadyLinked": bool(user.get("telegramChatId")),
    }


async def unlink_telegram(user_id) -> dict:
    user = await col.users.find_one({"_id": oid(user_id)})
    if not user:
        return {"ok": False, "message": "Përdoruesi nuk u gjet"}
    chat_id = user.get("telegramChatId")
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"telegramChatId": "", "notificationPrefs.telegram": False},
            "$unset": {"telegramLinkCode": "", "telegramLinkExpires": ""},
        },
    )
    if chat_id:
        await send_telegram_message(chat_id, "🔕 SmartQueue u shkëput nga Telegram.\nMund ta lidhësh përsëri nga Cilësimet.")
    return {"ok": True}


async def _link_user_from_start(code, chat_id, frm) -> bool:
    if not code or not chat_id:
        return False
    user = await col.users.find_one({"telegramLinkCode": code, "telegramLinkExpires": {"$gt": now_utc()}})
    if not user:
        await send_telegram_message(
            chat_id,
            "⚠️ Lidhja skadoi ose kodi është i pavlefshëm.\nHap SmartQueue → Cilësimet → Lidhu me Telegram përsëri.",
        )
        return False
    await col.users.update_many(
        {"telegramChatId": str(chat_id), "_id": {"$ne": user["_id"]}},
        {"$set": {"telegramChatId": ""}},
    )
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"telegramChatId": str(chat_id), "notificationPrefs.telegram": True},
            "$unset": {"telegramLinkCode": "", "telegramLinkExpires": ""},
        },
    )
    name = (frm or {}).get("first_name") or user.get("name") or "qytetar"
    await send_telegram_message(
        chat_id,
        f"✅ Përshëndetje {name}!\n\nLlogaria jote SmartQueue u lidh me Telegram.\nTani merr njoftime falas për:\n• Rezervime terminash\n• Kujtesa 24h dhe 2h para\n• Thirrjen e radhës\n\nSmartQueue Kosova 🇽🇰",
    )
    return True


async def handle_telegram_update(update: dict) -> None:
    msg = (update or {}).get("message") or {}
    if not msg.get("text") or not (msg.get("chat") or {}).get("id"):
        return
    text = str(msg["text"]).strip()
    chat_id = msg["chat"]["id"]
    if text.startswith("/start"):
        parts = text.split()
        code = parts[1] if len(parts) > 1 else None
        if code:
            await _link_user_from_start(code, chat_id, msg.get("from"))
        else:
            await send_telegram_message(
                chat_id,
                "👋 Mirë se erdhe te SmartQueue Kosova!\n\nPër të lidhur llogarinë:\n1. Hap aplikacionin SmartQueue\n2. Shko te Cilësimet\n3. Shtyp «Lidhu me Telegram»",
            )
        return
    if text in {"/status", "/help"}:
        user = await col.users.find_one({"telegramChatId": str(chat_id)})
        if user:
            await send_telegram_message(chat_id, f"✅ Je i lidhur si: {user.get('name')}\n📧 {user.get('email')}\n\nKomanda: /start · /status · /stop")
        else:
            await send_telegram_message(chat_id, "Nuk je i lidhur ende. Hap Cilësimet në SmartQueue → Lidhu me Telegram.")
        return
    if text == "/stop":
        user = await col.users.find_one({"telegramChatId": str(chat_id)})
        if user:
            await col.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"telegramChatId": "", "notificationPrefs.telegram": False}},
            )
        await send_telegram_message(chat_id, "🔕 Njoftimet u ndalën. /start për të lidhur përsëri.")


async def start_telegram_poller() -> None:
    global _poller_running, _poll_offset
    if not is_telegram_configured() or _poller_running:
        return
    if TELEGRAM_WEBHOOK_URL:
        try:
            await tg_api(
                "setWebhook",
                {
                    "url": f"{TELEGRAM_WEBHOOK_URL.rstrip('/')}/api/telegram/webhook",
                    "drop_pending_updates": True,
                    **({"secret_token": TELEGRAM_WEBHOOK_SECRET} if TELEGRAM_WEBHOOK_SECRET else {}),
                },
            )
            print("📱 Telegram webhook aktiv")
            return
        except Exception as err:
            print("⚠️ Telegram webhook dështoi, përdor polling:", err)
    else:
        try:
            await tg_api("deleteWebhook", {"drop_pending_updates": False})
        except Exception:
            pass

    _poller_running = True
    bot = await get_bot_info()
    print(f"📱 Telegram poller aktiv (@{(bot or {}).get('username') or '?'})")

    async def loop():
        global _poll_offset
        while _poller_running:
            try:
                url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates?offset={_poll_offset}&timeout=25"
                async with httpx.AsyncClient(timeout=35) as client:
                    res = await client.get(url)
                data = res.json()
                if data.get("ok") and isinstance(data.get("result"), list):
                    for update in data["result"]:
                        _poll_offset = update["update_id"] + 1
                        try:
                            await handle_telegram_update(update)
                        except Exception as err:
                            print("Telegram update error:", err)
                elif not data.get("ok"):
                    await asyncio.sleep(3)
            except Exception as err:
                print("Telegram poll error:", err)
                await asyncio.sleep(4)

    import asyncio

    asyncio.create_task(loop())


def get_telegram_public_status() -> dict:
    return {
        "configured": is_telegram_configured(),
        "botUsername": (_cached_bot or {}).get("username"),
        "mode": "webhook" if TELEGRAM_WEBHOOK_URL else "polling",
        "note": "Kanali kryesor falas — lidhe nga Cilësimet me një klik",
    }
