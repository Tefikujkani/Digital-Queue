/** Orari i Kosovës (Europe/Belgrade = e njëjta offset me Prishtinën) */
export const KOSOVO_TZ = 'Europe/Belgrade'

/**
 * Parse YYYY-MM-DD + HH:mm as Kosovo wall-clock → Date (UTC instant).
 */
export function parseKosovoLocal(dateStr, timeStr = '00:00') {
  const time = String(timeStr).length === 5 ? `${timeStr}:00` : String(timeStr)
  const desired = `${dateStr}T${time}`
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(desired)) {
    return new Date(NaN)
  }

  let guess = Date.parse(`${desired}Z`)
  if (Number.isNaN(guess)) return new Date(NaN)

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: KOSOVO_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(guess))

    const get = (type) => parts.find((p) => p.type === type)?.value
    const hour = get('hour') === '24' ? '00' : get('hour')
    const asLocal = `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}`
    const desiredMs = Date.parse(`${desired}Z`)
    const actualMs = Date.parse(`${asLocal}Z`)
    if (Number.isNaN(desiredMs) || Number.isNaN(actualMs)) break
    const delta = desiredMs - actualMs
    guess += delta
    if (delta === 0) break
  }

  return new Date(guess)
}

/** Ora lokale në Kosovë për një Date */
export function kosovoMinutesOfDay(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KOSOVO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value)
  const h = hour === 24 ? 0 : hour
  return h * 60 + minute
}

export function withinKosovoWorkingHours(institution, date) {
  const open = institution?.workingHours?.open || '08:00'
  const close = institution?.workingHours?.close || '16:00'
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  const mins = kosovoMinutesOfDay(date)
  const openM = oh * 60 + (om || 0)
  const closeM = ch * 60 + (cm || 0)
  return mins >= openM && mins < closeM
}
