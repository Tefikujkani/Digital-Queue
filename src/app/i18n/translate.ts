import type { Language } from '../types'
import { translations } from './translations'

export function getCurrentLanguage(): Language {
  try {
    const stored = localStorage.getItem('smartqueue_language') || localStorage.getItem('language')
    if (stored === 'sq' || stored === 'en' || stored === 'sr') return stored
  } catch {
    /* ignore */
  }
  return 'sq'
}

export function translate(
  key: string,
  vars?: Record<string, string | number>,
  lang: Language = getCurrentLanguage(),
): string {
  const raw =
    translations[lang][key] || translations.en[key] || translations.sq[key] || key
  if (!vars) return raw
  return Object.entries(vars).reduce(
    (text, [k, v]) => text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    raw,
  )
}
