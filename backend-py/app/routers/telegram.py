from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, Response

from app.config import IS_PROD, TELEGRAM_WEBHOOK_SECRET
from app.deps import require_user
from app.errors import api_error
from app.services.telegram import (
    create_telegram_link,
    get_bot_info,
    get_telegram_public_status,
    handle_telegram_update,
    is_telegram_configured,
    unlink_telegram,
)

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.get("/status")
async def status():
    if is_telegram_configured() and not get_telegram_public_status().get("botUsername"):
        await get_bot_info()
    return get_telegram_public_status()


@router.post("/link")
async def link(user: Annotated[dict, Depends(require_user)]):
    result = await create_telegram_link(user["_id"])
    if not result.get("ok"):
        raise api_error(400, result.get("message") or "Lidhja dështoi")
    return result


@router.post("/unlink")
async def unlink(user: Annotated[dict, Depends(require_user)]):
    return await unlink_telegram(user["_id"])


@router.post("/webhook")
async def webhook(request: Request, x_telegram_bot_api_secret_token: str | None = Header(default=None)):
    if TELEGRAM_WEBHOOK_SECRET:
        if x_telegram_bot_api_secret_token != TELEGRAM_WEBHOOK_SECRET:
            return Response(status_code=401)
    elif IS_PROD:
        raise api_error(503, "TELEGRAM_WEBHOOK_SECRET mungon")
    body = await request.json()
    try:
        await handle_telegram_update(body)
    except Exception as err:
        print("Telegram webhook:", err)
    return Response(status_code=200)
