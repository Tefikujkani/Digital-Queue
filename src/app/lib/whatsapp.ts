const WA_PHONE_KEY = 'smartqueue_wa_phone'

export function toWhatsAppDigits(phone?: string | null): string {
  let n = String(phone || '').trim().replace(/[^\d+]/g, '')
  if (!n) return ''
  if (n.startsWith('00')) n = n.slice(2)
  if (n.startsWith('+')) n = n.slice(1)
  if (n.startsWith('0') && n.length >= 8 && n.length <= 10) n = `383${n.slice(1)}`
  else if ((n.length === 8 || n.length === 9) && !n.startsWith('383')) n = `383${n}`
  return n.replace(/\D/g, '')
}

export function rememberWhatsAppPhone(phone?: string | null) {
  const digits = toWhatsAppDigits(phone)
  if (digits) localStorage.setItem(WA_PHONE_KEY, digits)
  return digits
}

export function rememberedWhatsAppPhone(): string {
  try {
    return localStorage.getItem(WA_PHONE_KEY) || ''
  } catch {
    return ''
  }
}

export function buildBookingWhatsAppText(input: {
  name?: string
  ticketNumber: string
  institutionName?: string
  serviceName?: string
  dateStr?: string
  timeStr?: string
  address?: string
}) {
  return [
    '✅ SmartQueue Kosova',
    'Termini u konfirmua — nuk ju duhet email.',
    '',
    `👤 ${input.name || 'Qytetar'}`,
    `🏛️ ${input.institutionName || 'Institucioni'}`,
    `📋 ${input.serviceName || 'Shërbim'}`,
    input.dateStr ? `📅 ${input.dateStr}` : null,
    input.timeStr ? `🕐 Ora ${input.timeStr}` : null,
    `🎫 Numri: ${input.ticketNumber}`,
    input.address ? `📍 ${input.address}` : null,
    '',
    'Merrni me vete dokumentet e nevojshme dhe QR-në në SmartQueue.',
    'Ky mesazh është konfirmimi juaj. Shtyp Dërgo në WhatsApp.',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export function buildWhatsAppShareLink(text: string, phone?: string | null) {
  const encoded = encodeURIComponent(String(text || '').slice(0, 1800))
  const digits = toWhatsAppDigits(phone)
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

export function prepareWhatsAppWindow() {
  try {
    return window.open('about:blank', 'smartqueue-wa')
  } catch {
    return null
  }
}

export function openWhatsApp(url: string, pending?: Window | null) {
  if (!url) return false
  if (pending && !pending.closed) {
    try {
      pending.location.href = url
      return true
    } catch {
      /* fall through */
    }
  }

  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  if (isMobile) {
    window.setTimeout(() => {
      try {
        if (document.visibilityState === 'visible') {
          window.location.assign(url)
        }
      } catch {
        /* ignore */
      }
    }, 350)
  }
  return true
}
