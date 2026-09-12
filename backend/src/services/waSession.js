import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import makeWASocket, {
  Browsers,
  fetchLatestWaWebVersion,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import QRCode from 'qrcode'
import { toE164Kosovo } from './whatsappService.js'

const AUTH_DIR = path.resolve(process.cwd(), '.wa-session')
const logger = pino({ level: 'silent' })

let sock = null
let starting = null
let reconnectTimer = null
let socketGen = 0
let qrDataUrl = ''
let status = 'idle'
let lastError = ''

function hasSession() {
  return existsSync(path.join(AUTH_DIR, 'creds.json'))
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitUntil(pred, ms = 25000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (pred()) return true
    await sleep(200)
  }
  return false
}

export function getWaSessionState() {
  return {
    ready: status === 'ready' && Boolean(sock),
    status,
    qr: status === 'ready' ? '' : qrDataUrl,
    pairingCode: '',
    hasSession: hasSession(),
    error: lastError || undefined,
  }
}

async function resolveWaVersion() {
  try {
    const live = await fetchLatestWaWebVersion({})
    if (live?.version) return live.version
  } catch {
    /* fallback */
  }
  try {
    const repo = await fetchLatestBaileysVersion()
    if (repo?.version) return repo.version
  } catch {
    /* fallback */
  }
  return [2, 3000, 1042466098]
}

function scheduleReconnect() {
  if (reconnectTimer || starting || sock) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    startWaSession().catch((err) => console.warn('WhatsApp reconnect:', err.message))
  }, 8000)
}

async function connectSocket() {
  if (sock) return
  await mkdir(AUTH_DIR, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const version = await resolveWaVersion()
  const gen = ++socketGen
  console.log(`📱 WhatsApp Web v${version.join('.')}`)

  const socket = makeWASocket({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
  })
  sock = socket

  socket.ev.on('creds.update', async () => {
    try {
      await mkdir(AUTH_DIR, { recursive: true })
      await saveCreds()
    } catch (err) {
      console.warn('WhatsApp creds:', err.message)
    }
  })

  socket.ev.on('connection.update', async (update) => {
    if (gen !== socketGen) return
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      status = 'qr'
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 })
        console.log('📱 WhatsApp QR gati — skanoje te Cilësimet')
      } catch (err) {
        lastError = err.message
      }
    }
    if (connection === 'open') {
      status = 'ready'
      qrDataUrl = ''
      lastError = ''
      console.log('📱 WhatsApp ON — dërgimi automatik')
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.message || 'U shkëput'
      lastError = reason
      if (sock === socket) sock = null
      if (status === 'ready') status = 'disconnected'
      console.warn('WhatsApp u shkëput:', reason)
      if (!/conflict/i.test(reason)) scheduleReconnect()
    }
  })
}

export async function startWaSession(_phoneRaw = '') {
  if (status === 'ready' && sock) return getWaSessionState()
  if (sock) {
    await waitUntil(() => status === 'ready' || Boolean(qrDataUrl), 15000)
    return getWaSessionState()
  }
  if (starting) {
    await starting
    return getWaSessionState()
  }

  if (status !== 'ready') status = 'connecting'
  lastError = ''

  starting = (async () => {
    try {
      await connectSocket()
      await waitUntil(() => status === 'ready' || Boolean(qrDataUrl), 25000)
    } catch (err) {
      status = 'error'
      lastError = err.message
      console.error('WhatsApp session:', err.message)
    } finally {
      starting = null
    }
    return getWaSessionState()
  })()

  return starting
}

export async function stopWaSession() {
  socketGen += 1
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  try {
    if (sock) await sock.end(undefined)
  } catch {
    /* ignore */
  }
  sock = null
  starting = null
  qrDataUrl = ''
  status = 'idle'
  return getWaSessionState()
}

export async function sendViaWaSession(toPhone, text) {
  if (status !== 'ready' || !sock) {
    return { success: false, provider: 'whatsapp-session', reason: 'not_ready' }
  }
  const digits = toE164Kosovo(toPhone)?.replace(/\D/g, '')
  if (!digits) return { success: false, provider: 'whatsapp-session', reason: 'invalid_phone' }
  try {
    const jid = `${digits}@s.whatsapp.net`
    const sent = await sock.sendMessage(jid, { text: String(text).slice(0, 4000) })
    console.log(`✅ WhatsApp u dërgua te +${digits}`)
    return {
      success: true,
      provider: 'whatsapp-session',
      id: sent?.key?.id || '',
    }
  } catch (err) {
    console.error('WhatsApp send:', err.message)
    return { success: false, provider: 'whatsapp-session', error: err.message }
  }
}

export function restoreWaSession() {
  startWaSession().catch((err) => console.warn('WhatsApp session:', err.message))
}
