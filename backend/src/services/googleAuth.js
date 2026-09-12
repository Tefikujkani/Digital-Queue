const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

export function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

export async function verifyGoogleIdToken(idToken) {
  const clientId = googleClientId()
  if (!clientId) {
    const err = new Error('Google Sign-In nuk është konfiguruar')
    err.status = 503
    throw err
  }
  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('Token Google mungon')
    err.status = 400
    throw err
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error || data.error_description) {
    const err = new Error('Token Google i pavlefshëm')
    err.status = 401
    throw err
  }
  if (data.aud !== clientId) {
    const err = new Error('Token Google i pavlefshëm')
    err.status = 401
    throw err
  }
  if (!GOOGLE_ISSUERS.has(String(data.iss || ''))) {
    const err = new Error('Token Google i pavlefshëm')
    err.status = 401
    throw err
  }
  if (data.email_verified !== 'true' && data.email_verified !== true) {
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
