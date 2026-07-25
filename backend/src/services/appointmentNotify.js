import { deliverSmartMessage } from './smsService.js'

/**
 * Formato orën e terminit në zonën e Kosovës
 */
export function formatAppointmentLocal(scheduledAt) {
  const d = new Date(scheduledAt)
  const dateStr = d.toLocaleDateString('sq-AL', {
    timeZone: 'Europe/Belgrade',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('sq-AL', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
  })
  return { dateStr, timeStr }
}

export function buildAppointmentSms({
  ticketNumber,
  institutionName,
  serviceName,
  scheduledAt,
  kind = 'confirm',
}) {
  const { dateStr, timeStr } = formatAppointmentLocal(scheduledAt)
  if (kind === 'reminder') {
    return `SmartQueue Kujtesë: Termini juaj te ${institutionName} (${serviceName || 'shërbim'}) është ${dateStr} ora ${timeStr}. Numri: ${ticketNumber}. Merrni QR-në me vete.`
  }
  return `SmartQueue: Termini u KONFIRMUAR. ${institutionName} — ${serviceName || 'shërbim'}. ${dateStr} ora ${timeStr}. Numri: ${ticketNumber}. Hap aplikacionin për QR.`
}

/**
 * Cascade i avancuar për njoftime termini
 */
export async function sendAppointmentSMS({
  phone,
  email,
  telegramChatId,
  viberId,
  whatsappPhone,
  body,
  subject,
}) {
  return deliverSmartMessage({
    phone,
    email,
    telegramChatId,
    viberId,
    whatsappPhone,
    body,
    subject,
  })
}
