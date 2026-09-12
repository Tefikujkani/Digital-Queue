const GIS_SRC = 'https://accounts.google.com/gsi/client'

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          prompt: (callback?: (notification: GooglePromptNotification) => void) => void
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void
          cancel: () => void
        }
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
            error_callback?: (err: { type?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

type GooglePromptNotification = {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
}

export type GoogleSession = {
  googleId: string
  email: string
  name: string
  credential?: string
}

let loadPromise: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let pendingSession: {
  resolve: (session: GoogleSession) => void
  reject: (error: Error) => void
} | null = null

export function getGoogleClientId() {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('NO_WINDOW'))
  if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`) as HTMLScriptElement | null
    const done = () => {
      if (window.google?.accounts) resolve()
      else reject(new Error('NO_GIS'))
    }
    if (existing) {
      if (window.google?.accounts) {
        resolve()
        return
      }
      existing.addEventListener('load', done, { once: true })
      existing.addEventListener('error', () => reject(new Error('Google script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = done
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Google script'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

export function preloadGoogleAuth() {
  if (!getGoogleClientId()) return
  loadGoogleIdentity().catch(() => {})
}

export function decodeGoogleCredential(credential: string): GoogleSession {
  const payload = credential.split('.')[1]
  if (!payload) throw new Error('Token Google i pavlefshëm')
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const json = JSON.parse(atob(padded))
  const email = String(json.email || '')
    .toLowerCase()
    .trim()
  if (!email) throw new Error('Google nuk dha email')
  return {
    googleId: String(json.sub || ''),
    email,
    name: String(json.name || email.split('@')[0]).trim().slice(0, 80),
    credential,
  }
}

async function profileFromAccessToken(accessToken: string): Promise<GoogleSession> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  const email = String(data.email || '')
    .toLowerCase()
    .trim()
  if (!res.ok || !email) throw new Error('NO_CRED')
  return {
    googleId: String(data.sub || ''),
    email,
    name: String(data.name || email.split('@')[0]).trim().slice(0, 80),
  }
}

function startTokenPopup(clientId: string): Promise<GoogleSession> {
  const oauth = window.google?.accounts?.oauth2
  if (!oauth) return Promise.reject(new Error('NO_GIS'))

  return new Promise((resolve, reject) => {
    pendingSession = { resolve, reject }
    if (!tokenClient) {
      tokenClient = oauth.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: (resp) => {
          const pending = pendingSession
          pendingSession = null
          if (!pending) return
          if (!resp?.access_token || resp.error) {
            pending.reject(new Error(resp?.error === 'popup_closed' ? 'CANCELLED' : 'NO_CRED'))
            return
          }
          profileFromAccessToken(resp.access_token).then(pending.resolve, () =>
            pending.reject(new Error('NO_CRED')),
          )
        },
        error_callback: () => {
          const pending = pendingSession
          pendingSession = null
          pending?.reject(new Error('CANCELLED'))
        },
      })
    }
    tokenClient.requestAccessToken()
  })
}

export function requestGoogleSession(): Promise<GoogleSession> {
  const clientId = getGoogleClientId()
  if (!clientId) return Promise.reject(new Error('NO_CLIENT'))

  if (window.google?.accounts?.oauth2) {
    return startTokenPopup(clientId)
  }

  return loadGoogleIdentity().then(() => startTokenPopup(clientId))
}

export async function postGoogleAuth(session: GoogleSession) {
  if (!session.credential) return null
  if (!import.meta.env.PROD) return null

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 2500)
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: session.credential }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.email) return data
  } catch {
    /* login already happened locally */
  } finally {
    window.clearTimeout(timer)
  }
  return null
}
