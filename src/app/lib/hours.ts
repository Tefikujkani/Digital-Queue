/** Orari i punës — Kosovë (Europe/Belgrade) */
export function parseHm(hm: string): number | null {
  if (!hm || !/^\d{1,2}:\d{2}$/.test(hm.trim())) return null
  const [h, m] = hm.trim().split(':').map(Number)
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function getKosovoNowMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date)

  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

export function getKosovoWeekday(date = new Date()): number {
  // 0=Sun … 6=Sat in local Kosovo calendar
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Belgrade',
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[wd] ?? date.getDay()
}

export type OpenStatus = {
  isOpen: boolean
  label: string
  detail: string
}

export function getOpenStatus(
  workingHours?: { open?: string; close?: string } | null,
  opts?: { closedWeekends?: boolean },
): OpenStatus {
  if (!workingHours?.open || !workingHours?.close) {
    return { isOpen: true, label: 'Orar i panjohur', detail: 'Kontakto institucionin' }
  }

  const openM = parseHm(workingHours.open)
  const closeM = parseHm(workingHours.close)
  if (openM == null || closeM == null) {
    return { isOpen: true, label: 'Orar i panjohur', detail: '' }
  }

  const day = getKosovoWeekday()
  if (opts?.closedWeekends !== false && (day === 0 || day === 6)) {
    return {
      isOpen: false,
      label: 'Mbyllur (fundjavë)',
      detail: `Hapet së shpejti · ${workingHours.open}–${workingHours.close}`,
    }
  }

  const now = getKosovoNowMinutes()
  const isOpen = now >= openM && now < closeM
  if (isOpen) {
    return {
      isOpen: true,
      label: 'Hapur tani',
      detail: `Deri në ${workingHours.close}`,
    }
  }
  if (now < openM) {
    return {
      isOpen: false,
      label: 'Ende i mbyllur',
      detail: `Hapet në ${workingHours.open}`,
    }
  }
  return {
    isOpen: false,
    label: 'Mbyllur sot',
    detail: `Orari: ${workingHours.open}–${workingHours.close}`,
  }
}
