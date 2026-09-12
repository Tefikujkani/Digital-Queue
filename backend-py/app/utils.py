from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import bcrypt
import jwt

from app.config import JWT_EXPIRES, JWT_SECRET

KOSOVO_TZ = ZoneInfo("Europe/Belgrade")

PRIORITY_RANK = {
    "emergency": 0,
    "elderly": 1,
    "disability": 2,
    "normal": 3,
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_expires(raw: str) -> timedelta:
    text = (raw or "7d").strip().lower()
    if text.endswith("d"):
        return timedelta(days=int(text[:-1] or 7))
    if text.endswith("h"):
        return timedelta(hours=int(text[:-1] or 24))
    if text.endswith("m"):
        return timedelta(minutes=int(text[:-1] or 60))
    if text.endswith("s"):
        return timedelta(seconds=int(text[:-1] or 3600))
    try:
        return timedelta(seconds=int(text))
    except ValueError:
        return timedelta(days=7)


def generate_token(user_id) -> str:
    payload = {
        "id": str(user_id),
        "exp": now_utc() + parse_expires(JWT_EXPIRES),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def match_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def validate_password(password: str | None) -> str | None:
    if not password or len(str(password)) < 8:
        return "Fjalëkalimi duhet të ketë të paktën 8 karaktere"
    return None


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def random_hex(n: int = 32) -> str:
    return secrets.token_hex(n)


def priority_rank(priority: str | None) -> int:
    return PRIORITY_RANK.get(priority or "normal", 3)


def parse_kosovo_local(date_str: str, time_str: str = "00:00") -> datetime | None:
    time_norm = str(time_str)
    if len(time_norm) == 5:
        time_norm = f"{time_norm}:00"
    desired = f"{str(date_str)[:10]}T{time_norm}"
    try:
        naive = datetime.fromisoformat(desired)
    except ValueError:
        return None
    local = naive.replace(tzinfo=KOSOVO_TZ)
    return local.astimezone(timezone.utc)


def kosovo_minutes_of_day(dt: datetime) -> int:
    local = dt.astimezone(KOSOVO_TZ)
    return local.hour * 60 + local.minute


def within_kosovo_working_hours(institution: dict | None, dt: datetime) -> bool:
    hours = (institution or {}).get("workingHours") or {}
    open_s = hours.get("open") or "08:00"
    close_s = hours.get("close") or "16:00"
    oh, om = [int(x) for x in open_s.split(":")[:2]]
    ch, cm = [int(x) for x in close_s.split(":")[:2]]
    mins = kosovo_minutes_of_day(dt)
    return oh * 60 + om <= mins < ch * 60 + cm


def format_appointment_local(scheduled_at) -> tuple[str, str]:
    if not scheduled_at:
        return "", ""
    if isinstance(scheduled_at, str):
        dt = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
    else:
        dt = scheduled_at
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    local = dt.astimezone(KOSOVO_TZ)
    weekdays = ["e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë", "e diel"]
    months = [
        "janar",
        "shkurt",
        "mars",
        "prill",
        "maj",
        "qershor",
        "korrik",
        "gusht",
        "shtator",
        "tetor",
        "nëntor",
        "dhjetor",
    ]
    date_str = f"{weekdays[local.weekday()]}, {local.day:02d} {months[local.month - 1]} {local.year}"
    time_str = local.strftime("%H:%M")
    return date_str, time_str


def to_e164_kosovo(to: str | None) -> str | None:
    n = str(to or "").strip().replace(" ", "")
    if not n:
        return None
    if not n.startswith("+"):
        if n.startswith("00"):
            n = "+" + n[2:]
        elif n.startswith("0"):
            n = "+383" + n[1:]
        elif len(n) in (8, 9):
            n = "+383" + n
        else:
            n = "+" + n
    return n
