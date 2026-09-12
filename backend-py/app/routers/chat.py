from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import StreamingResponse

from app.config import IS_PROD
from app.deps import optional_user
from app.errors import api_error
from app.services.grok import chat_with_grok, get_chat_status, get_suggested_prompts, is_grok_configured, normalize_lang

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/suggestions")
async def suggestions(lang: str | None = None, language: str | None = None):
    language = normalize_lang(lang or language)
    return {
        "suggestions": get_suggested_prompts(language),
        "assistant": {
            "name": "SmartQueue Assistant",
            "poweredBy": "Grok · xAI" if is_grok_configured() else "SmartQueue Live",
            "mode": "grok" if is_grok_configured() else "local",
        },
    }


@router.get("/status")
async def status():
    return get_chat_status()


@router.post("/")
async def chat(user: Annotated[dict | None, Depends(optional_user)], body: dict = Body(...)):
    messages = body.get("messages")
    language = normalize_lang(body.get("language"))
    stream = body.get("stream", True) is not False
    if not isinstance(messages, list) or not messages:
        raise api_error(400, "Duhet të dërgoni mesazhe")
    last = messages[-1]
    if not last.get("content") or not isinstance(last.get("content"), str):
        raise api_error(400, "Mesazhi i fundit duhet të ketë përmbajtje")
    if len(last["content"].strip()) > 2000:
        raise api_error(400, "Mesazhi është shumë i gjatë (max 2000 karaktere)")

    if stream:
        async def event_stream():
            yield f"data: {json.dumps({'type': 'start', 'mode': 'grok' if is_grok_configured() else 'local'})}\n\n"
            try:
                await chat_with_grok(
                    messages,
                    language,
                    user,
                    on_event=None,
                )
            except Exception:
                pass

        # Use a queue-like callback via list then yield — chat_with_grok is sync-callback.
        # Collect then stream for reliability with our callback API.
        events = []

        def on_event(payload):
            events.append(payload)

        async def produce():
            yield f"data: {json.dumps({'type': 'start', 'mode': 'grok' if is_grok_configured() else 'local'})}\n\n"
            try:
                await chat_with_grok(messages, language, user, on_event)
                for ev in events:
                    yield f"data: {json.dumps(ev, default=str)}\n\n"
            except Exception as err:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Na vjen keq, asistenti pati një problem. Provo përsëri.', 'detail': None if IS_PROD else str(err)})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(produce(), media_type="text/event-stream; charset=utf-8", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})

    events = []
    result = await chat_with_grok(messages, language, user, events.append)
    return {"reply": result.get("content"), "toolsUsed": result.get("toolsUsed"), "model": result.get("model"), "events": events}
