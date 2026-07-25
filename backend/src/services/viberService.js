/**
 * SmartQueue Viber Bot — njoftime falas (si Telegram)
 *
 * Setup:
 * 1. https://partners.viber.com → Create Bot → merre Auth Token + URI
 * 2. VIBER_AUTH_TOKEN + VIBER_BOT_URI në backend/.env
 * 3. VIBER_WEBHOOK_URL = HTTPS publik (ngrok në lokal) → /api/viber/webhook
 * 4. Rinis backend → Cilësimet → Lidhu me Viber
 *
 * Deep link: viber://pa?chatURI={URI}&context={linkCode}
 */

import crypto from 'crypto'
import User from '../models/User.js'

function configured(v) {
  return Boolean(v && !String(v).includes('your_') && String(v).trim().length > 10)
}

function authToken() {
  return process.env.VIBER_AUTH_TOKEN?.trim() || ''
}

function botUri() {
  return (process.env.VIBER_BOT_URI || process.env.VIBER_BOT_NAME || '').trim().replace(/^@/, '')
}

function senderName() {
  return process.env.VIBER_SENDER_NAME || 'SmartQueue Kosova'
}

let accountInfo = null
let webhookReady = false

export function isViberConfigured() {
  return configured(authToken()) && Boolean(botUri())
}

async function viberApi(path, body = {}) {
  const token = authToken()
  if (!configured(token)) throw new Error('VIBER_AUTH_TOKEN mungon')
  const res = await fetch(`https://chatapi.viber.com/pa/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Viber-Auth-Token': token,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.status !== 0) {
    const err = new Error(data.status_message || `Viber ${path} failed`)
    err.code = data.status
    throw err
  }
  return data
}

export async function getViberAccountInfo() {
  if (!isViberConfigured()) return null
  if (accountInfo) return accountInfo
  try {
    accountInfo = await viberApi('get_account_info')
    return accountInfo
  } catch (err) {
    console.warn('⚠️ Viber get_account_info:', err.message)
    return null
  }
}

export async function sendViberMessage(receiverId, text) {
  if (!isViberConfigured() || !receiverId) {
    return { success: false, provider: 'viber', reason: 'not_configured' }
  }
  try {
    const data = await viberApi('send_message', {
      receiver: String(receiverId),
      type: 'text',
      text: String(text).slice(0, 7000),
      sender: {
        name: senderName().slice(0, 28),
      },
      min_api_version: 1,
    })
    return {
      success: true,
      provider: 'viber',
      id: String(data.message_token || ''),
    }
  } catch (err) {
    return { success: false, provider: 'viber', error: err.message }
  }
}

export async function createViberLink(userId) {
  if (!isViberConfigured()) {
    return {
      ok: false,
      message:
        'Viber bot nuk është konfiguruar. Vendos VIBER_AUTH_TOKEN dhe VIBER_BOT_URI në backend/.env (partners.viber.com).',
    }
  }

  const uri = botUri()
  const code = crypto.randomBytes(12).toString('hex')
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }

  user.viberLinkCode = code
  user.viberLinkExpires = new Date(Date.now() + 15 * 60 * 1000)
  await user.save()

  // Deep link zyrtar Viber PA/Bot
  const deepLink = `viber://pa?chatURI=${encodeURIComponent(uri)}&context=${code}`
  const webLink = `https://viber.com/${encodeURIComponent(uri)}?context=${code}`

  return {
    ok: true,
    deepLink,
    webLink,
    botUri: uri,
    expiresInMinutes: 15,
    alreadyLinked: Boolean(user.viberId),
    needsWebhook: !process.env.VIBER_WEBHOOK_URL,
  }
}

export async function unlinkViber(userId) {
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }
  const viberId = user.viberId
  user.viberId = ''
  user.viberLinkCode = undefined
  user.viberLinkExpires = undefined
  if (user.notificationPrefs) user.notificationPrefs.viber = false
  await user.save()
  if (viberId) {
    await sendViberMessage(
      viberId,
      '🔕 SmartQueue u shkëput nga Viber.\nMund ta lidhësh përsëri nga Cilësimet.',
    )
  }
  return { ok: true }
}

async function linkUserByCode(code, viberUserId, name) {
  if (!code || !viberUserId) return false

  const user = await User.findOne({
    viberLinkCode: code,
    viberLinkExpires: { $gt: new Date() },
  })

  if (!user) {
    await sendViberMessage(
      viberUserId,
      '⚠️ Lidhja skadoi ose kodi është i pavlefshëm.\nHap SmartQueue → Cilësimet → Lidhu me Viber.',
    )
    return false
  }

  await User.updateMany(
    { viberId: String(viberUserId), _id: { $ne: user._id } },
    { $set: { viberId: '' } },
  )

  user.viberId = String(viberUserId)
  user.viberLinkCode = undefined
  user.viberLinkExpires = undefined
  user.notificationPrefs = {
    ...(user.notificationPrefs?.toObject?.() || user.notificationPrefs || {}),
    viber: true,
    telegram: user.notificationPrefs?.telegram === true,
    inApp: user.notificationPrefs?.inApp !== false,
    email: user.notificationPrefs?.email !== false,
    sms: user.notificationPrefs?.sms === true,
  }
  await user.save()

  const greet = name || user.name || 'qytetar'
  await sendViberMessage(
    viberUserId,
    `✅ Përshëndetje ${greet}!\n\n` +
      `Llogaria SmartQueue u lidh me Viber.\n` +
      `Tani merr njoftime falas për termine, kujtesa dhe radhën.\n\n` +
      `SmartQueue Kosova 🇽🇰`,
  )
  console.log(`✅ Viber linked: user ${user._id} → ${viberUserId}`)
  return true
}

/**
 * Webhook handler. Kthen welcome message object për conversation_started (opsional).
 */
export async function handleViberEvent(body) {
  const event = body?.event
  if (!event) return null

  if (event === 'webhook') {
    return null
  }

  if (event === 'conversation_started') {
    const viberUserId = body.user?.id
    const context = String(body.context || '').trim()
    const name = body.user?.name
    if (context && viberUserId) {
      await linkUserByCode(context, viberUserId, name)
    }
    // Welcome si përgjigje e menjëhershme (lejuar nga Viber)
    return {
      sender: { name: senderName().slice(0, 28) },
      type: 'text',
      text: context
        ? '✅ Mirë se erdhe! Nëse lidhja nuk u aktivizua, dërgo çdo mesazh këtu.'
        : '👋 SmartQueue Kosova\n\nPër të lidhur llogarinë: Hap app → Cilësimet → Lidhu me Viber.',
    }
  }

  if (event === 'subscribed') {
    const viberUserId = body.user?.id
    if (viberUserId) {
      const existing = await User.findOne({ viberId: String(viberUserId) })
      if (existing) {
        existing.notificationPrefs = {
          ...(existing.notificationPrefs?.toObject?.() || existing.notificationPrefs || {}),
          viber: true,
        }
        await existing.save()
        await sendViberMessage(viberUserId, '✅ Abonimi Viber aktiv — njoftimet janë gati.')
      }
    }
    return null
  }

  if (event === 'unsubscribed') {
    const viberUserId = body.user_id || body.user?.id
    if (viberUserId) {
      await User.updateMany(
        { viberId: String(viberUserId) },
        { $set: { viberId: '', 'notificationPrefs.viber': false } },
      )
    }
    return null
  }

  if (event === 'message') {
    const viberUserId = body.sender?.id
    const text = String(body.message?.text || '').trim()
    if (!viberUserId) return null

    // Nëse mesazhi është kodi i lidhjes
    if (/^[a-f0-9]{16,32}$/i.test(text)) {
      await linkUserByCode(text, viberUserId, body.sender?.name)
      return null
    }

    if (text === '/status' || text.toLowerCase() === 'status') {
      const user = await User.findOne({ viberId: String(viberUserId) })
      await sendViberMessage(
        viberUserId,
        user
          ? `✅ I lidhur si: ${user.name}\n📧 ${user.email}`
          : 'Nuk je i lidhur. Hap Cilësimet → Lidhu me Viber.',
      )
    }
  }

  return null
}

export async function startViberWebhook() {
  if (!isViberConfigured()) return
  const base = process.env.VIBER_WEBHOOK_URL?.replace(/\/$/, '')
  if (!base) {
    console.log(
      '💡 Viber: vendos VIBER_WEBHOOK_URL (HTTPS, p.sh. ngrok) për lidhjen e qytetarëve',
    )
    return
  }
  try {
    await viberApi('set_webhook', {
      url: `${base}/api/viber/webhook`,
      event_types: [
        'delivered',
        'seen',
        'failed',
        'subscribed',
        'unsubscribed',
        'conversation_started',
        'message',
      ],
      send_name: true,
      send_photo: false,
    })
    webhookReady = true
    const info = await getViberAccountInfo()
    console.log(
      `📱 Viber webhook aktiv (@${botUri()}${info?.name ? ` · ${info.name}` : ''})`,
    )
  } catch (err) {
    console.warn('⚠️ Viber set_webhook dështoi:', err.message)
  }
}

export function getViberPublicStatus() {
  return {
    configured: isViberConfigured(),
    botUri: botUri() || null,
    webhook: webhookReady || Boolean(process.env.VIBER_WEBHOOK_URL),
    note: 'Njoftime falas në Viber — lidhe nga Cilësimet (kërkon HTTPS webhook)',
  }
}
