from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends

from app.db import col
from app.deps import require_superadmin, require_user
from app.errors import api_error
from app.serialize import oid, public_user
from app.services.email import send_email
from app.utils import generate_token, hash_password, match_password, now_utc, random_hex, sha256_hex, validate_password
from app.config import CLIENT_URL, GOOGLE_CLIENT_ID
from datetime import timedelta

import httpx

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(body: dict = Body(...)):
    name = str(body.get("name") or "").strip()
    email = str(body.get("email") or "").lower().strip()
    password = body.get("password")
    phone = body.get("phone")
    if not name or not email or not password:
        raise api_error(400, "Emri, email dhe fjalëkalimi janë të detyrueshëm")
    pw_err = validate_password(password)
    if pw_err:
        raise api_error(400, pw_err)
    if await col.users.find_one({"email": email}):
        raise api_error(400, "Ky email ekziston tashmë")
    now = now_utc()
    doc = {
        "name": name[:80],
        "email": email,
        "password": hash_password(password),
        "role": "citizen",
        "phone": str(phone).strip()[:20] if phone else None,
        "favorites": [],
        "preferredCity": "Prishtinë",
        "telegramChatId": "",
        "viberId": "",
        "whatsappPhone": "",
        "notificationPrefs": {"inApp": True, "email": True, "sms": False, "telegram": False, "viber": False, "whatsapp": False},
        "createdAt": now,
        "updatedAt": now,
    }
    result = await col.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {**public_user(doc), "token": generate_token(doc["_id"])}


@router.post("/login")
async def login(body: dict = Body(...)):
    email = str(body.get("email") or "").lower().strip()
    password = body.get("password")
    if not email or not password:
        raise api_error(400, "Email dhe fjalëkalimi janë të detyrueshëm")
    user = await col.users.find_one({"email": email})
    if user and not user.get("password") and user.get("googleId"):
        raise api_error(401, "Kjo llogari përdor Google. Shtyp «Vazhdo me Google».")
    if user and match_password(str(password), user.get("password") or ""):
        return {**public_user(user), "token": generate_token(user["_id"])}
    raise api_error(401, "Email ose fjalëkalim i gabuar")


@router.post("/google")
async def google_login(body: dict = Body(...)):
    credential = body.get("credential") or body.get("idToken") or ""
    client_id = (GOOGLE_CLIENT_ID or "").strip()
    if not client_id:
        raise api_error(503, "Google Sign-In nuk është konfiguruar")
    if not credential:
        raise api_error(400, "Token Google mungon")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
        )
    data = response.json() if response.content else {}
    if (
        not response.is_success
        or data.get("error")
        or data.get("aud") != client_id
        or data.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}
    ):
        raise api_error(401, "Token Google i pavlefshëm")
    if data.get("email_verified") not in (True, "true"):
        raise api_error(401, "Email i Google nuk është i verifikuar")

    email = str(data.get("email") or "").lower().strip()
    google_id = str(data.get("sub") or "")
    name = str(data.get("name") or (email.split("@")[0] if email else "Qytetar")).strip()[:80]
    if not email or not google_id:
        raise api_error(400, "Google nuk dha email")

    user = await col.users.find_one({"googleId": google_id}) or await col.users.find_one({"email": email})
    now = now_utc()
    if user:
        if not user.get("googleId"):
            await col.users.update_one({"_id": user["_id"]}, {"$set": {"googleId": google_id, "updatedAt": now}})
            user["googleId"] = google_id
    else:
        doc = {
            "name": name,
            "email": email,
            "googleId": google_id,
            "role": "citizen",
            "favorites": [],
            "preferredCity": "Prishtinë",
            "telegramChatId": "",
            "viberId": "",
            "whatsappPhone": "",
            "notificationPrefs": {
                "inApp": True,
                "email": True,
                "sms": False,
                "telegram": False,
                "viber": False,
                "whatsapp": False,
            },
            "createdAt": now,
            "updatedAt": now,
        }
        result = await col.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        user = doc
    return {**public_user(user), "token": generate_token(user["_id"])}


@router.get("/profile")
async def profile(user: Annotated[dict, Depends(require_user)]):
    fresh = await col.users.find_one({"_id": user["_id"]}, {"password": 0})
    if not fresh:
        raise api_error(404, "User not found")
    return public_user(fresh)


@router.put("/profile")
async def update_profile(user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    updates = {"updatedAt": now_utc()}
    if body.get("name") is not None:
        updates["name"] = str(body["name"]).strip()[:80]
    if body.get("phone") is not None:
        updates["phone"] = str(body["phone"]).strip()[:20]
    if body.get("preferredCity") is not None:
        updates["preferredCity"] = str(body["preferredCity"])[:80]
    await col.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await col.users.find_one({"_id": user["_id"]}, {"password": 0})
    return public_user(fresh)


@router.put("/password")
async def change_password(user: Annotated[dict, Depends(require_user)], body: dict = Body(...)):
    pw_err = validate_password(body.get("newPassword"))
    if pw_err:
        raise api_error(400, pw_err)
    fresh = await col.users.find_one({"_id": user["_id"]})
    if not fresh:
        raise api_error(404, "User not found")
    if not match_password(str(body.get("currentPassword") or ""), fresh.get("password") or ""):
        raise api_error(400, "Fjalëkalimi aktual është gabim")
    await col.users.update_one({"_id": user["_id"]}, {"$set": {"password": hash_password(body["newPassword"]), "updatedAt": now_utc()}})
    return {"message": "Fjalëkalimi u ndryshua"}


@router.post("/forgot-password")
async def forgot_password(body: dict = Body(...)):
    generic = {"message": "Nëse email ekziston, do të marrësh udhëzime për rivendosje."}
    email = str(body.get("email") or "").lower().strip()
    user = await col.users.find_one({"email": email})
    if not user:
        return generic
    token = random_hex(32)
    await col.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resetPasswordToken": sha256_hex(token), "resetPasswordExpires": now_utc() + timedelta(hours=1)}},
    )
    from urllib.parse import quote

    link = f"{CLIENT_URL}/reset-password?token={token}&email={quote(email)}"
    await send_email(
        email,
        "Rivendos fjalëkalimin — SmartQueue",
        f"<div style='font-family:sans-serif;padding:24px'><h2>Rivendos fjalëkalimin</h2><p><a href='{link}'>{link}</a></p></div>",
    )
    return generic


@router.post("/reset-password")
async def reset_password(body: dict = Body(...)):
    pw_err = validate_password(body.get("newPassword"))
    if pw_err:
        raise api_error(400, pw_err)
    email = str(body.get("email") or "").lower().strip()
    token = body.get("token")
    if not email or not token:
        raise api_error(400, "Të dhëna të paplota")
    user = await col.users.find_one(
        {"email": email, "resetPasswordToken": sha256_hex(str(token)), "resetPasswordExpires": {"$gt": now_utc()}}
    )
    if not user:
        raise api_error(400, "Token i pavlefshëm ose i skaduar")
    await col.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": hash_password(body["newPassword"]), "updatedAt": now_utc()},
            "$unset": {"resetPasswordToken": "", "resetPasswordExpires": ""},
        },
    )
    return {"message": "Fjalëkalimi u rivendos. Mund të kyçesh."}


@router.delete("/me")
async def delete_me(user: Annotated[dict, Depends(require_user)], body: dict = Body(default={})):
    fresh = await col.users.find_one({"_id": user["_id"]})
    if not fresh:
        raise api_error(404, "User not found")
    if not match_password(str(body.get("password") or ""), fresh.get("password") or ""):
        raise api_error(400, "Fjalëkalimi është gabim")
    await col.tickets.update_many(
        {"userId": user["_id"], "status": {"$in": ["waiting", "checked_in", "called"]}},
        {"$set": {"status": "cancelled"}},
    )
    await col.users.delete_one({"_id": user["_id"]})
    return {"message": "Llogaria u fshi. Të dhënat personale u hoqën."}


@router.get("/users")
async def all_users(_: Annotated[dict, Depends(require_superadmin)]):
    users = await col.users.find({}, {"password": 0}).to_list(500)
    return [public_user(u) for u in users]


@router.post("/staff")
async def create_staff(_: Annotated[dict, Depends(require_superadmin)], body: dict = Body(...)):
    if body.get("role") != "admin":
        raise api_error(400, "Vetëm role admin lejohet këtu")
    pw_err = validate_password(body.get("password"))
    if pw_err:
        raise api_error(400, pw_err)
    if not body.get("institutionId"):
        raise api_error(400, "institutionId është i detyrueshëm")
    email = str(body.get("email") or "").lower().strip()
    if await col.users.find_one({"email": email}):
        raise api_error(400, "Email ekziston")
    now = now_utc()
    doc = {
        "name": str(body.get("name") or "").strip(),
        "email": email,
        "password": hash_password(body["password"]),
        "role": "admin",
        "institutionId": oid(body["institutionId"]),
        "phone": body.get("phone"),
        "favorites": [],
        "notificationPrefs": {"inApp": True, "email": True, "sms": False},
        "createdAt": now,
        "updatedAt": now,
    }
    result = await col.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return public_user(doc)
