from __future__ import annotations

import httpx

from app.config import env

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions"


def speech_language(lang: str = "sq") -> str:
    code = str(lang or "").lower()
    if code.startswith("en"):
        return "en"
    if code.startswith("sr"):
        return "sr"
    return "sq"


def filename_for(mime: str = "") -> str:
    type_ = (mime or "").lower()
    if "wav" in type_ or "wave" in type_:
        return "speech.wav"
    if "mp4" in type_:
        return "speech.mp4"
    if "aac" in type_:
        return "speech.aac"
    if "mpeg" in type_ or "mp3" in type_:
        return "speech.mp3"
    if "webm" in type_:
        return "speech.webm"
    if "ogg" in type_:
        return "speech.ogg"
    return "speech.wav"


def stt_configured() -> bool:
    return bool(env("GROQ_API_KEY") or env("OPENAI_API_KEY"))


async def _post_whisper(url: str, key: str, model: str, data: bytes, mime: str, language: str) -> str:
    files = {"file": (filename_for(mime), data, mime or "application/octet-stream")}
    form = {
        "model": model,
        "language": speech_language(language),
        "response_format": "json",
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, headers={"Authorization": f"Bearer {key}"}, data=form, files=files)
    payload = response.json() if response.content else {}
    if response.status_code >= 400:
        err = payload.get("error") if isinstance(payload, dict) else None
        message = (err or {}).get("message") if isinstance(err, dict) else payload.get("message")
        raise RuntimeError(message or f"STT {response.status_code}")
    return str(payload.get("text") or "").strip()


async def transcribe_audio_buffer(data: bytes, mime: str = "", language: str = "sq") -> str:
    if not data or len(data) < 200:
        raise ValueError("Audio shumë i shkurtër")
    if not stt_configured():
        raise RuntimeError("STT_NOT_CONFIGURED")

    groq_key = env("GROQ_API_KEY")
    openai_key = env("OPENAI_API_KEY")
    prefer = env("STT_PROVIDER").lower()
    groq_model = env("STT_MODEL") or "whisper-large-v3"
    openai_model = env("OPENAI_STT_MODEL") or "whisper-1"

    attempts: list = []
    if prefer == "openai" and openai_key:
        attempts.append(lambda: _post_whisper(OPENAI_URL, openai_key, openai_model, data, mime, language))
    if groq_key:
        attempts.append(lambda: _post_whisper(GROQ_URL, groq_key, groq_model, data, mime, language))
    if openai_key and prefer != "openai":
        attempts.append(lambda: _post_whisper(OPENAI_URL, openai_key, openai_model, data, mime, language))

    last_error: Exception = RuntimeError("STT dështoi")
    for attempt in attempts:
        try:
            text = await attempt()
            if text:
                return text
        except Exception as err:
            last_error = err
    raise last_error
