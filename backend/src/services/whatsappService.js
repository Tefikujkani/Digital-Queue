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

function configured(v) {
  return Boolean(v && !String(v).includes('your_') && String(v).trim().length > 8)
}

function toE164Kosovo(to) {
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

export function isWhatsAppConfigured() {
  return configured(token()) && configured(phoneNumberId())
}

export async function sendWhatsAppMessage(toPhone, text) {
  if (!isWhatsAppConfigured() || !toPhone) {
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

export function getWhatsAppPublicStatus() {
  return {
    configured: isWhatsAppConfigured(),
    hasBusinessNumber: Boolean(businessE164()),
    platforms: ['ios', 'android'],
    note: 'WhatsApp Cloud API — njoftime falas në iOS & Android',
  }
}
