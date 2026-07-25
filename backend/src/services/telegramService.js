/**
 * SmartQueue Telegram — kanali kryesor falas për njoftime
 *
 * Setup (2 min):
 * 1. Hap @BotFather në Telegram → /newbot → emër p.sh. SmartQueue Kosova
 * 2. Kopjo tokenin → TELEGRAM_BOT_TOKEN në backend/.env
 * 3. Rinis backend-in
 * 4. Qytetari te Cilësimet → "Lidhu me Telegram"
 */

import crypto from 'crypto'
import User from '../models/User.js'

function configured(v) {
  return Boolean(v && !String(v).includes('your_') && String(v).trim().length > 10)
}

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || ''
}

let cachedBot = null
let pollerRunning = false
let pollOffset = 0

export function isTelegramConfigured() {
  return configured(botToken())
}

async function tgApi(method, body) {
  const token = botToken()
  if (!configured(token)) throw new Error('TELEGRAM_BOT_TOKEN mungon')
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.ok) {
    const err = new Error(data.description || `Telegram ${method} failed`)
    err.code = data.error_code
    throw err
  }
  return data.result
}

export async function getBotInfo() {
  if (!isTelegramConfigured()) return null
  if (cachedBot) return cachedBot
  try {
    cachedBot = await tgApi('getMe')
    return cachedBot
  } catch (err) {
    console.warn('⚠️ Telegram getMe:', err.message)
    return null
  }
}

export async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!isTelegramConfigured() || !chatId) {
    return { success: false, provider: 'telegram', reason: 'not_configured' }
  }
  try {
    const result = await tgApi('sendMessage', {
      chat_id: chatId,
      text: text.length > 4000 ? text.slice(0, 3990) + '…' : text,
      disable_web_page_preview: true,
      parse_mode: extra.parse_mode,
      ...extra,
    })
    return { success: true, provider: 'telegram', id: String(result.message_id) }
  } catch (err) {
    return { success: false, provider: 'telegram', error: err.message }
  }
}

/** Krijon deep-link për lidhjen e llogarisë */
export async function createTelegramLink(userId) {
  const bot = await getBotInfo()
  if (!bot?.username) {
    return {
      ok: false,
      message:
        'Telegram bot nuk është konfiguruar. Vendos TELEGRAM_BOT_TOKEN në backend/.env (nga @BotFather).',
    }
  }

  const code = crypto.randomBytes(12).toString('hex')
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }

  user.telegramLinkCode = code
  user.telegramLinkExpires = new Date(Date.now() + 15 * 60 * 1000)
  await user.save()

  const deepLink = `https://t.me/${bot.username}?start=${code}`
  return {
    ok: true,
    deepLink,
    botUsername: bot.username,
    expiresInMinutes: 15,
    alreadyLinked: Boolean(user.telegramChatId),
  }
}

export async function unlinkTelegram(userId) {
  const user = await User.findById(userId)
  if (!user) return { ok: false, message: 'Përdoruesi nuk u gjet' }
  const chatId = user.telegramChatId
  user.telegramChatId = ''
  user.telegramLinkCode = undefined
  user.telegramLinkExpires = undefined
  if (user.notificationPrefs) user.notificationPrefs.telegram = false
  await user.save()
  if (chatId) {
    await sendTelegramMessage(
      chatId,
      '🔕 SmartQueue u shkëput nga Telegram.\nMund ta lidhësh përsëri nga Cilësimet.',
    )
  }
  return { ok: true }
}

async function linkUserFromStart(code, chatId, from) {
  if (!code || !chatId) return false

  const user = await User.findOne({
    telegramLinkCode: code,
    telegramLinkExpires: { $gt: new Date() },
  })

  if (!user) {
    await sendTelegramMessage(
      chatId,
      '⚠️ Lidhja skadoi ose kodi është i pavlefshëm.\nHap SmartQueue → Cilësimet → Lidhu me Telegram përsëri.',
    )
    return false
  }

  // Një chatId mund të jetë vetëm te një llogari
  await User.updateMany(
    { telegramChatId: String(chatId), _id: { $ne: user._id } },
    { $set: { telegramChatId: '' } },
  )

  user.telegramChatId = String(chatId)
  user.telegramLinkCode = undefined
  user.telegramLinkExpires = undefined
  user.notificationPrefs = {
    ...(user.notificationPrefs?.toObject?.() || user.notificationPrefs || {}),
    telegram: true,
    inApp: user.notificationPrefs?.inApp !== false,
    email: user.notificationPrefs?.email !== false,
    sms: user.notificationPrefs?.sms === true,
  }
  await user.save()

  const name = from?.first_name || user.name || 'qytetar'
  await sendTelegramMessage(
    chatId,
    `✅ Përshëndetje ${name}!\n\n` +
      `Llogaria jote SmartQueue u lidh me Telegram.\n` +
      `Tani merr njoftime falas për:\n` +
      `• Rezervime terminash\n` +
      `• Kujtesa 24h dhe 2h para\n` +
      `• Thirrjen e radhës\n\n` +
      `SmartQueue Kosova 🇽🇰`,
  )
  console.log(`✅ Telegram linked: user ${user._id} → chat ${chatId}`)
  return true
}

export async function handleTelegramUpdate(update) {
  const msg = update?.message
  if (!msg?.text || !msg.chat?.id) return

  const text = String(msg.text).trim()
  const chatId = msg.chat.id

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/)
    const code = parts[1]
    if (code) {
      await linkUserFromStart(code, chatId, msg.from)
    } else {
      await sendTelegramMessage(
        chatId,
        '👋 Mirë se erdhe te SmartQueue Kosova!\n\n' +
          'Për të lidhur llogarinë:\n' +
          '1. Hap aplikacionin SmartQueue\n' +
          '2. Shko te Cilësimet\n' +
          '3. Shtyp «Lidhu me Telegram»\n\n' +
          'Pastaj kthehu këtu dhe shtyp Start nga linku.',
      )
    }
    return
  }

  if (text === '/status' || text === '/help') {
    const user = await User.findOne({ telegramChatId: String(chatId) })
    if (user) {
      await sendTelegramMessage(
        chatId,
        `✅ Je i lidhur si: ${user.name}\n📧 ${user.email}\n\n` +
          `Komanda: /start · /status · /stop`,
      )
    } else {
      await sendTelegramMessage(
        chatId,
        'Nuk je i lidhur ende. Hap Cilësimet në SmartQueue → Lidhu me Telegram.',
      )
    }
    return
  }

  if (text === '/stop') {
    const user = await User.findOne({ telegramChatId: String(chatId) })
    if (user) {
      user.telegramChatId = ''
      if (user.notificationPrefs) user.notificationPrefs.telegram = false
      await user.save()
    }
    await sendTelegramMessage(chatId, '🔕 Njoftimet u ndalën. /start për të lidhur përsëri.')
  }
}

/** Long-polling për localhost (pa webhook publik) */
export async function startTelegramPoller() {
  if (!isTelegramConfigured() || pollerRunning) return
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    try {
      await tgApi('setWebhook', {
        url: `${process.env.TELEGRAM_WEBHOOK_URL.replace(/\/$/, '')}/api/telegram/webhook`,
        drop_pending_updates: true,
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
      })
      console.log('📱 Telegram webhook aktiv')
      return
    } catch (err) {
      console.warn('⚠️ Telegram webhook dështoi, përdor polling:', err.message)
    }
  } else {
    try {
      await tgApi('deleteWebhook', { drop_pending_updates: false })
    } catch {
      /* ignore */
    }
  }

  pollerRunning = true
  const bot = await getBotInfo()
  console.log(`📱 Telegram poller aktiv (@${bot?.username || '?'}) — kanali kryesor falas`)

  const loop = async () => {
    while (pollerRunning) {
      try {
        const token = botToken()
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${pollOffset}&timeout=25&allowed_updates=${encodeURIComponent(JSON.stringify(['message']))}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            pollOffset = update.update_id + 1
            try {
              await handleTelegramUpdate(update)
            } catch (err) {
              console.error('Telegram update error:', err.message)
            }
          }
        } else if (!data.ok) {
          await new Promise((r) => setTimeout(r, 3000))
        }
      } catch (err) {
        console.warn('Telegram poll error:', err.message)
        await new Promise((r) => setTimeout(r, 4000))
      }
    }
  }

  loop()
}

export function getTelegramPublicStatus() {
  return {
    configured: isTelegramConfigured(),
    botUsername: cachedBot?.username || null,
    mode: process.env.TELEGRAM_WEBHOOK_URL ? 'webhook' : 'polling',
    note: 'Kanali kryesor falas — lidhe nga Cilësimet me një klik',
  }
}
