import crypto from 'crypto'

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

function signJwt(payload, secret, expiresInSec = 7 * 24 * 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSec,
    }),
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function parseBody(req) {
  const raw = req.body
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw
}

function decodeJwtPayload(idToken) {
  const payload = String(idToken || '').split('.')[1]
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function verifyGoogleIdToken(idToken) {
  const clientId = googleClientId()
  if (!clientId) {
    const err = new Error('Google Sign-In nuk është konfiguruar')
    err.status = 503
    throw err
  }
  if (!idToken) {
    const err = new Error('Token Google mungon')
    err.status = 400
    throw err
  }

  const data = decodeJwtPayload(idToken)
  if (
    !data ||
    data.aud !== clientId ||
    !GOOGLE_ISSUERS.has(String(data.iss || '')) ||
    Number(data.exp || 0) * 1000 < Date.now()
  ) {
    const err = new Error('Token Google i pavlefshëm')
    err.status = 401
    throw err
  }
  if (data.email_verified !== true && data.email_verified !== 'true') {
    const err = new Error('Email i Google nuk është i verifikuar')
    err.status = 401
    throw err
  }
  const email = String(data.email || '')
    .toLowerCase()
    .trim()
  if (!email) {
    const err = new Error('Google nuk dha email')
    err.status = 400
    throw err
  }
  return {
    googleId: String(data.sub),
    email,
    name: String(data.name || email.split('@')[0]).trim().slice(0, 80),
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  try {
    const body = parseBody(req)
    const credential = body.credential || body.idToken || ''
    const profile = await verifyGoogleIdToken(credential)
    const id = `google-${profile.googleId}`
    const secret = String(process.env.JWT_SECRET || '').trim()
    const token = secret ? signJwt({ id }, secret) : `local-${id}`

    res.status(200).json({
      _id: id,
      id,
      name: profile.name,
      email: profile.email,
      role: 'citizen',
      favorites: [],
      preferredCity: 'Prishtinë',
      telegramChatId: '',
      viberId: '',
      whatsappPhone: '',
      token,
    })
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Hyrja me Google dështoi' })
  }
}
