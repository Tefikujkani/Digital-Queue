from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.deps import require_user
from app.errors import api_error
from app.services.viber import (
    create_viber_link,
    get_viber_account_info,
    get_viber_public_status,
    handle_viber_event,
    is_viber_configured,
    unlink_viber,
)

router = APIRouter(prefix="/api/viber", tags=["viber"])


@router.get("/status")
async def status():
    if is_viber_configured():
        await get_viber_account_info()
    return get_viber_public_status()


@router.post("/link")
async def link(user: Annotated[dict, Depends(require_user)]):
    result = await create_viber_link(user["_id"])
    if not result.get("ok"):
        raise api_error(400, result.get("message") or "Lidhja dështoi")
    return result


@router.post("/unlink")
async def unlink(user: Annotated[dict, Depends(require_user)]):
    return await unlink_viber(user["_id"])


@router.post("/webhook")
async def webhook(request: Request):
    try:
        body = await request.json()
        welcome = await handle_viber_event(body)
        if welcome:
            return welcome
    except Exception as err:
        print("Viber webhook:", err)
    return Response(status_code=200)
