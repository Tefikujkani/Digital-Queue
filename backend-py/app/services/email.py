from __future__ import annotations

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER


async def send_email(to: str, subject: str, html_content: str) -> dict:
    if not SMTP_USER or not SMTP_PASS:
        print("⚠️ Email nuk është konfiguruar. Vendos SMTP_USER dhe SMTP_PASS në .env")
        return {"success": False, "reason": "Email not configured"}
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html_content, "html", "utf-8"))
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USER,
            password=SMTP_PASS,
        )
        print(f"✅ Email u dërgua te {to}")
        return {"success": True}
    except Exception as err:
        print(f"❌ Email Error: {err}")
        return {"success": False, "error": str(err)}


def ticket_issued_email(user_name, ticket_number, institution_name, scheduled_at, service_name):
    from app.utils import format_appointment_local

    date_str, time_str = format_appointment_local(scheduled_at) if scheduled_at else ("", "")
    return {
        "subject": f"🎫 Bileta {ticket_number} — {institution_name}",
        "html": f"""
      <div style="font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); padding: 30px 20px; color: #ffffff;">
            <p style="margin: 0; font-size: 14px; text-transform: uppercase;">SmartQueue Kosova</p>
            <h1 style="margin: 10px 0 0 0; font-size: 28px;">Bileta Juaj Elektronike</h1>
          </div>
          <div style="padding: 30px 40px;">
            <p style="color: #4b5563; font-size: 16px; text-align: left;">
              Përshëndetje <strong>{user_name}</strong>, <br/>Termini juaj është konfirmuar me sukses.
            </p>
            <div style="margin: 30px 0; padding: 25px 0; border: 2px dashed #e5e7eb; border-radius: 16px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase;">Numri i Biletës</p>
              <h2 style="margin: 10px 0 0 0; color: #6c5ce7; font-size: 56px;">{ticket_number}</h2>
            </div>
            <div style="text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Institucioni</p>
              <p style="margin: 4px 0 16px; font-size: 18px; font-weight: 600;">{institution_name}</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Shërbimi</p>
              <p style="margin: 4px 0 16px; font-size: 16px;">{service_name or "Shërbim i Përgjithshëm"}</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Data / Ora</p>
              <p style="margin: 4px 0 0; font-size: 16px;">{date_str} {time_str}</p>
            </div>
          </div>
        </div>
      </div>
    """,
    }


def ticket_called_email(user_name, ticket_number, counter_name):
    return {
        "subject": f"📢 Radha juaj — Bileta {ticket_number}",
        "html": f"<div style='font-family:sans-serif;padding:24px'><h1>Radha Juaj!</h1><p>I/e nderuar <strong>{user_name}</strong>, numri <strong>{ticket_number}</strong> u thirr. Drejtohuni te <strong>{counter_name or 'Sporteli'}</strong>.</p></div>",
    }


def ticket_completed_email(user_name, ticket_number):
    return {
        "subject": f"✅ Shërbimi u krye — Bileta {ticket_number}",
        "html": f"<div style='font-family:sans-serif;padding:24px'><h1>Faleminderit!</h1><p>I/e nderuar <strong>{user_name}</strong>, shërbimi me biletën <strong>{ticket_number}</strong> u përfundua.</p></div>",
    }
