import { sendSMS } from './smsService.js'
import { sendEmail } from './emailService.js'

/**
 * Formato orën e terminit në zonën e Kosovës
 */
export function formatAppointmentLocal(scheduledAt) {
  const d = new Date(scheduledAt)
  const dateStr = d.toLocaleDateString('sq-AL', {
    timeZone: 'Europe/Belgrade',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('sq-AL', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
  })
  return { dateStr, timeStr }
}

export function buildAppointmentSms({
  ticketNumber,
  institutionName,
  serviceName,
  scheduledAt,
  kind = 'confirm',
}) {
  const { dateStr, timeStr } = formatAppointmentLocal(scheduledAt)
  if (kind === 'reminder') {
    return `SmartQueue Kujtesë: Termini juaj te ${institutionName} (${serviceName || 'shërbim'}) është ${dateStr} ora ${timeStr}. Numri: ${ticketNumber}. Merrni QR-në me vete.`
  }
  return `SmartQueue: Termini u KONFIRMUAR. ${institutionName} — ${serviceName || 'shërbim'}. ${dateStr} ora ${timeStr}. Numri: ${ticketNumber}. Hap aplikacionin për QR.`
}

/**
 * Free SMS sampler via Textbelt (1 SMS/day with key "textbelt")
 * Set TEXTBELT_KEY in .env — default "textbelt" for free tier.
 * Docs: https://textbelt.com
 */
export async function sendFreeTextbeltSMS(to, body) {
  const key = process.env.TEXTBELT_KEY || 'textbelt'
  let phone = String(to || '').replace(/\s+/g, '')
  if (!phone) return { success: false, reason: 'no_phone' }

  if (!phone.startsWith('+')) {
    if (phone.startsWith('0')) phone = '+383' + phone.slice(1)
    else phone = '+383' + phone
  }

  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: body.slice(0, 320), key }),
    })
    const data = await res.json()
    if (data.success) {
      console.log('✅ Textbelt SMS OK', data.textId)
      return { success: true, provider: 'textbelt', id: data.textId }
    }
    console.warn('⚠️ Textbelt:', data.error || data)
    return { success: false, provider: 'textbelt', error: data.error || 'failed' }
  } catch (err) {
    return { success: false, provider: 'textbelt', error: err.message }
  }
}

/**
 * Optional free Android SMS gateway webhook (e.g. textbee / your phone)
 * Set SMS_GATEWAY_URL=https://... in .env
 */
export async function sendGatewaySMS(to, body) {
  const url = process.env.SMS_GATEWAY_URL
  if (!url) return { success: false, reason: 'no_gateway' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SMS_GATEWAY_TOKEN
          ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ to, phone: to, message: body, text: body }),
    })
    if (!res.ok) {
      const t = await res.text()
      return { success: false, provider: 'gateway', error: t.slice(0, 200) }
    }
    console.log('✅ Gateway SMS OK')
    return { success: true, provider: 'gateway' }
  } catch (err) {
    return { success: false, provider: 'gateway', error: err.message }
  }
}

/**
 * Cascading free-first SMS delivery:
 * 1) Twilio (if configured + credits)
 * 2) Custom Android/SMS gateway webhook (free with your SIM)
 * 3) Textbelt free sampler
 * 4) Email SMS-style fallback (always free via Gmail SMTP)
 */
export async function sendAppointmentSMS({ phone, email, body, subject }) {
  const results = []

  if (phone) {
    const twilio = await sendSMS(phone, body)
    results.push({ channel: 'twilio', ...normalizeResult(twilio) })
    if (twilio?.success || twilio?.sid) {
      return { delivered: true, via: 'twilio', results }
    }

    const gateway = await sendGatewaySMS(phone, body)
    results.push({ channel: 'gateway', ...gateway })
    if (gateway.success) return { delivered: true, via: 'gateway', results }

    const textbelt = await sendFreeTextbeltSMS(phone, body)
    results.push({ channel: 'textbelt', ...textbelt })
    if (textbelt.success) return { delivered: true, via: 'textbelt', results }
  }

  // Free reliable fallback: email that looks like an SMS alert
  if (email) {
    const mail = await sendEmail(
      email,
      subject || '📱 SmartQueue — njoftim termini',
      `<div style="font-family:sans-serif;padding:24px">
        <h2 style="color:#7f41ff;margin:0 0 12px">Njoftim termini (SMS backup)</h2>
        <p style="font-size:16px;line-height:1.5;white-space:pre-wrap">${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px">
          Ky email u dërgua sepse SMS nuk ishte i disponueshëm ose dështoi.
          Aktivizo SMS te Cilësimet ose shto kredi Twilio / gateway falas.
        </p>
      </div>`,
    )
    results.push({ channel: 'email_fallback', success: !!mail?.success })
    if (mail?.success) return { delivered: true, via: 'email_fallback', results }
  }

  return { delivered: false, via: null, results }
}

function normalizeResult(r) {
  if (!r) return { success: false }
  if (r.sid) return { success: true, sid: r.sid }
  return { success: !!r.success, error: r.error || r.reason }
}
