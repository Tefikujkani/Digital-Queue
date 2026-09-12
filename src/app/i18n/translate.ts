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

const DOCUMENT_KEYS: Record<string, string> = {
  'letërnjoftimi / pasaporta': 'queue.docId',
  'leternjoftimi / pasaporta': 'queue.docId',
  'letërnjoftimi': 'queue.docId',
  'leternjoftimi': 'queue.docId',
  'pasaporta': 'queue.docPassport',
  'numri personal': 'queue.docPersonal',
  'certifikata e lindjes': 'queue.docBirth',
  'certifikatë lindjeje': 'queue.docBirth',
  'certifikata e martesës': 'queue.docMarriage',
  'fotografi': 'queue.docPhoto',
  'aplikacioni': 'queue.docForm',
  'formulari': 'queue.docForm',
  'lična karta / pasoš': 'queue.docId',
  'lična karta': 'queue.docId',
  'pasoš': 'queue.docPassport',
  'lični broj': 'queue.docPersonal',
  'id card / passport': 'queue.docId',
  'personal number': 'queue.docPersonal',
  'birth certificate': 'queue.docBirth',
  'marriage certificate': 'queue.docMarriage',
}

export function translateDocument(
  name: string,
  t: (key: string) => string = (key) => translate(key),
): string {
  const key = DOCUMENT_KEYS[String(name || '').trim().toLowerCase()]
  return key ? t(key) : name
}
