import { executeChatTool } from './chatTools.js'

/**
 * Asistent lokal në shqip — përdor të njëjtat tools si Grok
 * kur XAI_API_KEY mungon ose API dështon.
 */
const COPY = {
  sq: {
    loginTickets:
      'Për të parë ticket-et e tua, duhet të **kyçesh** në llogari.\n\nShko te /login ose regjistrohu te /register, pastaj pyet përsëri.',
    noTickets:
      'Nuk ke ticket aktiv për momentin.\n\nMund të marrësh një numër digjital nga /institutions ose të rezervosh termin te /appointments.',
    ticketsTitle: (n) => `Ja ticket-et e tua (${n}):`,
    dashboard: 'Paneli yt: /dashboard/citizen',
    useful:
      'Lidhje të dobishme:\n• Institucionet: /institutions\n• Terminet: /appointments\n• Hyrja: /login',
    openAppointments: 'Hape: /appointments',
    noExact:
      'Nuk gjeta status të saktë, por ja disa institucione:\n\n',
    askWait: '\n\nHap njërin dhe pyet: “Sa është pritja te [emri]?”',
    noInst:
      'Nuk gjeta institucion me atë emër. Provo p.sh. “Cilat institucione ka në Prishtinë?” ose shko te /institutions.',
    waiting: 'Në pritje',
    eta: 'Koha e përafërt',
    called: 'Duke u thirrur',
    minutes: 'minuta',
    people: 'persona',
    openQueue: 'Hap radhën',
    noBest:
      'Nuk gjeta institucionin. Shkruaj emrin ose shiko /institutions.',
    loadLow: 'e ulët',
    loadMed: 'mesatare',
    loadHigh: 'e lartë',
    forInst: (name, load, n) =>
      `Për **${name}** (ngarkesa tani: **${load}**, ${n} në pritje):`,
    noFilter:
      'Nuk gjeta institucione me këtë filtër. Provo një qytet tjetër ose hap /institutions.',
    found: (n) => `Gjeta **${n}** institucione:\n\n`,
    clickLink: '\n\nKliko lidhjen për të marrë numër digjital.',
    noDetail:
      'Nuk gjeta atë institucion. Shkruaj emrin më qartë ose kërko te /institutions.',
    address: 'Adresa',
    hours: 'Orari',
    phone: 'Telefon',
    services: 'Shërbimet',
    hello:
      `Përshëndetje! Unë jam **Asistenti SmartQueue**.\n\n` +
      `Mund të të ndihmoj me:\n` +
      `• Kërkimin e institucioneve\n` +
      `• Statusin e radhës live\n` +
      `• Si merret numri digjital / terminet\n` +
      `• Ticket-et e tua (nëse je i kyçur)\n\n` +
      `Provo p.sh.: “Cilat institucione ka në Prishtinë?”`,
    fallbackStart: 'Ja çfarë mund të bëj për ty:\n\n',
    related: 'Disa institucione të lidhura:\n',
    askMore: 'Pyet më konkretisht, p.sh. “Si rezervoj termin?” ose “Sa është pritja në spital?”.',
  },
  en: {
    loginTickets:
      'To see your tickets, please **log in**.\n\nGo to /login or register at /register, then ask again.',
    noTickets:
      'You have no active ticket right now.\n\nTake a digital number from /institutions or book at /appointments.',
    ticketsTitle: (n) => `Your tickets (${n}):`,
    dashboard: 'Your dashboard: /dashboard/citizen',
    useful:
      'Useful links:\n• Institutions: /institutions\n• Appointments: /appointments\n• Login: /login',
    openAppointments: 'Open: /appointments',
    noExact: 'I could not find an exact status, but here are some institutions:\n\n',
    askWait: '\n\nOpen one and ask: “How long is the wait at [name]?”',
    noInst:
      'I could not find that institution. Try “Which institutions are in Prishtina?” or go to /institutions.',
    waiting: 'Waiting',
    eta: 'Estimated time',
    called: 'Now being called',
    minutes: 'minutes',
    people: 'people',
    openQueue: 'Open the queue',
    noBest: 'I could not find that institution. Type the name or see /institutions.',
    loadLow: 'low',
    loadMed: 'medium',
    loadHigh: 'high',
    forInst: (name, load, n) =>
      `For **${name}** (current load: **${load}**, ${n} waiting):`,
    noFilter:
      'No institutions matched that filter. Try another city or open /institutions.',
    found: (n) => `Found **${n}** institutions:\n\n`,
    clickLink: '\n\nOpen a link to take a digital number.',
    noDetail: 'I could not find that institution. Type the name more clearly or search /institutions.',
    address: 'Address',
    hours: 'Hours',
    phone: 'Phone',
    services: 'Services',
    hello:
      `Hello! I am the **SmartQueue Assistant**.\n\n` +
      `I can help with:\n` +
      `• Finding institutions\n` +
      `• Live queue status\n` +
      `• Digital numbers and appointments\n` +
      `• Your tickets (if you are signed in)\n\n` +
      `Try: “Which institutions are in Prishtina?”`,
    fallbackStart: 'Here is what I can do for you:\n\n',
    related: 'Related institutions:\n',
    askMore: 'Ask more specifically, e.g. “How do I book an appointment?” or “How long is the hospital wait?”.',
  },
  sr: {
    loginTickets:
      'Da vidiš tikete, moraš da se **prijaviš**.\n\nIdi na /login ili se registruj na /register, pa pitaj ponovo.',
    noTickets:
      'Trenutno nemaš aktivan tiket.\n\nUzmi digitalni broj na /institutions ili rezerviši na /appointments.',
    ticketsTitle: (n) => `Tvoji tiketi (${n}):`,
    dashboard: 'Tvoj panel: /dashboard/citizen',
    useful:
      'Korisni linkovi:\n• Institucije: /institutions\n• Termini: /appointments\n• Prijava: /login',
    openAppointments: 'Otvori: /appointments',
    noExact: 'Nisam našao tačan status, ali evo nekih institucija:\n\n',
    askWait: '\n\nOtvori jednu i pitaj: „Koliko se čeka kod [ime]?“',
    noInst:
      'Nisam našao tu instituciju. Probaj „Koje institucije ima u Prištini?“ ili idi na /institutions.',
    waiting: 'Na čekanju',
    eta: 'Procenjeno vreme',
    called: 'Trenutno se poziva',
    minutes: 'minuta',
    people: 'osoba',
    openQueue: 'Otvori red',
    noBest: 'Nisam našao instituciju. Upiši ime ili vidi /institutions.',
    loadLow: 'nizak',
    loadMed: 'srednji',
    loadHigh: 'visok',
    forInst: (name, load, n) =>
      `Za **${name}** (opterećenje sada: **${load}**, ${n} na čekanju):`,
    noFilter:
      'Nema institucija za taj filter. Probaj drugi grad ili otvori /institutions.',
    found: (n) => `Našao sam **${n}** institucija:\n\n`,
    clickLink: '\n\nOtvori link da uzmeš digitalni broj.',
    noDetail: 'Nisam našao tu instituciju. Upiši ime jasnije ili pretraži /institutions.',
    address: 'Adresa',
    hours: 'Radno vreme',
    phone: 'Telefon',
    services: 'Usluge',
    hello:
      `Zdravo! Ja sam **SmartQueue asistent**.\n\n` +
      `Mogu da pomognem sa:\n` +
      `• Traženjem institucija\n` +
      `• Statusom reda uživo\n` +
      `• Digitalnim brojem i terminima\n` +
      `• Tvojim tiketima (ako si prijavljen)\n\n` +
      `Probaj: „Koje institucije ima u Prištini?“`,
    fallbackStart: 'Evo šta mogu da uradim za tebe:\n\n',
    related: 'Povezane institucije:\n',
    askMore: 'Pitaj konkretnije, npr. „Kako da rezervišem termin?“ ili „Koliko se čeka u bolnici?“.',
  },
}

export async function chatLocally({ messages, language = 'sq', user = null, onEvent }) {
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const text = String(last?.content || '').toLowerCase().trim()
  const lang = ['sq', 'en', 'sr'].includes(language) ? language : 'sq'
  const c = COPY[lang]
  const ctx = { user, language: lang }
  const toolsUsed = []

  const run = async (tool, args = {}) => {
    onEvent?.({ type: 'tool_start', tool, args })
    const result = await executeChatTool(tool, args, ctx)
    toolsUsed.push(tool)
    onEvent?.({ type: 'tool_end', tool, ok: !result?.error })
    return result
  }

  let content = ''

  // Ticket-et e mia
  if (
    /ticket|tiket|radha ime|numri im|ticket-et|tiketat|statusi im|çfarë kam|cfare kam|moji tiket|my tickets|moje tikete/.test(
      text,
    )
  ) {
    const result = await run('get_my_tickets', { status: 'all' })
    if (result.error === 'not_authenticated') {
      content = c.loginTickets
    } else if (!result.tickets?.length) {
      content = c.noTickets
    } else {
      const lines = result.tickets.map(
        (t) =>
          `• **${t.number}** — ${t.institution || '—'} (${statusLabel(t.status, lang)})${
            t.estimatedWaitTime ? `, ~${t.estimatedWaitTime} min` : ''
          }\n  ${t.deepLink}`,
      )
      content = `${c.ticketsTitle(result.count)}\n\n${lines.join('\n')}\n\n${c.dashboard}`
    }
  }
  // Si merret numri / udhëzues
  else if (/si (e )?marr|si (ta )?marr|num[eë]r digjital|si funksionon|si t[eë] filloj|udh[eë]zues|how (do i|to) get|digital number|kako da uzmem|digitalni broj/.test(text)) {
    const topic = /termin|rezerv/.test(text)
      ? 'book_appointment'
      : /prioritet/.test(text)
        ? 'priority'
        : /qr/.test(text)
          ? 'qr_checkin'
          : /njoftim|sms|email/.test(text)
            ? 'notifications'
            : /anulo/.test(text)
              ? 'cancel_ticket'
              : /regjistr|hyr|login|llogari/.test(text)
                ? 'register_login'
                : /num[eë]r|ticket|radh/.test(text)
                  ? 'get_ticket'
                  : 'overview'
    const guide = await run('get_platform_guide', { topic })
    content = `${guide.guide}\n\n${c.useful}`
  }
  // Prioritetet
  else if (/prioritet|priority|prioriteti/.test(text)) {
    const guide = await run('get_platform_guide', { topic: 'priority' })
    content = guide.guide
  }
  // Terminet
  else if (/termin|rezerv|appointment|book/.test(text)) {
    const guide = await run('get_platform_guide', { topic: 'book_appointment' })
    content = `${guide.guide}\n\n${c.openAppointments}`
  }
  // Radha / pritja / spital / institucion + status
  else if (
    /sa (është|eshte) prit|pritja|radha|queue|sa persona|sa njer[eë]z|sa pret|live|how long|wait|čekanj|koliko se/.test(text) ||
    (/spital|komun|bank|atk|posta|universitet/.test(text) && /sa|tani|aktual|status/.test(text))
  ) {
    const name = extractInstitutionHint(text)
    const result = await run('get_queue_status', name ? { name } : { name: 'spital' })
    if (result.error) {
      const search = await run('search_institutions', {
        query: name || text.slice(0, 40),
        limit: 5,
      })
      if (search.institutions?.length) {
        content =
          c.noExact +
          formatInstitutions(search.institutions, lang) +
          c.askWait
      } else {
        content = c.noInst
      }
    } else {
      content =
        `**${result.institution.name}**\n` +
        `• ${c.waiting}: **${result.waitingCount}** ${c.people}\n` +
        `• ${c.eta}: **~${result.estimatedWaitMinutes} ${c.minutes}**\n` +
        (result.currentlyCalled?.length
          ? `• ${c.called}: ${result.currentlyCalled.map((row) => row.number).join(', ')}\n`
          : '') +
        `\n${result.tip || ''}\n\n${c.openQueue}: ${result.deepLink}`
    }
  }
  // Koha më e mirë
  else if (/koh[eë] (m[eë] )?t[eë] mir|kur t[eë] vij|m[eë] pak njer[eë]z|m[eë] qet/.test(text)) {
    const name = extractInstitutionHint(text) || 'komun'
    const result = await run('suggest_best_time', { name })
    if (result.error) {
      content = c.noBest
    } else {
      const loadLabel =
        result.load === 'low' ? c.loadLow : result.load === 'medium' ? c.loadMed : c.loadHigh
      content =
        `${c.forInst(result.institution, loadLabel, result.currentWaiting)}\n\n` +
        result.suggestions.map((s) => `• **${s.window}** — ${s.note}`).join('\n') +
        `\n\n${c.openQueue}: ${result.deepLink}\n${c.openAppointments}`
    }
  }
  // Kërkim institucionesh / qytet
  else if (
    /institucion|institucij|ku mund|cilat|gjej|k[eë]rko|prishtin|prištin|pristina|prizren|pej[eë]|gjakov|mitrovic|ferizaj|gjilan|bank|spital|bolnic|komun|opštin|posta|pošt|universitet|atk/.test(
      text,
    )
  ) {
    const cityMatch = text.match(
      /(prishtin[eë]?|prizren|pej[eë]|gjakov[eë]?|mitrovic[eë]?|ferizaj|gjilan[eë]?)/i,
    )
    const type = detectType(text)
    const query = text
      .replace(
        /cilat|institucione|ka|n[eë]|t[eë]|me|p[eë]r|gjej|k[eë]rko|ju lutem|\?/gi,
        ' ',
      )
      .trim()
      .slice(0, 60)

    const result = await run('search_institutions', {
      query: query || undefined,
      city: cityMatch?.[1],
      type,
      limit: 8,
    })

    if (!result.institutions?.length) {
      content = c.noFilter
    } else {
      content =
        c.found(result.count) +
        formatInstitutions(result.institutions, lang) +
        c.clickLink
    }
  }
  // Detaje për një institucion
  else if (/orar|orari|telefon|kontakt|sh[eë]rbim|adres/.test(text)) {
    const name = extractInstitutionHint(text) || text.slice(0, 40)
    const result = await run('get_institution_details', { name })
    if (result.error) {
      content = c.noDetail
    } else {
      const services = (result.services || [])
        .map((s) => `• ${s.name}${s.estimatedTime ? ` (~${s.estimatedTime} min)` : ''}`)
        .join('\n')
      content =
        `**${result.name}** (${typeLabel(result.type, lang)})\n` +
        `• ${c.address}: ${result.location?.address || '—'}, ${result.location?.city || ''}\n` +
        `• ${c.hours}: ${result.workingHours?.open || '?'} – ${result.workingHours?.close || '?'}\n` +
        `• ${c.phone}: ${result.contact?.phone || '—'}\n` +
        (services ? `\n${c.services}:\n${services}\n` : '') +
        `\n${c.openQueue}: ${result.deepLink}`
    }
  }
  // Përshëndetje / default
  else if (/^(pershendetje|përshëndetje|hello|hi|hey|tung|zdravo|cao|ćao|mir[eë]dita|si je)/.test(text)) {
    content = c.hello
  } else {
    // Fallback: kërko institucione + udhëzues i shkurtër
    const [search, guide] = await Promise.all([
      run('search_institutions', { query: text.slice(0, 50), limit: 4 }),
      run('get_platform_guide', { topic: 'overview' }),
    ])
    content =
      `${c.fallbackStart}${guide.guide}\n\n` +
      (search.institutions?.length
        ? `${c.related}${formatInstitutions(search.institutions, lang)}\n\n`
        : '') +
      c.askMore
  }

  // Stream artificial për UX të njëjtë
  onEvent?.({ type: 'delta', content })
  onEvent?.({
    type: 'done',
    content,
    toolsUsed,
    model: `smartqueue-local-${lang}`,
  })

  return { content, toolsUsed, model: `smartqueue-local-${lang}` }
}

function formatInstitutions(list, lang = 'sq') {
  return list
    .map(
      (i) =>
        `• **${i.name}** (${typeLabel(i.type, lang)}${i.city ? `, ${i.city}` : ''})\n  ${i.deepLink}`,
    )
    .join('\n')
}

function extractInstitutionHint(text) {
  const patterns = [
    /(?:te|n[eë]|p[eë]r)\s+([a-zçëgigjshzh\s]{3,40})/i,
    /(spital[i]?[^\s,]*)/i,
    /(komun[aë][^\s,]*)/i,
    /(bank[aë][^\s,]*)/i,
    /(posta)/i,
    /(atk)/i,
    /(universitet[i]?[^\s,]*)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function detectType(text) {
  if (/spital|sh[eë]ndet|qmf/.test(text)) return 'hospital'
  if (/komun/.test(text)) return 'municipality'
  if (/bank/.test(text)) return 'bank'
  if (/universitet/.test(text)) return 'university'
  if (/posta/.test(text)) return 'post'
  if (/ministri/.test(text)) return 'ministry'
  if (/gjykat/.test(text)) return 'court'
  if (/atk|tatim/.test(text)) return 'other'
  return undefined
}

function statusLabel(s, lang = 'sq') {
  const map = {
    sq: { waiting: 'në pritje', called: 'u thirr', completed: 'përfunduar', cancelled: 'anuluar' },
    en: { waiting: 'waiting', called: 'called', completed: 'completed', cancelled: 'cancelled' },
    sr: { waiting: 'na čekanju', called: 'pozvan', completed: 'završeno', cancelled: 'otkazano' },
  }
  return (map[lang] || map.sq)[s] || s
}

function typeLabel(t, lang = 'sq') {
  const map = {
    sq: {
      municipality: 'Komunë',
      hospital: 'Spital',
      bank: 'Bankë',
      university: 'Universitet',
      post: 'Postë',
      ministry: 'Ministri',
      utility: 'Shërbim publik',
      court: 'Gjykatë',
      embassy: 'Ambasadë',
      other: 'Tjetër',
    },
    en: {
      municipality: 'Municipality',
      hospital: 'Hospital',
      bank: 'Bank',
      university: 'University',
      post: 'Post',
      ministry: 'Ministry',
      utility: 'Public utility',
      court: 'Court',
      embassy: 'Embassy',
      other: 'Other',
    },
    sr: {
      municipality: 'Opština',
      hospital: 'Bolnica',
      bank: 'Banka',
      university: 'Univerzitet',
      post: 'Pošta',
      ministry: 'Ministarstvo',
      utility: 'Javna usluga',
      court: 'Sud',
      embassy: 'Ambasada',
      other: 'Ostalo',
    },
  }
  return (map[lang] || map.sq)[t] || t
}
