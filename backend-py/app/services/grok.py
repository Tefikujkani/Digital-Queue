from __future__ import annotations

import json

import httpx

from app.config import GROK_MODEL, XAI_API_KEY
from app.services.chat_tools import GROK_TOOLS, execute_chat_tool
from app.services.local_assistant import chat_locally

XAI_BASE = "https://api.x.ai/v1"
MAX_TOOL_ROUNDS = 5


def is_grok_configured() -> bool:
    return bool((XAI_API_KEY or "").strip())


def normalize_lang(raw) -> str:
    lang = str(raw or "").lower()[:2]
    return lang if lang in {"sq", "en", "sr"} else "sq"


def get_suggested_prompts(language="sq"):
    lang = normalize_lang(language)
    return {
        "sq": [
            "Si e marr një numër digjital?",
            "Cilat institucione ka në Prishtinë?",
            "Sa është pritja tani në spital?",
            "Si rezervoj një termin?",
            "Cilat janë prioritetet e radhës?",
            "Ku i shoh ticket-et e mia?",
        ],
        "en": [
            "How do I get a digital number?",
            "Which institutions are in Prishtina?",
            "How long is the hospital wait right now?",
            "How do I book an appointment?",
            "What queue priorities exist?",
            "Where can I see my tickets?",
        ],
        "sr": [
            "Kako da uzmem digitalni broj?",
            "Koje institucije ima u Prištini?",
            "Koliko se sada čeka u bolnici?",
            "Kako da rezervišem termin?",
            "Koji prioriteti postoje u redu?",
            "Gde da vidim svoje tikete?",
        ],
    }[lang]


def get_chat_status():
    return {
        "configured": is_grok_configured(),
        "model": GROK_MODEL,
        "mode": "grok" if is_grok_configured() else "local",
        "assistant": "SmartQueue Assistant",
    }


def _system_prompt(user, language):
    lang = normalize_lang(language)
    output = {"sq": "Kosovo Albanian (shqip i Kosovës)", "en": "English", "sr": "Serbian in Latin script"}[lang]
    user_block = (
        f"Signed-in user: {user.get('name')} ({user.get('email')}), role={user.get('role')}."
        if user
        else "Visitor (not signed in)."
    )
    return f"""You are the SmartQueue Assistant — civic guide for SmartQueue Kosova.
Always reply only in {output}. Do not invent document lists; use tools.
{user_block}"""


async def chat_with_grok(messages, language="sq", user=None, on_event=None):
    if not is_grok_configured():
        if on_event:
            on_event({"type": "mode", "mode": "local"})
        return await chat_locally(messages, language, user, on_event)
    try:
        if on_event:
            on_event({"type": "mode", "mode": "grok", "model": GROK_MODEL})
        return await _engine(messages, language, user, on_event)
    except Exception as err:
        print("Grok dështoi, kaloj te lokale:", err)
        if on_event:
            on_event({"type": "mode", "mode": "local_fallback", "reason": str(err)})
        return await chat_locally(messages, language, user, on_event)


async def _engine(messages, language, user, on_event):
    lang = normalize_lang(language)
    conversation = [
        {"role": "system", "content": _system_prompt(user, lang)},
        *[
            {"role": m["role"], "content": str(m.get("content") or "")[:4000]}
            for m in messages
            if m.get("role") in {"user", "assistant"}
        ][-16:],
    ]
    tools_used = []
    async with httpx.AsyncClient(timeout=45) as client:
        for _ in range(MAX_TOOL_ROUNDS):
            res = await client.post(
                f"{XAI_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {XAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROK_MODEL,
                    "messages": conversation,
                    "temperature": 0.55,
                    "max_tokens": 1800,
                    "tools": GROK_TOOLS,
                    "tool_choice": "auto",
                },
            )
            if not res.is_success:
                raise RuntimeError(f"Grok API {res.status_code}")
            data = res.json()
            msg = ((data.get("choices") or [{}])[0].get("message")) or {}
            tool_calls = msg.get("tool_calls") or []
            if tool_calls:
                conversation.append(msg)
                for tc in tool_calls:
                    fn = (tc.get("function") or {}).get("name")
                    try:
                        args = json.loads((tc.get("function") or {}).get("arguments") or "{}")
                    except Exception:
                        args = {}
                    if on_event:
                        on_event({"type": "tool_start", "tool": fn, "args": args})
                    result = await execute_chat_tool(fn, args, {"user": user, "language": lang})
                    tools_used.append(fn)
                    if on_event:
                        on_event({"type": "tool_end", "tool": fn, "ok": not result.get("error")})
                    conversation.append({"role": "tool", "tool_call_id": tc.get("id"), "content": json.dumps(result, default=str)})
                continue
            content = msg.get("content") or ""
            if on_event:
                on_event({"type": "delta", "content": content})
                on_event({"type": "done", "content": content, "toolsUsed": tools_used, "model": data.get("model") or GROK_MODEL})
            return {"content": content, "toolsUsed": tools_used, "model": data.get("model") or GROK_MODEL}
    raise RuntimeError("Tejkalohen raundet e mjeteve")
