type BeforeInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: string }>
}

let deferred: BeforeInstallPrompt | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function applyIosAppClass() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (isIosDevice()) root.classList.add('sq-ios')
  if (isStandaloneApp()) root.classList.add('sq-standalone')
}

export function listenForInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPrompt
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function getInstallPrompt() {
  return deferred
}

export async function promptInstallApp() {
  if (!deferred) return false
  await deferred.prompt()
  deferred = null
  notify()
  return true
}

export function subscribeInstallReady(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
