import { executeChatTool } from './chatTools.js'

/**
 * Asistent lokal në shqip — përdor të njëjtat tools si Grok
 * kur XAI_API_KEY mungon ose API dështon.
 */
export async function chatLocally({ messages, user = null, onEvent }) {
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const text = String(last?.content || '').toLowerCase().trim()
  const language = 'sq'
  const ctx = { user, language }
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
    /ticket|tiket|radha ime|numri im|ticket-et|tiketat|statusi im|çfarë kam|cfare kam/.test(
      text,
    )
  ) {
    const result = await run('get_my_tickets', { status: 'all' })
    if (result.error === 'not_authenticated') {
      content =
        'Për të parë ticket-et e tua, duhet të **kyçesh** në llogari.\n\nShko te /login ose regjistrohu te /register, pastaj pyet përsëri.'
    } else if (!result.tickets?.length) {
      content =
        'Nuk ke ticket aktiv për momentin.\n\nMund të marrësh një numër digjital nga /institutions ose të rezervosh termin te /appointments.'
    } else {
      const lines = result.tickets.map(
        (t) =>
          `• **${t.number}** — ${t.institution || 'Institucion'} (${statusSq(t.status)})${
            t.estimatedWaitTime ? `, ~${t.estimatedWaitTime} min` : ''
          }\n  Hap: ${t.deepLink}`,
      )
      content = `Ja ticket-et e tua (${result.count}):\n\n${lines.join('\n')}\n\nPaneli yt: /dashboard/citizen`
    }
  }
  // Si merret numri / udhëzues
  else if (/si (e )?marr|si (ta )?marr|num[eë]r digjital|si funksionon|si t[eë] filloj|udh[eë]zues/.test(text)) {
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
    content = `${guide.guide}\n\nLidhje të dobishme:\n• Institucionet: /institutions\n• Terminet: /appointments\n• Hyrja: /login`
  }
  // Prioritetet
  else if (/prioritet/.test(text)) {
    const guide = await run('get_platform_guide', { topic: 'priority' })
    content = guide.guide
  }
  // Terminet
  else if (/termin|rezerv|appointment/.test(text)) {
    const guide = await run('get_platform_guide', { topic: 'book_appointment' })
    content = `${guide.guide}\n\nHape: /appointments`
  }
  // Radha / pritja / spital / institucion + status
  else if (
    /sa (është|eshte) prit|pritja|radha|queue|sa persona|sa njer[eë]z|sa pret|live/.test(text) ||
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
          `Nuk gjeta status të saktë, por ja disa institucione:\n\n` +
          formatInstitutions(search.institutions) +
          `\n\nHap njërin dhe pyet: “Sa është pritja te [emri]?”`
      } else {
        content =
          'Nuk gjeta institucion me atë emër. Provo p.sh. “Cilat institucione ka në Prishtinë?” ose shko te /institutions.'
      }
    } else {
      content =
        `**${result.institution.name}**\n` +
        `• Në pritje: **${result.waitingCount}** persona\n` +
        `• Koha e përafërt: **~${result.estimatedWaitMinutes} minuta**\n` +
        (result.currentlyCalled?.length
          ? `• Duke u thirrur: ${result.currentlyCalled.map((c) => c.number).join(', ')}\n`
          : '') +
        `\n${result.tip}\n\nHap radhën: ${result.deepLink}`
    }
  }
  // Koha më e mirë
  else if (/koh[eë] (m[eë] )?t[eë] mir|kur t[eë] vij|m[eë] pak njer[eë]z|m[eë] qet/.test(text)) {
    const name = extractInstitutionHint(text) || 'komun'
    const result = await run('suggest_best_time', { name })
    if (result.error) {
      content =
        'Nuk gjeta institucionin. Shkruaj emrin (p.sh. “Kur është më mirë te Komuna e Prishtinës?”) ose shiko /institutions.'
    } else {
      const loadSq =
        result.load === 'low' ? 'e ulët' : result.load === 'medium' ? 'mesatare' : 'e lartë'
      content =
        `Për **${result.institution}** (ngarkesa tani: **${loadSq}**, ${result.currentWaiting} në pritje):\n\n` +
        result.suggestions.map((s) => `• **${s.window}** — ${s.note}`).join('\n') +
        `\n\nRadha: ${result.deepLink}\nTerminet: ${result.appointmentsLink}`
    }
  }
  // Kërkim institucionesh / qytet
  else if (
    /institucion|ku mund|cilat|gjej|k[eë]rko|prishtin|prizren|pej[eë]|gjakov|mitrovic|ferizaj|gjilan|bank|spital|komun|posta|universitet|atk/.test(
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
      content =
        'Nuk gjeta institucione me këtë filtër. Provo një qytet tjetër ose hap /institutions.'
    } else {
      content =
        `Gjeta **${result.count}** institucione:\n\n` +
        formatInstitutions(result.institutions) +
        `\n\nKliko lidhjen për të marrë numër digjital.`
    }
  }
  // Detaje për një institucion
  else if (/orar|orari|telefon|kontakt|sh[eë]rbim|adres/.test(text)) {
    const name = extractInstitutionHint(text) || text.slice(0, 40)
    const result = await run('get_institution_details', { name })
    if (result.error) {
      content =
        'Nuk gjeta atë institucion. Shkruaj emrin më qartë ose kërko te /institutions.'
    } else {
      const services = (result.services || [])
        .map((s) => `• ${s.name}${s.estimatedTime ? ` (~${s.estimatedTime} min)` : ''}`)
        .join('\n')
      content =
        `**${result.name}** (${typeSq(result.type)})\n` +
        `• Adresa: ${result.location?.address || '—'}, ${result.location?.city || ''}\n` +
        `• Orari: ${result.workingHours?.open || '?'} – ${result.workingHours?.close || '?'}\n` +
        `• Telefon: ${result.contact?.phone || '—'}\n` +
        (services ? `\nShërbimet:\n${services}\n` : '') +
        `\nHap radhën: ${result.deepLink}`
    }
  }
  // Përshëndetje / default
  else if (/^(pershendetje|përshëndetje|hello|hi|hey|tung|mir[eë]dita|si je)/.test(text)) {
    content =
      `Përshëndetje! Unë jam **Asistenti SmartQueue**.\n\n` +
      `Mund të të ndihmoj me:\n` +
      `• Kërkimin e institucioneve\n` +
      `• Statusin e radhës live\n` +
      `• Si merret numri digjital / terminet\n` +
      `• Ticket-et e tua (nëse je i kyçur)\n\n` +
      `Provo p.sh.: “Cilat institucione ka në Prishtinë?”`
  } else {
    // Fallback: kërko institucione + udhëzues i shkurtër
    const [search, guide] = await Promise.all([
      run('search_institutions', { query: text.slice(0, 50), limit: 4 }),
      run('get_platform_guide', { topic: 'overview' }),
    ])
    content =
      `Ja çfarë mund të bëj për ty:\n\n${guide.guide}\n\n` +
      (search.institutions?.length
        ? `Disa institucione të lidhura:\n${formatInstitutions(search.institutions)}\n\n`
        : '') +
      `Pyet më konkretisht, p.sh. “Si rezervoj termin?” ose “Sa është pritja në spital?”.`
  }

  // Stream artificial për UX të njëjtë
  onEvent?.({ type: 'delta', content })
  onEvent?.({
    type: 'done',
    content,
    toolsUsed,
    model: 'smartqueue-local-sq',
  })

  return { content, toolsUsed, model: 'smartqueue-local-sq' }
}

function formatInstitutions(list) {
  return list
    .map(
      (i) =>
        `• **${i.name}** (${typeSq(i.type)}${i.city ? `, ${i.city}` : ''})\n  ${i.deepLink}`,
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

function statusSq(s) {
  const map = {
    waiting: 'në pritje',
    called: 'u thirr',
    completed: 'përfunduar',
    cancelled: 'anuluar',
  }
  return map[s] || s
}

function typeSq(t) {
  const map = {
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
  }
  return map[t] || t
}
