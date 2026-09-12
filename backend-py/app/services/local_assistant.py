from __future__ import annotations

import re

from app.services.chat_tools import execute_chat_tool

COPY = {
    "sq": {
        "loginTickets": "Për të parë ticket-et e tua, duhet të **kyçesh**.\n\nShko te /login ose /register.",
        "noTickets": "Nuk ke ticket aktiv. Merr numër te /institutions ose rezervo te /appointments.",
        "ticketsTitle": lambda n: f"Ja ticket-et e tua ({n}):",
        "dashboard": "Paneli yt: /dashboard/citizen",
        "useful": "Lidhje: /institutions · /appointments · /login",
        "openAppointments": "Hape: /appointments",
        "noExact": "Nuk gjeta status të saktë, por ja disa institucione:\n\n",
        "askWait": "\n\nHap njërin dhe pyet: “Sa është pritja te [emri]?”",
        "noInst": "Nuk gjeta institucion me atë emër. Provo /institutions.",
        "waiting": "Në pritje",
        "eta": "Koha e përafërt",
        "called": "Duke u thirrur",
        "minutes": "minuta",
        "people": "persona",
        "openQueue": "Hap radhën",
        "noBest": "Nuk gjeta institucionin. Shkruaj emrin ose shiko /institutions.",
        "loadLow": "e ulët",
        "loadMed": "mesatare",
        "loadHigh": "e lartë",
        "forInst": lambda name, load, n: f"Për **{name}** (ngarkesa tani: **{load}**, {n} në pritje):",
        "noFilter": "Nuk gjeta institucione me këtë filtër. Hap /institutions.",
        "found": lambda n: f"Gjeta **{n}** institucione:\n\n",
        "clickLink": "\n\nKliko lidhjen për të marrë numër digjital.",
        "noDetail": "Nuk gjeta atë institucion. Shkruaj emrin më qartë.",
        "address": "Adresa",
        "hours": "Orari",
        "phone": "Telefon",
        "services": "Shërbimet",
        "hello": "Përshëndetje! Unë jam **Asistenti SmartQueue**.\n\nMund të të ndihmoj me institucione, radhën live, numrin digjital dhe terminet.\n\nProvo: “Cilat institucione ka në Prishtinë?”",
        "fallbackStart": "Ja çfarë mund të bëj për ty:\n\n",
        "related": "Disa institucione të lidhura:\n",
        "askMore": "Pyet më konkretisht, p.sh. “Si rezervoj termin?”",
    },
    "en": {
        "loginTickets": "To see your tickets, please **log in**.\n\nGo to /login or /register.",
        "noTickets": "You have no active ticket. Take a number from /institutions or book at /appointments.",
        "ticketsTitle": lambda n: f"Your tickets ({n}):",
        "dashboard": "Your dashboard: /dashboard/citizen",
        "useful": "Links: /institutions · /appointments · /login",
        "openAppointments": "Open: /appointments",
        "noExact": "I could not find an exact status, but here are some institutions:\n\n",
        "askWait": "\n\nOpen one and ask: “How long is the wait at [name]?”",
        "noInst": "I could not find that institution. Try /institutions.",
        "waiting": "Waiting",
        "eta": "Estimated time",
        "called": "Now being called",
        "minutes": "minutes",
        "people": "people",
        "openQueue": "Open the queue",
        "noBest": "I could not find that institution.",
        "loadLow": "low",
        "loadMed": "medium",
        "loadHigh": "high",
        "forInst": lambda name, load, n: f"For **{name}** (current load: **{load}**, {n} waiting):",
        "noFilter": "No institutions matched that filter.",
        "found": lambda n: f"Found **{n}** institutions:\n\n",
        "clickLink": "\n\nOpen a link to take a digital number.",
        "noDetail": "I could not find that institution.",
        "address": "Address",
        "hours": "Hours",
        "phone": "Phone",
        "services": "Services",
        "hello": "Hello! I am the **SmartQueue Assistant**.\n\nI can help with institutions, live queue, digital numbers and appointments.\n\nTry: “Which institutions are in Prishtina?”",
        "fallbackStart": "Here is what I can do for you:\n\n",
        "related": "Related institutions:\n",
        "askMore": "Ask more specifically, e.g. “How do I book an appointment?”",
    },
    "sr": {
        "loginTickets": "Da vidiš tikete, moraš da se **prijaviš**.\n\nIdi na /login ili /register.",
        "noTickets": "Trenutno nemaš aktivan tiket. Uzmi broj na /institutions ili rezerviši na /appointments.",
        "ticketsTitle": lambda n: f"Tvoji tiketi ({n}):",
        "dashboard": "Tvoj panel: /dashboard/citizen",
        "useful": "Linkovi: /institutions · /appointments · /login",
        "openAppointments": "Otvori: /appointments",
        "noExact": "Nisam našao tačan status, ali evo nekih institucija:\n\n",
        "askWait": "\n\nOtvori jednu i pitaj: „Koliko se čeka kod [ime]?“",
        "noInst": "Nisam našao tu instituciju. Probaj /institutions.",
        "waiting": "Na čekanju",
        "eta": "Procenjeno vreme",
        "called": "Trenutno se poziva",
        "minutes": "minuta",
        "people": "osoba",
        "openQueue": "Otvori red",
        "noBest": "Nisam našao instituciju.",
        "loadLow": "nizak",
        "loadMed": "srednji",
        "loadHigh": "visok",
        "forInst": lambda name, load, n: f"Za **{name}** (opterećenje sada: **{load}**, {n} na čekanju):",
        "noFilter": "Nema institucija za taj filter.",
        "found": lambda n: f"Našao sam **{n}** institucija:\n\n",
        "clickLink": "\n\nOtvori link da uzmeš digitalni broj.",
        "noDetail": "Nisam našao tu instituciju.",
        "address": "Adresa",
        "hours": "Radno vreme",
        "phone": "Telefon",
        "services": "Usluge",
        "hello": "Zdravo! Ja sam **SmartQueue asistent**.\n\nMogu da pomognem sa institucijama, redom uživo i terminima.\n\nProbaj: „Koje institucije ima u Prištini?“",
        "fallbackStart": "Evo šta mogu da uradim za tebe:\n\n",
        "related": "Povezane institucije:\n",
        "askMore": "Pitaj konkretnije, npr. „Kako da rezervišem termin?“",
    },
}


def _type_label(t, lang):
    maps = {
        "sq": {"municipality": "Komunë", "hospital": "Spital", "bank": "Bankë", "university": "Universitet", "post": "Postë", "ministry": "Ministri", "utility": "Shërbim publik", "court": "Gjykatë", "embassy": "Ambasadë", "other": "Tjetër"},
        "en": {"municipality": "Municipality", "hospital": "Hospital", "bank": "Bank", "university": "University", "post": "Post", "ministry": "Ministry", "utility": "Public utility", "court": "Court", "embassy": "Embassy", "other": "Other"},
        "sr": {"municipality": "Opština", "hospital": "Bolnica", "bank": "Banka", "university": "Univerzitet", "post": "Pošta", "ministry": "Ministarstvo", "utility": "Javna usluga", "court": "Sud", "embassy": "Ambasada", "other": "Ostalo"},
    }
    return (maps.get(lang) or maps["sq"]).get(t, t or "")


def _status_label(s, lang):
    maps = {
        "sq": {"waiting": "në pritje", "called": "u thirr", "completed": "përfunduar", "cancelled": "anuluar"},
        "en": {"waiting": "waiting", "called": "called", "completed": "completed", "cancelled": "cancelled"},
        "sr": {"waiting": "na čekanju", "called": "pozvan", "completed": "završeno", "cancelled": "otkazano"},
    }
    return (maps.get(lang) or maps["sq"]).get(s, s)


def _format_institutions(rows, lang):
    return "\n".join(
        f"• **{i.get('name')}** ({_type_label(i.get('type'), lang)}{', ' + i['city'] if i.get('city') else ''})\n  {i.get('deepLink')}"
        for i in rows
    )


def _detect_type(text: str):
    if re.search(r"spital|sh[eë]ndet|qmf|bolnic", text):
        return "hospital"
    if re.search(r"komun|opštin", text):
        return "municipality"
    if re.search(r"bank", text):
        return "bank"
    if re.search(r"universitet", text):
        return "university"
    if re.search(r"posta|pošt", text):
        return "post"
    if re.search(r"ministri", text):
        return "ministry"
    if re.search(r"gjykat", text):
        return "court"
    return None


def _hint(text: str):
    for p in (
        r"(?:te|n[eë]|p[eë]r)\s+([a-zçë\s]{3,40})",
        r"(spital[i]?[^\s,]*)",
        r"(komun[aë][^\s,]*)",
        r"(bank[aë][^\s,]*)",
        r"(posta)",
        r"(atk)",
        r"(universitet[i]?[^\s,]*)",
    ):
        m = re.search(p, text, re.I)
        if m and m.group(1):
            return m.group(1).strip()
    return None


async def chat_locally(messages, language="sq", user=None, on_event=None):
    last = next((m for m in reversed(messages) if m.get("role") == "user"), {})
    text = str(last.get("content") or "").lower().strip()
    lang = language if language in COPY else "sq"
    c = COPY[lang]
    ctx = {"user": user, "language": lang}
    tools_used = []

    async def run(tool, args=None):
        args = args or {}
        if on_event:
            on_event({"type": "tool_start", "tool": tool, "args": args})
        result = await execute_chat_tool(tool, args, ctx)
        tools_used.append(tool)
        if on_event:
            on_event({"type": "tool_end", "tool": tool, "ok": not result.get("error")})
        return result

    content = ""
    if re.search(r"ticket|tiket|radha ime|numri im|statusi im|my tickets|moje tikete", text):
        result = await run("get_my_tickets", {"status": "all"})
        if result.get("error") == "not_authenticated":
            content = c["loginTickets"]
        elif not result.get("tickets"):
            content = c["noTickets"]
        else:
            lines = [
                f"• **{t.get('number')}** — {t.get('institution') or '—'} ({_status_label(t.get('status'), lang)})\n  {t.get('deepLink')}"
                for t in result["tickets"]
            ]
            content = f"{c['ticketsTitle'](result['count'])}\n\n" + "\n".join(lines) + f"\n\n{c['dashboard']}"
    elif re.search(r"si (e )?marr|num[eë]r digjital|si funksionon|udh[eë]zues|how (do i|to) get|digital number|kako da uzmem", text):
        topic = "book_appointment" if re.search(r"termin|rezerv", text) else "priority" if "prioritet" in text else "qr_checkin" if "qr" in text else "get_ticket"
        guide = await run("get_platform_guide", {"topic": topic})
        content = f"{guide.get('guide')}\n\n{c['useful']}"
    elif re.search(r"prioritet|priority", text):
        guide = await run("get_platform_guide", {"topic": "priority"})
        content = guide.get("guide")
    elif re.search(r"termin|rezerv|appointment|book", text):
        guide = await run("get_platform_guide", {"topic": "book_appointment"})
        content = f"{guide.get('guide')}\n\n{c['openAppointments']}"
    elif re.search(r"sa (është|eshte) prit|pritja|radha|queue|how long|wait|čekanj|koliko se", text):
        name = _hint(text) or "spital"
        result = await run("get_queue_status", {"name": name})
        if result.get("error"):
            search = await run("search_institutions", {"query": name, "limit": 5})
            content = (c["noExact"] + _format_institutions(search.get("institutions") or [], lang) + c["askWait"]) if search.get("institutions") else c["noInst"]
        else:
            inst = result.get("institution") or {}
            called = ", ".join(row.get("number") or "" for row in (result.get("currentlyCalled") or []))
            content = f"**{inst.get('name')}**\n• {c['waiting']}: **{result.get('waitingCount')}** {c['people']}\n• {c['eta']}: **~{result.get('estimatedWaitMinutes')} {c['minutes']}**\n" + (f"• {c['called']}: {called}\n" if called else "") + f"\n{result.get('tip') or ''}\n\n{c['openQueue']}: {result.get('deepLink')}"
    elif re.search(r"institucion|institucij|cilat|prishtin|prizren|pej|gjakov|mitrovic|ferizaj|gjilan|bank|spital|bolnic|komun|posta|universitet|atk", text):
        city_m = re.search(r"(prishtin[eë]?|prizren|pej[eë]|gjakov[eë]?|mitrovic[eë]?|ferizaj|gjilan[eë]?)", text, re.I)
        result = await run("search_institutions", {"query": text[:60], "city": city_m.group(1) if city_m else None, "type": _detect_type(text), "limit": 8})
        content = c["noFilter"] if not result.get("institutions") else c["found"](result["count"]) + _format_institutions(result["institutions"], lang) + c["clickLink"]
    elif re.search(r"orar|telefon|kontakt|sh[eë]rbim|adres", text):
        result = await run("get_institution_details", {"name": _hint(text) or text[:40]})
        if result.get("error"):
            content = c["noDetail"]
        else:
            services = "\n".join(f"• {s.get('name')}" for s in (result.get("services") or [])[:8])
            loc = result.get("location") or {}
            hours = result.get("workingHours") or {}
            contact = result.get("contact") or {}
            content = f"**{result.get('name')}** ({_type_label(result.get('type'), lang)})\n• {c['address']}: {loc.get('address') or '—'}, {loc.get('city') or ''}\n• {c['hours']}: {hours.get('open') or '?'} – {hours.get('close') or '?'}\n• {c['phone']}: {contact.get('phone') or '—'}\n" + (f"\n{c['services']}:\n{services}\n" if services else "") + f"\n{c['openQueue']}: {result.get('deepLink')}"
    elif re.search(r"^(pershendetje|përshëndetje|hello|hi|hey|tung|zdravo|mir[eë]dita)", text):
        content = c["hello"]
    else:
        search, guide = await run("search_institutions", {"query": text[:50], "limit": 4}), await run("get_platform_guide", {"topic": "overview"})
        content = f"{c['fallbackStart']}{guide.get('guide')}\n\n" + (f"{c['related']}{_format_institutions(search.get('institutions') or [], lang)}\n\n" if search.get("institutions") else "") + c["askMore"]

    if on_event:
        on_event({"type": "delta", "content": content})
        on_event({"type": "done", "content": content, "toolsUsed": tools_used, "model": f"smartqueue-local-{lang}"})
    return {"content": content, "toolsUsed": tools_used, "model": f"smartqueue-local-{lang}"}
