from __future__ import annotations

import hashlib
import io
from pathlib import Path

import httpx

from app.services.kosovo_accent import to_kosovo_accent

MAX_CHARS = 1400
_cache: dict[str, tuple[bytes, str]] = {}
CACHE_LIMIT = 40

VOICES = {
    "sq": {"voice": "sq-AL-AnilaNeural", "rate": "-4%"},
    "en": {"voice": "en-US-AriaNeural", "rate": "-2%"},
    "sr": {"voice": "sr-RS-SophieNeural", "rate": "-3%"},
}


def _cache_key(text: str, lang: str) -> str:
    return hashlib.sha1(f"{lang}:{text}".encode()).hexdigest()


def _remember(key: str, payload: tuple[bytes, str]) -> None:
    _cache[key] = payload
    if len(_cache) > CACHE_LIMIT:
        first = next(iter(_cache))
        _cache.pop(first, None)


def _split_chunks(text: str, size: int = 170) -> list[str]:
    clean = " ".join(str(text or "").split()).strip()
    if len(clean) <= size:
        return [clean]
    parts = []
    rest = clean
    while rest:
        if len(rest) <= size:
            parts.append(rest)
            break
        cut = rest.rfind(" ", 0, size)
        if cut < 40:
            cut = size
        parts.append(rest[:cut].strip())
        rest = rest[cut:].strip()
    return [p for p in parts if p]


async def _edge_speak(text: str, lang: str) -> bytes:
    import edge_tts

    cfg = VOICES.get(lang) or VOICES["sq"]
    communicate = edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"])
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    data = buf.getvalue()
    if len(data) < 80:
        raise RuntimeError("Edge TTS bosh")
    return data


async def _google_sq_speak(text: str) -> bytes:
    chunks = _split_chunks(text, 170)
    buffers = []
    async with httpx.AsyncClient(timeout=20) as client:
        for chunk in chunks:
            url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=sq&q={httpx.QueryParams({'q': chunk})['q']}"
            from urllib.parse import quote

            url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=sq&q={quote(chunk)}"
            res = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
                    "Referer": "https://translate.google.com/",
                },
            )
            if not res.is_success:
                raise RuntimeError(f"Google TTS {res.status_code}")
            buffers.append(res.content)
    data = b"".join(buffers)
    if len(data) < 80:
        raise RuntimeError("Google TTS bosh")
    return data


async def synthesize_speech(raw_text: str, raw_lang: str = "sq") -> tuple[bytes, str]:
    raw = str(raw_lang or "sq").lower()
    lang = "en" if raw.startswith("en") else "sr" if raw.startswith("sr") else "sq"
    prepared = to_kosovo_accent(raw_text) if lang == "sq" else raw_text
    text = " ".join(str(prepared or "").split()).strip()[:MAX_CHARS]
    if not text:
        raise ValueError("Teksti mungon")
    key = _cache_key(text, lang)
    if key in _cache:
        return _cache[key]
    try:
        buffer = await _edge_speak(text, lang)
    except Exception:
        if lang != "sq":
            raise
        buffer = await _google_sq_speak(text)
    payload = (buffer, "audio/mpeg")
    _remember(key, payload)
    return payload
