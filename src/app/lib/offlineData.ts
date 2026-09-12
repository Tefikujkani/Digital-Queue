import type { Institution, User } from '../types'
import type { ChatMessage } from './chatApi'
import type { VoiceGuide } from './voiceApi'

const USERS_KEY = 'smartqueue_local_users'

type LocalUser = User & { passwordHash: string }

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function readUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function writeUsers(users: LocalUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function toPublicUser(user: LocalUser): User {
  const { passwordHash: _passwordHash, ...rest } = user
  return rest
}

export async function localRegister(input: {
  name: string
  email: string
  password: string
  phone?: string
}): Promise<User> {
  const email = input.email.trim().toLowerCase()
  const users = readUsers()
  if (users.some((u) => u.email === email)) {
    throw new Error('Ky email është i regjistruar. Provo hyrjen.')
  }
  const user: LocalUser = {
    id: `local-${Date.now()}`,
    name: input.name.trim(),
    email,
    phone: input.phone,
    role: 'citizen',
    createdAt: new Date(),
    passwordHash: await hashPassword(input.password),
  }
  writeUsers([...users, user])
  return toPublicUser(user)
}

export async function localLogin(email: string, password: string): Promise<User> {
  const users = readUsers()
  const found = users.find((u) => u.email === email.trim().toLowerCase())
  if (!found) {
    throw new Error('Email ose fjalëkalimi nuk është i saktë.')
  }
  const hash = await hashPassword(password)
  if (found.passwordHash !== hash) {
    throw new Error('Email ose fjalëkalimi nuk është i saktë.')
  }
  return toPublicUser(found)
}

export const FALLBACK_INSTITUTIONS: Institution[] = [
  {
    id: 'prishtine-komuna',
    name: 'Komuna e Prishtinës',
    type: 'municipality',
    city: 'Prishtinë',
    location: { address: 'Sheshi Skënderbej', city: 'Prishtinë', lat: 42.6629, lng: 21.1655 },
    workingHours: { open: '08:00', close: '16:00' },
    services: [
      { id: 'cert-lindje', name: 'Certifikatë lindjeje', description: '', estimatedTime: 12 },
      { id: 'leternjoftim', name: 'Letërnjoftim', description: '', estimatedTime: 20 },
    ],
    isActive: true,
  },
  {
    id: 'qkuk',
    name: 'QKUK — Qendra Klinike Universitare',
    type: 'hospital',
    city: 'Prishtinë',
    location: { address: 'Lagjja e Spitalit', city: 'Prishtinë', lat: 42.648, lng: 21.157 },
    workingHours: { open: '07:00', close: '20:00' },
    services: [{ id: 'familjar', name: 'Mjeku familjar', description: '', estimatedTime: 25 }],
    isActive: true,
  },
  {
    id: 'atk-prishtine',
    name: 'ATK Prishtinë',
    type: 'atk',
    city: 'Prishtinë',
    location: { address: 'Rr. Agim Ramadani', city: 'Prishtinë', lat: 42.66, lng: 21.16 },
    workingHours: { open: '08:00', close: '16:00' },
    services: [{ id: 'tvsh', name: 'Deklarata tatimore', description: '', estimatedTime: 15 }],
    isActive: true,
  },
]

export const FALLBACK_CITIES = [
  { name: 'Prishtinë', count: 3 },
  { name: 'Prizren', count: 1 },
  { name: 'Pejë', count: 1 },
  { name: 'Gjakovë', count: 1 },
  { name: 'Mitrovicë', count: 1 },
  { name: 'Ferizaj', count: 1 },
]

export function localVoiceIntent(input: {
  transcript: string
  language?: string
}): VoiceGuide {
  const q = input.transcript.toLowerCase()
  const lang = input.language === 'en' ? 'en' : input.language === 'sr' ? 'sr' : 'sq'
  const inst =
    FALLBACK_INSTITUTIONS.find((i) => q.includes(i.name.toLowerCase().slice(0, 6))) ||
    FALLBACK_INSTITUTIONS[0]

  const docs =
    q.includes('letërnjoft') || q.includes('leternjoft') || q.includes('id') || q.includes('ličn')
      ? ['Letërnjoftimi / Pasaporta', 'Numri personal', 'Fotografi']
      : ['Letërnjoftimi', 'Numri personal']

  const speak = {
    sq: `Për ${inst.name} merrni me vete: ${docs.join(', ')}. Orari është ${inst.workingHours.open}–${inst.workingHours.close}. Hapeni radhën nga Institucionet.`,
    en: `For ${inst.name} bring: ${docs.join(', ')}. Hours ${inst.workingHours.open}–${inst.workingHours.close}. Open the queue from Institutions.`,
    sr: `Za ${inst.name} ponesite: ${docs.join(', ')}. Radno vreme ${inst.workingHours.open}–${inst.workingHours.close}.`,
  }[lang]

  return {
    ok: true,
    speak,
    institution: {
      id: inst.id,
      name: inst.name,
      city: inst.city,
      address: inst.location?.address,
      hours: inst.workingHours,
      deepLink: `/queue/${inst.id}`,
    },
    service: inst.services[0]
      ? { id: inst.services[0].id, name: inst.services[0].name, estimatedTime: inst.services[0].estimatedTime }
      : null,
    documents: docs,
    when: {
      open: true,
      label: `${inst.workingHours.open}–${inst.workingHours.close}`,
      load: 'low',
      waiting: 4,
      estimatedWaitMinutes: inst.services[0]?.estimatedTime || 15,
      bestWindow: '09:00–11:00',
      spoken: speak,
    },
    suggestions: [],
  }
}

export function localChatReply(messages: ChatMessage[], language: string) {
  const last = messages.filter((m) => m.role === 'user').at(-1)?.content || ''
  const q = last.toLowerCase()
  const lang = language === 'en' ? 'en' : language === 'sr' ? 'sr' : 'sq'

  if (q.includes('termin') || q.includes('appoint') || q.includes('rezerv')) {
    return {
      sq: 'Për termin: hap **Terminet**, zgjidh institucionin, datën dhe orën. Nëse s’je i kyçur, shko te /register ose /login.',
      en: 'To book: open **Appointments**, pick institution, date and time. If needed go to /register or /login.',
      sr: 'Za termin: otvori **Termine**, izaberi ustanovu, datum i vreme. Ako treba idi na /register ili /login.',
    }[lang]
  }
  if (q.includes('numër') || q.includes('numer') || q.includes('ticket') || q.includes('broj')) {
    return {
      sq: 'Numrin digjital e merr te **Institucionet** → zgjidh zyrën → **Merr numër**.',
      en: 'Get a digital number from **Institutions** → pick an office → **Get number**.',
      sr: 'Digitalni broj uzimaš u **Institucije** → izaberi ustanovu → **Uzmi broj**.',
    }[lang]
  }

  return {
    sq: 'Mund të të ndihmoj me radhën, dokumentet dhe terminet.\n\n• Institucionet: /institutions\n• Terminet: /appointments\n• Hyrja: /login\n• Regjistrimi: /register\n\nShkruaj p.sh. “dokumente për letërnjoftim”.',
    en: 'I can help with queues, documents and appointments.\n\n• Institutions: /institutions\n• Appointments: /appointments\n• Login: /login\n• Register: /register',
    sr: 'Mogu da pomognem za red, dokumenta i termine.\n\n• Institucije: /institutions\n• Termini: /appointments\n• Prijava: /login\n• Registracija: /register',
  }[lang]
}

export function isNetworkError(error: any) {
  return !error?.response
}
