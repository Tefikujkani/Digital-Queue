/**
 * SmartQueue WhatsApp Cloud API — iOS + Android
 *
 * Setup (falas me Meta Cloud API):
 * 1. https://developers.facebook.com → Create App → WhatsApp
 * 2. Merre: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, numrin e biznesit
 * 3. Webhook: WHATSAPP_WEBHOOK_URL + WHATSAPP_VERIFY_TOKEN
 * 4. Qytetari: Cilësimet → Lidhu me WhatsApp (hapet në iOS/Android)
 *
 * Deep link: https://wa.me/{BUSINESS_E164}?text=SmartQueue%20{code}
 */

import crypto from 'crypto'
import User from '../models/User.js'
import AppSetting from '../models/AppSetting.js'

function configured(v) {
  return Boolean(v && !String(v).includes('your_') && String(v).trim().length > 8)
}

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

function token() {
  return process.env.WHATSAPP_TOKEN?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim() || ''
}

function phoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || ''
}

function businessE164() {
  const raw = process.env.WHATSAPP_BUSINESS_NUMBER || ''
  return toE164Kosovo(raw)?.replace(/\D/g, '') || ''
}

const GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}`
const GREEN_KEY = 'green_api'

function greenUrlFromId(idInstance) {
  const id = String(idInstance || '').trim()
  if (process.env.GREEN_API_URL) return process.env.GREEN_API_URL.replace(/\/$/, '')
  if (id.length >= 4) return `https://${id.slice(0, 4)}.api.green-api.com`
  return 'https://api.green-api.com'
}

function envGreenConfig() {
  const idInstance = process.env.GREEN_API_ID?.trim() || process.env.GREEN_API_INSTANCE?.trim() || ''
  const apiToken = process.env.GREEN_API_TOKEN?.trim() || ''
  if (!configured(idInstance) || !configured(apiToken)) return null
  return { idInstance, apiToken, apiUrl: greenUrlFromId(idInstance) }
}

function qrPageUrl(idInstance, apiToken) {
  return `https://qr.green-api.com/waInstance${idInstance}/${apiToken}`
}

export async function resolveGreenConfig() {
  const row = await AppSetting.findOne({ key: GREEN_KEY }).lean()
  const value = row?.value || {}
  if (configured(value.idInstance) && configured(value.apiToken)) {
    return {
      idInstance: String(value.idInstance).trim(),
      apiToken: String(value.apiToken).trim(),
      apiUrl: String(value.apiUrl || greenUrlFromId(value.idInstance)).replace(/\/$/, ''),
    }
  }
  return envGreenConfig()
}

export async function saveGreenConfig({ idInstance, apiToken, apiUrl }) {
  const id = String(idInstance || '').trim()
  const tokenVal = String(apiToken || '').replace(/\s+/g, '').trim()
  if (!configured(id) || !configured(tokenVal)) {
    return { ok: false, message: 'Vendos idInstance dhe apiToken nga console.green-api.com (falas).' }
  }
  const value = {
    idInstance: id,
    apiToken: tokenVal,
    apiUrl: String(apiUrl || greenUrlFromId(id)).replace(/\/$/, ''),
  }
  await AppSetting.findOneAndUpdate({ key: GREEN_KEY }, { value }, { upsert: true, new: true })
  process.env.GREEN_API_ID = id
  process.env.GREEN_API_TOKEN = tokenVal
  process.env.GREEN_API_URL = value.apiUrl
  return { ok: true, idInstance: id, apiUrl: value.apiUrl, pageUrl: qrPageUrl(id, tokenVal) }
}

export async function getGreenState() {
  const cfg = await resolveGreenConfig()
  if (!cfg) return { configured: false, authorized: false }
  try {
    const res = await fetch(
      `${cfg.apiUrl}/waInstance${cfg.idInstance}/getStateInstance/${cfg.apiToken}`,
    )
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      return {
        configured: false,
        authorized: false,
        state: 'invalid_token',
        idInstance: cfg.idInstance,
        error: 'Tokeni i Green-API s’është i saktë',
      }
    }
    const state = data.stateInstance || data.state || ''
    return {
      configured: true,
      authorized: state === 'authorized',
      state,
      idInstance: cfg.idInstance,
    }
  } catch (err) {
    return { configured: true, authorized: false, error: err.message }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getGreenQr() {
  const cfg = await resolveGreenConfig()
  if (!cfg) return { ok: false, message: 'Green-API nuk është konfiguruar.' }
  const pageUrl = qrPageUrl(cfg.idInstance, cfg.apiToken)

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(`${cfg.apiUrl}/waInstance${cfg.idInstance}/qr/${cfg.apiToken}`)
      const rawText = await res.text()
      let data = {}
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        data = { message: rawText }
      }

      if (res.status === 401) {
        return {
          ok: false,
          pageUrl,
          message:
            'Tokeni s’u pranua (401). Te Green-API shtyp Copy te apiTokenInstance dhe ngjite sërish këtu.',
        }
      }

      if (data.type === 'alreadyLogged') {
        return { ok: true, authorized: true, pageUrl }
      }
      if (data.type === 'qrCode' && data.message) {
        const qr = String(data.message).startsWith('data:')
          ? data.message
          : `data:image/png;base64,${data.message}`
        return { ok: true, authorized: false, qr, pageUrl }
      }
      if (data.type === 'timeout' || data.type === 'error') {
        if (attempt < 5) {
          await sleep(1500)
          continue
        }
      }
    } catch {
      if (attempt < 5) {
        await sleep(1500)
        continue
      }
    }
    if (attempt < 5) await sleep(1500)
  }

  return {
    ok: true,
    authorized: false,
    pageUrl,
    message: 'Hape QR-në te Green-API dhe skanoje me WhatsApp.',
  }
}

export async function getGreenAuthCode(phoneRaw) {
  const cfg = await resolveGreenConfig()
  if (!cfg) return { ok: false, message: 'Green-API nuk është konfiguruar.' }
  const state = await getGreenState()
  if (state.authorized) {
    return { ok: true, authorized: true, message: 'WhatsApp osht tashmë i lidhur.' }
  }
  if (state.state === 'invalid_token') {
    return {
      ok: false,
      message:
        'Tokeni i Green-API s’pranohet. Te console.green-api.com shtyp Copy te apiTokenInstance dhe ngjite sërish.',
    }
  }
  const digits = toE164Kosovo(phoneRaw)?.replace(/\D/g, '')
  if (!digits) return { ok: false, message: 'Numër i pavlefshëm (+383…)' }
  try {
    const res = await fetch(
      `${cfg.apiUrl}/waInstance${cfg.idInstance}/getAuthorizationCode/${cfg.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: Number(digits) }),
      },
    )
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      return {
        ok: false,
        message: 'Tokeni s’pranohet. Kopjoje sërish me Copy te Green-API.',
      }
    }
    if (data.status && data.code) {
      return { ok: true, code: data.code, phone: digits }
    }
    return {
      ok: false,
      pageUrl: qrPageUrl(cfg.idInstance, cfg.apiToken),
      message: 'Kodi s’u mor. Hap QR-në e Green-API dhe skanoje me WhatsApp.',
    }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}

async function sendViaGreenApi(toDigits, text) {
  const cfg = await resolveGreenConfig()
  if (!cfg) return { success: false, provider: 'green-api', reason: 'not_configured' }
  try {
    const res = await fetch(
      `${cfg.apiUrl}/waInstance${cfg.idInstance}/sendMessage/${cfg.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${toDigits}@c.us`,
          message: String(text).slice(0, 4000),
        }),
      },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.idMessage) {
      return {
        success: false,
        provider: 'green-api',
        error: data.message || data.error || JSON.stringify(data).slice(0, 200),
      }
    }
    return { success: true, provider: 'green-api', id: data.idMessage }
  } catch (err) {
    return { success: false, provider: 'green-api', error: err.message }
  }
}

function isMetaConfigured() {
  return configured(token()) && configured(phoneNumberId())
}

export function isWhatsAppConfigured() {
  return isMetaConfigured() || Boolean(envGreenConfig())
}

export async function isWhatsAppReady() {
  if (isMetaConfigured()) return true
  const green = await getGreenState()
  return green.configured && green.authorized
}

export async function sendWhatsAppMessage(toPhone, text) {
  if (!toPhone) {
    return { success: false, provider: 'whatsapp', reason: 'not_configured' }
  }
  const to = toE164Kosovo(toPhone)?.replace(/\D/g, '')
  if (!to) return { success: false, provider: 'whatsapp', reason: 'invalid_phone' }

  const { sendViaWaSession } = await import('./waSession.js')
  const local = await sendViaWaSession(to, text)
  if (local.success) return local
  if (local.reason === 'not_ready') {
    console.warn('WhatsApp s’është lidhur — skano QR-në te Cilësimet')
  } else if (local.error) {
    console.warn('WhatsApp dërgimi dështoi:', local.error)
  }

  const green = await sendViaGreenApi(to, text)
  if (green.success) return green
  if (green.error) console.warn('Green-API:', green.error)

  if (!isMetaConfigured()) {
    return green.reason === 'not_configured'
      ? { success: false, provider: 'whatsapp', reason: 'not_configured' }
      : green
  }

  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId()}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: String(text).slice(0, 4000), preview_url: false },
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      return {
        success: false,
        provider: 'whatsapp',
        error: data.error?.message || JSON.stringify(data).slice(0, 200),
      }
    }
    return {
      success: true,
      provider: 'whatsapp',
      id: String(data.messages?.[0]?.id || ''),
    }
  } catch (err) {
    return { success: false, provider: 'whatsapp', error: err.message }
  }
}

/** Template opsional për njoftime jashtë dritares 24h */
export async function sendWhatsAppTemplate(toPhone, templateName, languageCode = 'sq') {
  if (!isWhatsAppConfigured() || !toPhone || !templateName) {
    return { success: false, provider: 'whatsapp', reason: 'not_configured' }
  }
  const to = toE164Kosovo(toPhone)?.replace(/\D/g, '')
  if (!to) return { success: false, provider: 'whatsapp', reason: 'invalid_phone' }

  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId()}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      return {
        success: false,
        provider: 'whatsapp',
        error: data.error?.message || JSON.stringify(data).slice(0, 200),
      }
    }
    return {
      success: true,
      provider: 'whatsapp_template',
      id: String(data.messages?.[0]?.id || ''),
    }
  } catch (err) {
    return { success: false, provider: 'whatsapp', error: err.message }
  }
}

export async function createWhatsAppLink(userId) {
  if (!isWhatsAppConfigured()) {
    return {
      ok: false,
      message:
        'WhatsApp nuk është konfiguruar. Vendos WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta Developers).',
    }
  }
  const biz = businessE164()
  if (!biz) {
    return {
      ok: false,
      message: 'Vendos WHATSAPP_BUSINESS_NUMBER (p.sh. 38344111222) në .env për deep link iOS/Android.',
    }
  }

  const code = crypto.randomBytes(10).toString('hex')
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }

  user.whatsappLinkCode = code
  user.whatsappLinkExpires = new Date(Date.now() + 15 * 60 * 1000)
  await user.save()

  const text = encodeURIComponent(`SmartQueue ${code}`)
  const deepLink = `https://wa.me/${biz}?text=${text}`

  return {
    ok: true,
    deepLink,
    businessNumber: biz,
    expiresInMinutes: 15,
    alreadyLinked: Boolean(user.whatsappPhone),
    platforms: ['ios', 'android'],
  }
}

export async function unlinkWhatsApp(userId) {
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }
  const phone = user.whatsappPhone
  user.whatsappPhone = ''
  user.whatsappLinkCode = undefined
  user.whatsappLinkExpires = undefined
  if (user.notificationPrefs) user.notificationPrefs.whatsapp = false
  await user.save()
  if (phone) {
    await sendWhatsAppMessage(
      phone,
      '🔕 SmartQueue u shkëput nga WhatsApp.\nMund ta lidhësh përsëri nga Cilësimet (iOS/Android).',
    )
  }
  return { ok: true }
}

/** Ruajtje manuale e numrit WhatsApp (pa webhook) */
export async function saveWhatsAppPhone(userId, phoneRaw) {
  const phone = toE164Kosovo(phoneRaw)
  if (!phone) return { ok: false, message: 'Numër i pavlefshëm (+383…)' }
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }

  user.whatsappPhone = phone
  user.notificationPrefs = {
    ...(user.notificationPrefs?.toObject?.() || user.notificationPrefs || {}),
    whatsapp: true,
  }
  await user.save()

  // Provo një mesazh mirëseardhjeje (kërkon që useri të ketë shkruar së pari, ose template)
  const sent = await sendWhatsAppMessage(
    phone,
    '✅ SmartQueue: numri u ruajt.\nNëse nuk e more këtë mesazh, hap WhatsApp → shkruaj botit një herë, pastaj provo përsëri.',
  )

  return { ok: true, phone, delivery: sent }
}

async function linkByCode(code, fromPhone, profileName) {
  if (!code || !fromPhone) return false
  const phone = toE164Kosovo(fromPhone) || `+${String(fromPhone).replace(/\D/g, '')}`

  const user = await User.findOne({
    whatsappLinkCode: code,
    whatsappLinkExpires: { $gt: new Date() },
  })
  if (!user) {
    await sendWhatsAppMessage(
      phone,
      '⚠️ Lidhja skadoi. Hap SmartQueue → Cilësimet → Lidhu me WhatsApp.',
    )
    return false
  }

  user.whatsappPhone = phone
  user.whatsappLinkCode = undefined
  user.whatsappLinkExpires = undefined
  user.notificationPrefs = {
    ...(user.notificationPrefs?.toObject?.() || user.notificationPrefs || {}),
    whatsapp: true,
  }
  await user.save()

  await sendWhatsAppMessage(
    phone,
    `✅ Përshëndetje ${profileName || user.name || ''}!\n\n` +
      `Llogaria SmartQueue u lidh me WhatsApp (iOS/Android).\n` +
      `Do të marrësh njoftime për termine dhe radhën.`,
  )
  console.log(`✅ WhatsApp linked: user ${user._id} → ${phone}`)
  return true
}

export function verifyWhatsAppWebhook(mode, verifyToken, challenge) {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || 'smartqueue_wa_verify'
  if (mode === 'subscribe' && verifyToken === expected) return challenge
  return null
}

export async function handleWhatsAppWebhook(body) {
  const entries = body?.entry || []
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value
      for (const msg of value?.messages || []) {
        const from = msg.from
        const text = String(msg.text?.body || '').trim()
        const name = value?.contacts?.[0]?.profile?.name

        const match = text.match(/SmartQueue\s+([a-f0-9]{12,24})/i) || text.match(/^([a-f0-9]{20})$/i)
        if (match) {
          await linkByCode(match[1], from, name)
          continue
        }
        if (text.toLowerCase() === 'status' || text === '/status') {
          const user = await User.findOne({
            whatsappPhone: { $regex: from.replace(/\D/g, '') + '$' },
          })
          await sendWhatsAppMessage(
            from,
            user
              ? `✅ I lidhur: ${user.name}\n📧 ${user.email}`
              : 'Nuk je i lidhur. Hap Cilësimet → Lidhu me WhatsApp.',
          )
        }
      }
    }
  }
}

export function buildWhatsAppShareLink(text, toPhone) {
  const encoded = encodeURIComponent(String(text || '').slice(0, 1800))
  const digits = toE164Kosovo(toPhone)?.replace(/\D/g, '') || ''
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

export function buildBookingWhatsAppText({
  name,
  ticketNumber,
  institutionName,
  serviceName,
  dateStr,
  timeStr,
  address,
}) {
  return [
    '✅ SmartQueue Kosova',
    'Termini u konfirmua — nuk ju duhet email.',
    '',
    `👤 ${name || 'Qytetar'}`,
    `🏛️ ${institutionName || 'Institucioni'}`,
    `📋 ${serviceName || 'Shërbim'}`,
    dateStr ? `📅 ${dateStr}` : null,
    timeStr ? `🕐 Ora ${timeStr}` : null,
    `🎫 Numri: ${ticketNumber}`,
    address ? `📍 ${address}` : null,
    '',
    'Merrni me vete dokumentet e nevojshme dhe QR-në në SmartQueue.',
    'Ky mesazh është konfirmimi juaj. Ruajeni këtu në WhatsApp.',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export async function sendBookingConfirmation({ phone, text }) {
  const shareLink = buildWhatsAppShareLink(text, phone)
  if (!phone || !text) {
    return { success: false, provider: 'whatsapp', reason: 'missing', shareLink }
  }

  let sent = await sendWhatsAppMessage(phone, text)
  if (!sent.success) {
    const template = process.env.WHATSAPP_TEMPLATE_CONFIRM?.trim()
    if (template) {
      sent = await sendWhatsAppTemplate(phone, template, process.env.WHATSAPP_TEMPLATE_LANG || 'sq')
    }
  }

  return {
    ...sent,
    shareLink,
    phone: toE164Kosovo(phone),
  }
}

export function buildTestShareLink(phone, name) {
  return buildWhatsAppShareLink(
    `✅ SmartQueue Kosova\nWhatsApp u lidh.\n${name || 'Qytetar'}\n\nKur rezervon termin, konfirmimi hapet këtu — nuk ju duhet email.`,
    phone,
  )
}

export async function getWhatsAppPublicStatus() {
  const green = await getGreenState()
  const { getWaSessionState } = await import('./waSession.js')
  const session = getWaSessionState()
  const ready = isMetaConfigured() || green.authorized || session.ready
  return {
    configured: ready,
    provider: session.ready ? 'whatsapp-session' : green.authorized ? 'green-api' : null,
    autoSend: ready,
    sessionReady: session.ready,
    sessionStatus: session.status,
    qr: session.qr || '',
    pairingCode: session.pairingCode || '',
    greenConfigured: green.configured,
    greenAuthorized: green.authorized,
    greenState: green.state || null,
    hasBusinessNumber: Boolean(businessE164()),
    signupUrl: 'https://console.green-api.com',
    platforms: ['ios', 'android'],
    note: ready
      ? 'WhatsApp dërgon vetë — s’ke nevojë ta hapësh'
      : 'Lidh WhatsApp një herë me QR/kod, pastaj konfirmimet shkojnë vetë.',
  }
}
