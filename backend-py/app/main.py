from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import socketio
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import CLIENT_URL, CORS_ORIGINS, IS_PROD, JWT_SECRET, NODE_ENV, PORT
from app.db import close_db, ensure_indexes, ping
from app.routers import analytics, auth, chat, citizen, favorites, institutions, notifications, telegram, tickets, viber, voice, whatsapp
from app.services.notifications import NotificationService
from app.services.reminders import start_appointment_reminder_job
from app.services.telegram import is_telegram_configured, start_telegram_poller
from app.services.viber import is_viber_configured, start_viber_webhook
from app.services.whatsapp import get_green_state, get_wa_session_state
from app.sockets import sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    if IS_PROD:
        if not JWT_SECRET or len(JWT_SECRET) < 16:
            raise RuntimeError("JWT_SECRET i dobët — ndalo startin në production")
        if not CLIENT_URL or "localhost" in CLIENT_URL and IS_PROD:
            if not CLIENT_URL:
                raise RuntimeError("CLIENT_URL mungon në production")
    await ensure_indexes()
    app.state.sio = sio
    app.state.notifier = NotificationService(sio)
    asyncio.create_task(start_appointment_reminder_job(sio))
    if is_telegram_configured():
        asyncio.create_task(start_telegram_poller())
    else:
        print("💡 Telegram OFF — vendos TELEGRAM_BOT_TOKEN për njoftime falas")
    if is_viber_configured():
        asyncio.create_task(start_viber_webhook())
    else:
        print("💡 Viber OFF — vendos VIBER_AUTH_TOKEN + VIBER_BOT_URI")
    try:
        green = await get_green_state()
        session = get_wa_session_state()
        if session.get("ready") or session.get("hasSession"):
            print("📱 WhatsApp session: Green-API / Meta")
        elif green.get("authorized"):
            print("📱 WhatsApp ON — Green-API")
        else:
            print("💡 WhatsApp: Cilësimet → lidh një herë me QR")
    except Exception:
        pass
    print(f"🚀 SmartQueue FastAPI running in {NODE_ENV} mode")
    yield
    await close_db()


app = FastAPI(title="SmartQueue Kosova API", version="2.0.0", lifespan=lifespan)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Gabim"
    return JSONResponse(status_code=exc.status_code, content={"message": message})


@app.exception_handler(Exception)
async def unhandled(_request: Request, exc: Exception):
    print("❌", exc)
    return JSONResponse(
        status_code=500,
        content={"message": "Gabim i brendshëm i serverit" if IS_PROD else str(exc)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if IS_PROD else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(institutions.router)
app.include_router(tickets.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(chat.router)
app.include_router(favorites.router)
app.include_router(citizen.router)
app.include_router(telegram.router)
app.include_router(viber.router)
app.include_router(whatsapp.router)
app.include_router(voice.router)


@app.get("/health")
async def health():
    from datetime import datetime, timezone

    return {
        "ok": True,
        "service": "SmartQueue Kosova API",
        "env": NODE_ENV,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ready")
async def ready():
    if not await ping():
        return JSONResponse(status_code=503, content={"ok": False, "db": "down"})
    return {"ok": True, "db": "up"}


@app.get("/")
async def root():
    return {"name": "SmartQueue Kosova API", "version": "2.0.0", "health": "/health", "ready": "/ready"}


asgi = socketio.ASGIApp(sio, other_asgi_app=app)


def run():
    uvicorn.run("app.main:asgi", host="0.0.0.0", port=PORT, reload=not IS_PROD)


if __name__ == "__main__":
    run()
