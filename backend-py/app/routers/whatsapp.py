from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Request, Response

from app.deps import require_user
from app.errors import api_error
from app.services.whatsapp import (
    create_whatsapp_link,
    get_green_auth_code,
    get_green_qr,
    get_green_state,
    get_wa_session_state,
    get_whatsapp_public_status,
    handle_whatsapp_webhook,
    save_green_config,
    save_whatsapp_phone,
    send_whatsapp_message,
    start_wa_session,
    stop_wa_session,
    unlink_whatsapp,
    verify_whatsapp_webhook,
)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


@router.get("/status")
async def status():
    return await get_whatsapp_public_status()


@router.post("/green")
async def green(user: Annotated[dict, Depends(require_user)], body: dict = Body(default={})):
    result = await save_green_config(body)
    if not result.get("ok"):
        raise api_error(400, result.get("message") or "Green-API dështoi")
    state = await get_green_state()
    return {**result, **state}


@router.get("/green/qr")
async def green_qr(_: Annotated[dict, Depends(require_user)]):
    return await get_green_qr()


@router.get("/green/state")
async def green_state(_: Annotated[dict, Depends(require_user)]):
    return await get_green_state()


@router.post("/green/code")
async def green_code(_: Annotated[dict, Depends(require_user)], body: dict = Body(default={})):
    result = await get_green_auth_code(body.get("phone"))
    if not result.get("ok"):
        raise api_error(400, result.get("message") or "Kodi dështoi")
    return result


@router.post("/link")
async def link(user: Annotated[dict, Depends(require_user)]):
    result = await create_whatsapp_link(user["_id"])
    if not result.get("ok"):
        raise api_error(400, result.get("message") or "Lidhja dështoi")
    return result


@router.post("/session/start")
async def session_start(user: Annotated[dict, Depends(require_user)], body: dict = Body(default={})):
    phone = body.get("phone") or user.get("whatsappPhone") or user.get("phone")
    return {"ok": True, **(await start_wa_session(phone))}


@router.get("/session")
async def session(_: Annotated[dict, Depends(require_user)]):
    return get_wa_session_state()


@router.post("/session/logout")
async def session_logout(_: Annotated[dict, Depends(require_user)]):
    return {"ok": True, **(await stop_wa_session())}


@router.post("/test")
async def test(user: Annotated[dict, Depends(require_user)], body: dict = Body(default={})):
    phone = body.get("phone") or user.get("whatsappPhone") or user.get("phone")
    if not phone:
        raise api_error(400, "Vendos numrin e WhatsApp.")
    text = f"✅ SmartQueue Kosova\nWhatsApp dërgon vetë.\n{user.get('name') or 'Qytetar'}\nKur rezervon termin, konfirmimi të vjen këtu — s’e hap ti."
    sent = await send_whatsapp_message(phone, text)
    if not sent.get("success"):
        raise api_error(400, sent.get("error") or "Lidh WhatsApp me QR/kod një herë, pastaj provo sërish.")
    return {"ok": True, "sent": True, "phone": phone, "via": sent.get("provider")}


@router.post("/phone")
async def phone(user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    result = await save_whatsapp_phone(user["_id"], body.get("phone"))
    if not result.get("ok"):
        raise api_error(400, result.get("message") or "Numri dështoi")
    return result


@router.post("/unlink")
async def unlink(user: Annotated[dict, Depends(require_user)]):
    return await unlink_whatsapp(user["_id"])


@router.get("/webhook")
async def verify(hub_mode: str | None = Query(None, alias="hub.mode"), hub_verify_token: str | None = Query(None, alias="hub.verify_token"), hub_challenge: str | None = Query(None, alias="hub.challenge")):
    challenge = verify_whatsapp_webhook(hub_mode, hub_verify_token, hub_challenge)
    if challenge:
        return Response(content=str(challenge), media_type="text/plain")
    return Response(status_code=403)


@router.post("/webhook")
async def incoming(request: Request):
    try:
        body = await request.json()
        await handle_whatsapp_webhook(body)
    except Exception as err:
        print("WhatsApp webhook:", err)
    return Response(status_code=200)
