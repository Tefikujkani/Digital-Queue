"""Load env from backend-py/.env then backend/.env (same keys as Node)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
NODE_BACKEND = ROOT.parent / "backend"

load_dotenv(ROOT / ".env")
load_dotenv(NODE_BACKEND / ".env", override=False)


def env(name: str, default: str | None = None) -> str:
    value = os.getenv(name)
    if value is None or value == "":
        return default if default is not None else ""
    return value


def env_int(name: str, default: int) -> int:
    raw = env(name)
    try:
        return int(raw) if raw else default
    except ValueError:
        return default


def env_bool(name: str, default: bool = False) -> bool:
    raw = env(name).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


NODE_ENV = env("NODE_ENV", "development")
IS_PROD = NODE_ENV == "production"

PORT = env_int("PORT", 5001)
MONGODB_URI = env("MONGODB_URI")
JWT_SECRET = env("JWT_SECRET", "dev-only-change-me")
JWT_EXPIRES = env("JWT_EXPIRES", "7d")
CLIENT_URL = env("CLIENT_URL", "http://localhost:5178")
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID") or env("VITE_GOOGLE_CLIENT_ID")

MAX_SLOT_BOOKINGS = env_int("MAX_SLOT_BOOKINGS", 8)
SLOT_MINUTES = 30

SMTP_HOST = env("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = env_int("SMTP_PORT", 587)
SMTP_USER = env("SMTP_USER")
SMTP_PASS = env("SMTP_PASS")
SMTP_FROM = env("SMTP_FROM") or (f"SmartQueue Kosova <{SMTP_USER}>" if SMTP_USER else "SmartQueue Kosova")
SMTP_SERVICE = env("SMTP_SERVICE", "gmail")

XAI_API_KEY = env("XAI_API_KEY")
GROK_MODEL = env("GROK_MODEL", "grok-4-1-fast-reasoning")

TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN")
TELEGRAM_WEBHOOK_URL = env("TELEGRAM_WEBHOOK_URL")
TELEGRAM_WEBHOOK_SECRET = env("TELEGRAM_WEBHOOK_SECRET")

VIBER_AUTH_TOKEN = env("VIBER_AUTH_TOKEN")
VIBER_BOT_URI = env("VIBER_BOT_URI") or env("VIBER_BOT_NAME")
VIBER_SENDER_NAME = env("VIBER_SENDER_NAME", "SmartQueue Kosova")
VIBER_WEBHOOK_URL = env("VIBER_WEBHOOK_URL")

WHATSAPP_TOKEN = env("WHATSAPP_TOKEN") or env("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = env("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_BUSINESS_NUMBER = env("WHATSAPP_BUSINESS_NUMBER")
WHATSAPP_VERIFY_TOKEN = env("WHATSAPP_VERIFY_TOKEN", "smartqueue_wa_verify")
WHATSAPP_API_VERSION = env("WHATSAPP_API_VERSION", "v21.0")
WHATSAPP_TEMPLATE_CONFIRM = env("WHATSAPP_TEMPLATE_CONFIRM")
WHATSAPP_TEMPLATE_LANG = env("WHATSAPP_TEMPLATE_LANG", "sq")

GREEN_API_ID = env("GREEN_API_ID") or env("GREEN_API_INSTANCE")
GREEN_API_TOKEN = env("GREEN_API_TOKEN")
GREEN_API_URL = env("GREEN_API_URL")

SMS_PROVIDER_ORDER = env("SMS_PROVIDER_ORDER", "textbee,textbelt,gateway,infobip,vonage,twilio")
TEXTBEE_API_KEY = env("TEXTBEE_API_KEY")
TEXTBEE_DEVICE_ID = env("TEXTBEE_DEVICE_ID")
TEXTBELT_KEY = env("TEXTBELT_KEY", "textbelt")
SMS_GATEWAY_URL = env("SMS_GATEWAY_URL")
SMS_GATEWAY_TOKEN = env("SMS_GATEWAY_TOKEN")
INFOBIP_API_KEY = env("INFOBIP_API_KEY")
INFOBIP_BASE_URL = env("INFOBIP_BASE_URL", "https://api.infobip.com")
INFOBIP_SENDER = env("INFOBIP_SENDER", "SmartQueue")
VONAGE_API_KEY = env("VONAGE_API_KEY")
VONAGE_API_SECRET = env("VONAGE_API_SECRET")
VONAGE_FROM = env("VONAGE_FROM", "SmartQueue")
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = env("TWILIO_PHONE_NUMBER")
TWILIO_MESSAGING_SERVICE_SID = env("TWILIO_MESSAGING_SERVICE_SID")

CORS_ORIGINS = [CLIENT_URL, "http://localhost:5173", "http://localhost:5178"]


def configured(value: str, min_len: int = 3) -> bool:
    v = (value or "").strip()
    return bool(v) and "your_" not in v and len(v) > min_len
