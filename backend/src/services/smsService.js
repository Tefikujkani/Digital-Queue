/**
 * SmartQueue SMS Router — multi-provider i avancuar
 *
 * Prioriteti falas-first (SMS_PROVIDER_ORDER):
 *   textbee → textbelt → gateway → infobip → vonage → twilio
 *
 * Plus kanale falas (jo SMS):
 *   telegram, viber, email_fallback
 */

import twilio from 'twilio'
import { sendEmail } from './emailService.js'

export function toE164Kosovo(to) {
  let n = String(to || '').trim().replace(/\s+/g, '')
  if (!n) return null
  if (!n.startsWith('+')) {
    if (n.startsWith('00')) n = '+' + n.slice(2)
    else if (n.startsWith('0')) n = '+383' + n.slice(1)
    else if (n.length === 8 || n.length === 9) n = '+383' + n
    else n = '+' + n
  }
  return n
}

function configured(v) {
  return Boolean(v && !String(v).includes('your_') && String(v).trim().length > 2)
}

function isTextbeeConfigured() {
  return configured(process.env.TEXTBEE_API_KEY) && configured(process.env.TEXTBEE_DEVICE_ID)
}

export function getSmsProviderStatus() {
  return {
    order: getProviderOrder(),
    providers: {
      textbee: {
        configured: isTextbeeConfigured(),
        note: '⭐ SMS falas me telefon Android — textbee.dev (deri ~50 SMS/ditë)',
      },
      textbelt: {
        configured: true,
        note: 'TEXTBELT_KEY=textbelt → ~1 SMS falas/ditë për test',
      },
      gateway: {
        configured: configured(process.env.SMS_GATEWAY_URL),
        note: 'Webhook i përgjithshëm Android/SIM gateway',
      },
      infobip: {
        configured: configured(process.env.INFOBIP_API_KEY),
        note: 'Mirë për Evropë/Ballkan — trial falas te portal.infobip.com',
      },
      vonage: {
        configured:
          configured(process.env.VONAGE_API_KEY) && configured(process.env.VONAGE_API_SECRET),
        note: 'Vonage (Nexmo) — kredi trial te dashboard.nexmo.com',
      },
      twilio: {
        configured:
          configured(process.env.TWILIO_ACCOUNT_SID) &&
          configured(process.env.TWILIO_AUTH_TOKEN),
        note: 'Twilio — kërkon kredi',
      },
      telegram: {
        configured: configured(process.env.TELEGRAM_BOT_TOKEN),
        note: 'Messenger falas — lidhe me 1 klik te Cilësimet',
      },
      viber: {
        configured:
          configured(process.env.VIBER_AUTH_TOKEN) &&
          Boolean((process.env.VIBER_BOT_URI || '').trim()),
        note: 'Viber Bot falas — partners.viber.com + HTTPS webhook',
      },
      email_fallback: {
        configured: configured(process.env.SMTP_USER),
        note: 'Gmail SMTP — gjithmonë si backup',
      },
    },
  }
}

/** Status i shkurtër për UI qytetari (pa secrets) */
export function getFreeNotifyStatus() {
  return {
    textbee: {
      configured: isTextbeeConfigured(),
      label: 'TextBee SMS',
      note: 'SMS reale falas nga telefon Android',
    },
    textbelt: {
      configured: true,
      label: 'Textbelt',
      note: '~1 SMS falas / ditë',
    },
    telegram: {
      configured: configured(process.env.TELEGRAM_BOT_TOKEN),
      label: 'Telegram',
      note: 'Messenger falas',
    },
    viber: {
      configured:
        configured(process.env.VIBER_AUTH_TOKEN) &&
        Boolean((process.env.VIBER_BOT_URI || '').trim()),
      label: 'Viber',
      note: 'Messenger falas',
    },
  }
}

function getProviderOrder() {
  const raw =
    process.env.SMS_PROVIDER_ORDER || 'textbee,textbelt,gateway,infobip,vonage,twilio'
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/* ───────── Providers ───────── */

async function sendViaTwilio(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!configured(accountSid) || !configured(authToken)) {
    return { success: false, provider: 'twilio', reason: 'not_configured' }
  }
  try {
    const client = twilio(accountSid, authToken)
    const opts = { body, to }
    const msid = process.env.TWILIO_MESSAGING_SERVICE_SID
    const from = process.env.TWILIO_PHONE_NUMBER
    if (configured(msid)) opts.messagingServiceSid = msid
    else if (configured(from)) opts.from = from
    const msg = await client.messages.create(opts)
    return { success: true, provider: 'twilio', id: msg.sid }
  } catch (err) {
    return { success: false, provider: 'twilio', error: err.message }
  }
}

async function sendViaInfobip(to, body) {
  const apiKey = process.env.INFOBIP_API_KEY
  if (!configured(apiKey)) {
    return { success: false, provider: 'infobip', reason: 'not_configured' }
  }
  const base = (process.env.INFOBIP_BASE_URL || 'https://api.infobip.com').replace(/\/$/, '')
  const sender = process.env.INFOBIP_SENDER || 'SmartQueue'
  try {
    // Prefer SMS API v3, fallback to classic
    let res = await fetch(`${base}/sms/3/messages`, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            sender,
            destinations: [{ to: to.replace(/\D/g, '') }],
            content: { text: body },
          },
        ],
      }),
    })

    if (res.status === 404 || res.status === 405) {
      res = await fetch(`${base}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              from: sender,
              destinations: [{ to: to.replace(/\D/g, '') }],
              text: body,
            },
          ],
        }),
      })
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        provider: 'infobip',
        error: data?.requestError?.serviceException?.text || JSON.stringify(data).slice(0, 200),
      }
    }
    const id =
      data?.messages?.[0]?.messageId ||
      data?.messages?.[0]?.status?.groupName ||
      'infobip-ok'
    return { success: true, provider: 'infobip', id }
  } catch (err) {
    return { success: false, provider: 'infobip', error: err.message }
  }
}

async function sendViaVonage(to, body) {
  const apiKey = process.env.VONAGE_API_KEY
  const apiSecret = process.env.VONAGE_API_SECRET
  if (!configured(apiKey) || !configured(apiSecret)) {
    return { success: false, provider: 'vonage', reason: 'not_configured' }
  }
  const from = process.env.VONAGE_FROM || 'SmartQueue'
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      to: to.replace(/\D/g, ''),
      from,
      text: body,
    })
    const res = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await res.json()
    const msg = data?.messages?.[0]
    if (msg?.status === '0') {
      return { success: true, provider: 'vonage', id: msg['message-id'] }
    }
    return {
      success: false,
      provider: 'vonage',
      error: msg?.['error-text'] || JSON.stringify(data).slice(0, 200),
    }
  } catch (err) {
    return { success: false, provider: 'vonage', error: err.message }
  }
}

async function sendViaTextbee(to, body) {
  const apiKey = process.env.TEXTBEE_API_KEY
  const deviceId = process.env.TEXTBEE_DEVICE_ID
  if (!configured(apiKey) || !configured(deviceId)) {
    return { success: false, provider: 'textbee', reason: 'not_configured' }
  }
  try {
    const res = await fetch(
      `https://api.textbee.dev/api/v1/gateway/devices/${encodeURIComponent(deviceId)}/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          recipients: [to],
          message: body.slice(0, 1000),
        }),
      },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        provider: 'textbee',
        error: data?.message || data?.error || `HTTP ${res.status}`,
      }
    }
    return {
      success: true,
      provider: 'textbee',
      id: String(data?.data?._id || data?.id || data?.messageId || ''),
    }
  } catch (err) {
    return { success: false, provider: 'textbee', error: err.message }
  }
}

async function sendViaGateway(to, body) {
  const url = process.env.SMS_GATEWAY_URL
  if (!configured(url)) {
    return { success: false, provider: 'gateway', reason: 'not_configured' }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(configured(process.env.SMS_GATEWAY_TOKEN)
          ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ to, phone: to, message: body, text: body }),
    })
    if (!res.ok) {
      return { success: false, provider: 'gateway', error: (await res.text()).slice(0, 200) }
    }
    return { success: true, provider: 'gateway' }
  } catch (err) {
    return { success: false, provider: 'gateway', error: err.message }
  }
}

async function sendViaTextbelt(to, body) {
  const key = process.env.TEXTBELT_KEY || 'textbelt'
  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: to, message: body.slice(0, 320), key }),
    })
    const data = await res.json()
    if (data.success) return { success: true, provider: 'textbelt', id: data.textId }
    return { success: false, provider: 'textbelt', error: data.error || 'failed' }
  } catch (err) {
    return { success: false, provider: 'textbelt', error: err.message }
  }
}

/** Telegram Bot API — përdor shërbimin e avancuar */
export async function sendViaTelegram(chatId, body) {
  const { sendTelegramMessage } = await import('./telegramService.js')
  return sendTelegramMessage(chatId, `📱 SmartQueue\n\n${body}`)
}

export async function sendViaViber(viberId, body) {
  const { sendViberMessage } = await import('./viberService.js')
  return sendViberMessage(viberId, `📱 SmartQueue\n\n${body}`)
}

const PROVIDERS = {
  textbee: sendViaTextbee,
  textbelt: sendViaTextbelt,
  gateway: sendViaGateway,
  infobip: sendViaInfobip,
  vonage: sendViaVonage,
  twilio: sendViaTwilio,
}

/**
 * Dërgon SMS me cascade multi-provider
 */
export const sendSMS = async (to, body) => {
  const phone = toE164Kosovo(to)
  if (!phone) {
    console.warn('⚠️ SMS: numër i pavlefshëm')
    return { success: false, reason: 'invalid_phone' }
  }

  console.log(`📱 SMS router → ${phone}`)
  const attempts = []

  for (const name of getProviderOrder()) {
    const fn = PROVIDERS[name]
    if (!fn) continue
    const result = await fn(phone, body)
    attempts.push(result)
    if (result.success) {
      console.log(`✅ SMS OK via ${result.provider}${result.id ? ` (${result.id})` : ''}`)
      return { ...result, attempts }
    }
    if (result.reason !== 'not_configured') {
      console.warn(`⚠️ ${name}:`, result.error || result.reason)
    }
  }

  console.warn('❌ Asnjë provider SMS nuk dërgoi mesazhin')
  return { success: false, reason: 'all_providers_failed', attempts }
}

/**
 * Delivery e avancuar për termine: SMS cascade + Telegram + email backup
 */
export async function deliverSmartMessage({
  phone,
  email,
  telegramChatId,
  viberId,
  body,
  subject,
}) {
  const results = []

  // Telegram së pari (falas)
  if (telegramChatId) {
    const tg = await sendViaTelegram(telegramChatId, body)
    results.push({ channel: 'telegram', ...tg })
    if (tg.success) return { delivered: true, via: 'telegram', results }
  }

  // Viber (falas)
  if (viberId) {
    const vb = await sendViaViber(viberId, body)
    results.push({ channel: 'viber', ...vb })
    if (vb.success) return { delivered: true, via: 'viber', results }
  }

  if (phone) {
    const sms = await sendSMS(phone, body)
    results.push({ channel: 'sms', ...sms })
    if (sms.success) {
      return { delivered: true, via: sms.provider, results }
    }
  }

  if (email) {
    const mail = await sendEmail(
      email,
      subject || '📱 SmartQueue — njoftim',
      `<div style="font-family:sans-serif;padding:24px;background:#0b0b12;color:#eee">
        <h2 style="color:#a78bfa;margin:0 0 12px">SmartQueue · Njoftim</h2>
        <p style="font-size:16px;line-height:1.6;white-space:pre-wrap">${body}</p>
        <p style="color:#888;font-size:12px;margin-top:20px">
          Ky mesazh u dërgua si backup (Telegram/Viber/SMS nuk ishin të disponueshëm).
        </p>
      </div>`,
    )
    results.push({ channel: 'email_fallback', success: !!mail?.success })
    if (mail?.success) return { delivered: true, via: 'email_fallback', results }
  }

  return { delivered: false, via: null, results }
}

export default { sendSMS, deliverSmartMessage, getSmsProviderStatus, toE164Kosovo }
