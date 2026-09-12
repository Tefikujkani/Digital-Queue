import Institution from '../models/Institution.js'
import Ticket from '../models/Ticket.js'

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const DOC_CATALOG = [
  {
    keys: ['leternjoftim', 'pasaporte', 'dokumente personale', 'karte identiteti'],
    label: 'Letërnjoftim & pasaportë',
    docs: ['Letërnjoftimi aktual ose i skaduar', 'Dy fotografi 3.5×4.5', 'Numri personal', 'Dëshmi e pagesës së taksës'],
  },
  {
    keys: ['certifikata te lindjes', 'certifikate lindjeje', 'gjendja civile', 'ofiqaria', 'martese'],
    label: 'Gjendja civile / certifikata',
    docs: ['Letërnjoftimi', 'Numri personal', 'Të dhënat e prindërve / bashkëshortit (nëse kërkohet)'],
  },
  {
    keys: ['automjet', 'regjistrim', 'targa', 'pronarit', 'veture'],
    docs: ['Letërnjoftimi', 'Certifikata e regjistrimit', 'Certifikata e sigurimit', 'Fatura e taksave'],
  },
  {
    keys: ['leje ndertimi', 'urbanistik', 'ndertim'],
    docs: ['Letërnjoftimi', 'Plan urbanistik', 'Dokumenti i pronësisë', 'Projekti i ndërtimit'],
  },
  {
    keys: ['ambulanc', 'spital', 'konsulte', 'mjek'],
    docs: ['Letërnjoftimi', 'Kartela shëndetësore', 'Analizat / receta e mjekut (nëse ka)'],
  },
  {
    keys: ['laborator', 'analiza'],
    docs: ['Letërnjoftimi', 'Kartela shëndetësore', 'Udhëzimi i mjekut'],
  },
  {
    keys: ['atk', 'tatim', 'deklarim'],
    docs: ['Letërnjoftimi', 'Numri fiskal / personal', 'Dokumentet e të ardhurave'],
  },
  {
    keys: ['llogari', 'bank', 'kredi'],
    docs: ['Letërnjoftimi', 'Vërtetim adrese', 'Vërtetim page (për kredi)'],
  },
  {
    keys: ['poste', 'kolete', 'pako'],
    docs: ['Letërnjoftimi', 'Kodi i dërgesës (nëse e keni)'],
  },
  {
    keys: ['bursa', 'student', 'universitet', 'transkript'],
    docs: ['Letërnjoftimi', 'Indeksi / ID studentore', 'Vërtetim i statusit'],
  },
]

const DEFAULT_DOCS = ['Letërnjoftimi', 'Numri personal']

export function inferDocuments(serviceName, existing) {
  if (Array.isArray(existing) && existing.length) return existing
  const n = normalize(serviceName)
  const hit = DOC_CATALOG.find((row) => row.keys.some((k) => n.includes(k)))
  return hit ? hit.docs : DEFAULT_DOCS
}

function parseIntentKind(text) {
  const n = normalize(text)
  if (/dokument|cfare duhet|qka duhet|cka duhet|cka me marr|cfare me marr|lista/.test(n)) {
    return 'documents'
  }
  if (/kur|orar|ore|pritje|vono|me shku|te shkoj|sa kohe|kur vij/.test(n)) {
    return 'when'
  }
  if (/termin|rezerv/.test(n)) return 'appointment'
  if (/numer|bilet|ticket|radhe/.test(n)) return 'ticket'
  return 'guide'
}

const TYPE_HINTS = [
  {
    keys: ['certifikat', 'leternjoftim', 'pasaport', 'ofiqar', 'gjendje', 'civile', 'leje ndertim', 'dokumente personale'],
    type: 'municipality',
  },
  { keys: ['spital', 'ambulanc', 'laborator', 'mjek', 'pediatr', 'kirurg'], type: 'hospital' },
  { keys: ['bank', 'kredi', 'llogari'], type: 'bank' },
  { keys: ['atk', 'tatim', 'deklarim'], type: 'ministry' },
  { keys: ['poste', 'kolete'], type: 'post' },
  { keys: ['universitet', 'student', 'bursa'], type: 'university' },
]

function detectType(text) {
  const n = normalize(text)
  const hit = TYPE_HINTS.find((row) => row.keys.some((k) => n.includes(k)))
  return hit?.type || null
}

function detectCity(text) {
  const n = normalize(text)
  const cities = [
    'prishtine',
    'prizren',
    'peje',
    'gjakove',
    'mitrovice',
    'gjilan',
    'ferizaj',
    'fushe kosove',
    'podujeve',
    'vushtrri',
    'rahovec',
    'suhareke',
    'malisheve',
    'lipjan',
    'drenas',
    'kline',
    'istog',
    'decan',
    'kacanik',
    'shtime',
    'obiliq',
    'gracanice',
  ]
  return cities.find((c) => n.includes(c)) || null
}

function wordsOverlap(a, b) {
  if (a === b) return true
  if (a.length > 4 && b.length > 4 && (a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5)))) {
    return true
  }
  return a.includes(b) || b.includes(a)
}

function scoreName(hay, needle) {
  const h = normalize(hay)
  const n = normalize(needle)
  if (!n || n.length < 3) return 0
  if (h === n) return 100
  if (h.includes(n) || n.includes(h)) return 70
  const words = n.split(' ').filter((w) => w.length > 3)
  const hayWords = h.split(' ').filter((w) => w.length > 2)
  return words.filter((w) => hayWords.some((hw) => wordsOverlap(hw, w))).length * 18
}

function normLang(raw) {
  const lang = String(raw || '').toLowerCase().slice(0, 2)
  return ['sq', 'en', 'sr'].includes(lang) ? lang : 'sq'
}

function translateDocName(name, lang) {
  const map = {
    'Letërnjoftimi / Pasaporta': { en: 'ID card / Passport', sr: 'Lična karta / Pasoš' },
    'Letërnjoftimi': { en: 'ID card', sr: 'Lična karta' },
    'Letërnjoftimi aktual ose i skaduar': { en: 'Current or expired ID card', sr: 'Važeća ili istekla lična karta' },
    'Pasaporta': { en: 'Passport', sr: 'Pasoš' },
    'Numri personal': { en: 'Personal number', sr: 'Lični broj' },
    'Numri fiskal / personal': { en: 'Fiscal / personal number', sr: 'Fiskalni / lični broj' },
    'Dy fotografi 3.5×4.5': { en: 'Two 3.5×4.5 photos', sr: 'Dve fotografije 3.5×4.5' },
    'Dëshmi e pagesës së taksës': { en: 'Tax payment proof', sr: 'Dokaz o plaćenoj taksi' },
    'Plan urbanistik': { en: 'Urban plan', sr: 'Urbanistički plan' },
    'Dokumenti i pronësisë': { en: 'Ownership document', sr: 'Dokument o vlasništvu' },
    'Projekti i ndërtimit': { en: 'Construction project', sr: 'Projekat izgradnje' },
    'Dokumentet e të ardhurave': { en: 'Income documents', sr: 'Dokumenta o prihodima' },
    'Kodi i dërgesës (nëse e keni)': { en: 'Shipment code (if you have it)', sr: 'Kod pošiljke (ako ga imate)' },
    'Indeksi / ID studentore': { en: 'Student index / ID', sr: 'Indeks / studentska iskaznica' },
    'Vërtetim i statusit': { en: 'Status certificate', sr: 'Potvrda o statusu' },
  }
  if (lang === 'sq') return name
  return map[name]?.[lang] || name
}

function isOpenNow(hours, language = 'sq') {
  const lang = normLang(language)
  if (!hours?.open || !hours?.close) {
    return {
      open: true,
      label:
        lang === 'en'
          ? 'Hours are incomplete'
          : lang === 'sr'
            ? 'Radno vreme nije potpuno'
            : 'Orari nuk është i plotë',
    }
  }
  const [oh, om] = hours.open.split(':').map(Number)
  const [ch, cm] = hours.close.split(':').map(Number)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }))
  const day = now.getDay()
  if (day === 0 || day === 6) {
    return {
      open: false,
      label:
        lang === 'en'
          ? `Closed on weekends. Opens Monday at ${hours.open}`
          : lang === 'sr'
            ? `Zatvoreno vikendom. Otvara se u ponedeljak u ${hours.open}`
            : `I mbyllur fundjavë. Hapet të hënën në ${hours.open}`,
    }
  }
  const mins = now.getHours() * 60 + now.getMinutes()
  const openM = oh * 60 + om
  const closeM = ch * 60 + cm
  if (mins >= openM && mins < closeM) {
    return {
      open: true,
      label:
        lang === 'en'
          ? `Open now until ${hours.close}`
          : lang === 'sr'
            ? `Otvoreno sada, do ${hours.close}`
            : `Tash osht hapë, deri në orën ${hours.close}`,
    }
  }
  if (mins < openM) {
    return {
      open: false,
      label:
        lang === 'en'
          ? `Still closed. Opens at ${hours.open}`
          : lang === 'sr'
            ? `Još zatvoreno. Otvara se u ${hours.open}`
            : `Ende osht mbyllë. Hapet në orën ${hours.open}`,
    }
  }
  return {
    open: false,
    label:
      lang === 'en'
        ? `Closed today. Hours: ${hours.open}–${hours.close}`
        : lang === 'sr'
          ? `Danas zatvoreno. Radno vreme: ${hours.open}–${hours.close}`
          : `Sot osht mbyllë. Orari: ${hours.open}–${hours.close}`,
  }
}

function whenToGo({ hours, waiting, estimatedWait, bestHour, language = 'sq' }) {
  const lang = normLang(language)
  const status = isOpenNow(hours, lang)
  const load =
    waiting <= 3
      ? lang === 'en'
        ? 'quiet'
        : lang === 'sr'
          ? 'mirno'
          : 'e qetë'
      : waiting <= 10
        ? lang === 'en'
          ? 'medium'
          : lang === 'sr'
            ? 'srednje'
            : 'mesatare'
        : lang === 'en'
          ? 'busy'
          : lang === 'sr'
            ? 'gužva'
            : 'e ngarkuar'
  const parts = [status.label]
  if (waiting > 0) {
    parts.push(
      lang === 'en'
        ? `${waiting} people in line, about ${estimatedWait} minutes wait. The queue is ${load}.`
        : lang === 'sr'
          ? `U redu je ${waiting} osoba, oko ${estimatedWait} minuta čekanja. Red je ${load}.`
          : `Në radhë janë ${waiting} veta, rreth ${estimatedWait} minuta pritje. Radha osht ${load}.`,
    )
  } else {
    parts.push(
      lang === 'en'
        ? 'No queue right now — a good time to go.'
        : lang === 'sr'
          ? 'Trenutno nema reda — dobro je vreme da dođete.'
          : 'Tash s’ka radhë — kohë e mirë me u paraqit.',
    )
  }
  if (bestHour) {
    parts.push(
      lang === 'en'
        ? `The quietest hour is usually ${bestHour}.`
        : lang === 'sr'
          ? `Najmirniji sat je obično ${bestHour}.`
          : `Ora ma e qetë zakonisht osht ${bestHour}.`,
    )
  }
  if (!status.open) {
    parts.push(
      lang === 'en'
        ? 'Better book an appointment, or come during working hours.'
        : lang === 'sr'
          ? 'Bolje rezervišite termin ili dođite u radno vreme.'
          : 'Ma mirë rezervo një termin, ose eja në orarin e punës.',
    )
  } else if (waiting > 10) {
    parts.push(
      lang === 'en'
        ? 'The wait is long. An online appointment is recommended.'
        : lang === 'sr'
          ? 'Čekanje je dugo. Preporučuje se online termin.'
          : 'Pritja osht e gjatë. Rekomandohet termin online.',
    )
  } else {
    parts.push(
      lang === 'en'
        ? 'You can take a number now and go.'
        : lang === 'sr'
          ? 'Možete sada uzeti broj i krenuti.'
          : 'Mundesh me marr numrin tash e me u nis.',
    )
  }
  return { status, load, spoken: parts.join(' ') }
}

async function resolveInstitution({ institutionId, name, transcript, city }) {
  if (institutionId && /^[a-f0-9]{24}$/i.test(institutionId)) {
    const byId = await Institution.findOne({ _id: institutionId, isActive: true }).lean()
    if (byId) return byId
  }

  const rows = await Institution.find({ isActive: true })
    .select('name type location services workingHours contact')
    .limit(120)
    .lean()

  const q = normalize(name || transcript || '')
  if (!q) return rows[0] || null

  let best = null
  let bestScore = 0
  for (const row of rows) {
    let score = scoreName(row.name, q)
    score += scoreName(row.location?.city, q)
    if (city && normalize(row.location?.city).includes(city)) score += 40
    const typeHint = detectType(q)
    if (typeHint && row.type === typeHint) score += 50
    for (const svc of row.services || []) {
      const svcScore = scoreName(svc.name, q)
      if (svcScore) score += svcScore + 10
    }
    if (score > bestScore) {
      bestScore = score
      best = row
    }
  }
  return bestScore >= 12 ? best : null
}

function resolveService(institution, { serviceId, serviceName, transcript }) {
  const services = institution?.services || []
  if (!services.length) return null
  if (serviceId) {
    const hit = services.find(
      (s) => s._id?.toString() === serviceId || s.id === serviceId,
    )
    if (hit) return hit
  }
  const q = normalize(serviceName || transcript || '')
  let best = services[0]
  let bestScore = 0
  for (const svc of services) {
    const score = scoreName(svc.name, q)
    if (score > bestScore) {
      bestScore = score
      best = svc
    }
  }
  if (bestScore < 18) {
    const catalog = DOC_CATALOG.find((row) => row.keys.some((k) => q.includes(k)))
    return {
      name: serviceName || catalog?.label || 'Shërbimi i kërkuar',
      requiredDocuments: catalog?.docs,
      estimatedTime: services[0].estimatedTime || 15,
    }
  }
  return best
}

function buildSpeak({ kind, institution, service, documents, when, language }) {
  const lang = normLang(language)
  const inst = institution?.name || (lang === 'en' ? 'the institution' : lang === 'sr' ? 'institucija' : 'institucioni')
  const svc = service?.name || (lang === 'en' ? 'the service' : lang === 'sr' ? 'usluga' : 'shërbimi')
  const docs = documents.join(', ')
  if (lang === 'en') {
    if (kind === 'documents') return `For ${svc} at ${inst}, bring: ${docs}.`
    if (kind === 'when') return when.spoken
    return `Service ${svc} at ${inst}. Bring: ${docs}. ${when.spoken}`
  }
  if (lang === 'sr') {
    if (kind === 'documents') return `Za uslugu ${svc} kod ${inst} ponesite: ${docs}.`
    if (kind === 'when') return when.spoken
    return `Usluga ${svc} kod ${inst}. Ponesite: ${docs}. ${when.spoken} Recite „uzmi broj“ ili „rezerviši termin“.`
  }
  if (kind === 'documents') {
    return `Për shërbimin ${svc} te ${inst}, duhet me i pas këto dokumente: ${docs}.`
  }
  if (kind === 'when') {
    return `Për ${svc} te ${inst}. ${when.spoken}`
  }
  return `Për shërbimin ${svc} te ${inst}, duhet me i pas këto dokumente: ${docs}. ${when.spoken} Nëse don, thuaj “merr numër” ose “rezervo termin”.`
}

export async function buildServiceGuide({
  institutionId,
  serviceId,
  serviceName,
  name,
  transcript = '',
  language = 'sq',
}) {
  const lang = normLang(language)
  const city = detectCity(transcript)
  const institution = await resolveInstitution({
    institutionId,
    name,
    transcript,
    city,
  })
  if (!institution) {
    return {
      ok: false,
      intent: 'unknown',
      speak:
        lang === 'en'
          ? 'I could not find that institution. Try saying the city and service, for example passport in Prishtina.'
          : lang === 'sr'
            ? 'Nisam našao tu instituciju. Recite grad i uslugu, npr. lična karta u Prištini.'
            : 'S’e gjeta këtë institucion. Thuaj qytetin edhe shërbimin, p.sh. leternjoftim n’Prishtinë.',
      suggestions:
        lang === 'en'
          ? ['ID card in Prishtina', 'When to go to the hospital', 'Documents for a birth certificate']
          : lang === 'sr'
            ? ['Lična karta u Prištini', 'Kada da idem u bolnicu', 'Dokumenta za izvod iz matične knjige']
            : ['Letërnjoftim në Prishtinë', 'Kur të shkoj në spital', 'Dokumente për certifikatë lindjeje'],
    }
  }

  const service = resolveService(institution, { serviceId, serviceName, transcript })
  const documents = inferDocuments(service?.name, service?.requiredDocuments).map((d) =>
    translateDocName(d, lang),
  )
  const waiting = await Ticket.countDocuments({
    institutionId: institution._id,
    status: 'waiting',
  })
  const avgService = service?.estimatedTime || 12
  const estimatedWait = Math.round(waiting * avgService)
  const when = whenToGo({
    hours: institution.workingHours,
    waiting,
    estimatedWait,
    bestHour: '08:00–09:30',
    language: lang,
  })
  const kind = parseIntentKind(transcript)
  const speak = buildSpeak({ kind, institution, service, documents, when, language: lang })

  return {
    ok: true,
    intent: kind,
    speak,
    institution: {
      id: institution._id.toString(),
      name: institution.name,
      city: institution.location?.city,
      address: institution.location?.address,
      hours: institution.workingHours,
      phone: institution.contact?.phone,
      deepLink: `/queue/${institution._id}`,
    },
    service: service
      ? {
          id: service._id?.toString() || service.id,
          name: service.name,
          description: service.description,
          estimatedTime: service.estimatedTime,
        }
      : null,
    documents,
    when: {
      open: when.status.open,
      label: when.status.label,
      load: when.load,
      waiting,
      estimatedWaitMinutes: estimatedWait,
      bestWindow: '08:00–09:30',
      spoken: when.spoken,
    },
    actions: [
      {
        label:
          lang === 'en' ? 'Get a number' : lang === 'sr' ? 'Uzmi broj' : 'Merr numër',
        href: `/queue/${institution._id}`,
      },
      {
        label:
          lang === 'en' ? 'Book appointment' : lang === 'sr' ? 'Rezerviši termin' : 'Rezervo termin',
        href: '/appointments',
      },
    ],
    suggestions:
      lang === 'en'
        ? [
            `Documents for ${service?.name || 'this service'}`,
            `When to go to ${institution.location?.city || institution.name}`,
            'How long is the wait now',
          ]
        : lang === 'sr'
          ? [
              `Dokumenta za ${service?.name || 'ovu uslugu'}`,
              `Kada da dođem u ${institution.location?.city || institution.name}`,
              'Koliko se sada čeka',
            ]
          : [
              `Dokumente për ${service?.name || 'këtë shërbim'}`,
              `Kur të shkoj në ${institution.location?.city || institution.name}`,
              'Sa është pritja tani',
            ],
  }
}

export async function handleVoiceIntent({ transcript, institutionId, serviceId, language }) {
  const text = String(transcript || '').trim()
  if (!text) {
    return {
      ok: false,
      speak:
        normLang(language) === 'en'
          ? 'I did not hear you. Try again, e.g. what documents are needed for an ID card.'
          : normLang(language) === 'sr'
            ? 'Nisam vas čuo. Pokušajte ponovo, npr. koja dokumenta treba za ličnu kartu.'
            : 'S’të kuptova. Provo prap, p.sh. qka dokumente duhen për leternjoftim.',
    }
  }
  return buildServiceGuide({
    transcript: text,
    institutionId,
    serviceId,
    language,
  })
}
