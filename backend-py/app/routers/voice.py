from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import Response

from app.deps import optional_user
from app.errors import api_error
from app.services.stt import transcribe_audio_buffer
from app.services.tts import synthesize_speech
from app.services.voice import build_service_guide, handle_voice_intent

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.get("/briefing")
async def briefing(
    _: Annotated[dict | None, Depends(optional_user)],
    institutionId: str | None = None,
    serviceId: str | None = None,
    service: str | None = None,
    name: str | None = None,
    q: str = "",
    lang: str = "sq",
):
    return await build_service_guide(
        institution_id=institutionId,
        service_id=serviceId,
        service_name=service,
        name=name,
        transcript=q,
        language=lang,
    )


@router.post("/intent")
async def intent(_: Annotated[dict | None, Depends(optional_user)], body: dict = Body(default={})):
    return await handle_voice_intent(
        transcript=body.get("transcript"),
        institution_id=body.get("institutionId"),
        service_id=body.get("serviceId"),
        language=body.get("language") or "sq",
    )


@router.post("/transcribe")
async def transcribe(
    request: Request,
    _: Annotated[dict | None, Depends(optional_user)],
    language: str = Query("sq"),
):
    data = await request.body()
    mime = request.headers.get("content-type") or "application/octet-stream"
    try:
        transcript = await transcribe_audio_buffer(data, mime, language)
    except RuntimeError as err:
        if str(err) == "STT_NOT_CONFIGURED":
            raise api_error(503, "Transkriptimi i zërit nuk është i gatshëm.")
        raise api_error(502, str(err) or "Zëri nuk u transkriptua")
    except ValueError as err:
        raise api_error(422, str(err))
    if not transcript:
        raise api_error(422, "Nuk e dallova zërin. Flisni më qartë.")
    return {"transcript": transcript}


@router.post("/speak")
async def speak(_: Annotated[dict | None, Depends(optional_user)], body: dict = Body(default={}), text: str | None = None, lang: str | None = None):
    spoken = str(body.get("text") or text or "")
    language = body.get("lang") or lang or "sq"
    try:
        buffer, content_type = await synthesize_speech(spoken, language)
        return Response(content=buffer, media_type=content_type, headers={"Cache-Control": "no-store"})
    except Exception as err:
        raise api_error(502, str(err) or "Zëri nuk u krijua")
