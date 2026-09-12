from __future__ import annotations

import re
import unicodedata

from app.db import col
from app.serialize import oid

DOC_CATALOG = [
    {
        "keys": ["leternjoftim", "pasaporte", "dokumente personale", "karte identiteti"],
        "label": "Letërnjoftim & pasaportë",
        "docs": ["Letërnjoftimi aktual ose i skaduar", "Dy fotografi 3.5×4.5", "Numri personal", "Dëshmi e pagesës së taksës"],
    },
    {
        "keys": ["certifikata te lindjes", "certifikate lindjeje", "gjendja civile", "ofiqaria", "martese"],
        "label": "Gjendja civile / certifikata",
        "docs": ["Letërnjoftimi", "Numri personal", "Të dhënat e prindërve / bashkëshortit (nëse kërkohet)"],
    },
    {"keys": ["automjet", "regjistrim", "targa", "pronarit", "veture"], "docs": ["Letërnjoftimi", "Certifikata e regjistrimit", "Certifikata e sigurimit", "Fatura e taksave"]},
    {"keys": ["leje ndertimi", "urbanistik", "ndertim"], "docs": ["Letërnjoftimi", "Plan urbanistik", "Dokumenti i pronësisë", "Projekti i ndërtimit"]},
    {"keys": ["ambulanc", "spital", "konsulte", "mjek"], "docs": ["Letërnjoftimi", "Kartela shëndetësore", "Analizat / receta e mjekut (nëse ka)"]},
    {"keys": ["laborator", "analiza"], "docs": ["Letërnjoftimi", "Kartela shëndetësore", "Udhëzimi i mjekut"]},
    {"keys": ["atk", "tatim", "deklarim"], "docs": ["Letërnjoftimi", "Numri fiskal / personal", "Dokumentet e të ardhurave"]},
    {"keys": ["llogari", "bank", "kredi"], "docs": ["Letërnjoftimi", "Vërtetim adrese", "Vërtetim page (për kredi)"]},
    {"keys": ["poste", "kolete", "pako"], "docs": ["Letërnjoftimi", "Kodi i dërgesës (nëse e keni)"]},
    {"keys": ["bursa", "student", "universitet", "transkript"], "docs": ["Letërnjoftimi", "Indeksi / ID studentore", "Vërtetim i statusit"]},
]
DEFAULT_DOCS = ["Letërnjoftimi", "Numri personal"]
DOC_MAP = {
    "Letërnjoftimi / Pasaporta": {"en": "ID card / Passport", "sr": "Lična karta / Pasoš"},
    "Letërnjoftimi": {"en": "ID card", "sr": "Lična karta"},
    "Letërnjoftimi aktual ose i skaduar": {"en": "Current or expired ID card", "sr": "Važeća ili istekla lična karta"},
    "Pasaporta": {"en": "Passport", "sr": "Pasoš"},
    "Numri personal": {"en": "Personal number", "sr": "Lični broj"},
    "Numri fiskal / personal": {"en": "Fiscal / personal number", "sr": "Fiskalni / lični broj"},
    "Dy fotografi 3.5×4.5": {"en": "Two 3.5×4.5 photos", "sr": "Dve fotografije 3.5×4.5"},
    "Dëshmi e pagesës së taksës": {"en": "Tax payment proof", "sr": "Dokaz o plaćenoj taksi"},
    "Plan urbanistik": {"en": "Urban plan", "sr": "Urbanistički plan"},
    "Dokumenti i pronësisë": {"en": "Ownership document", "sr": "Dokument o vlasništvu"},
    "Projekti i ndërtimit": {"en": "Construction project", "sr": "Projekat izgradnje"},
    "Dokumentet e të ardhurave": {"en": "Income documents", "sr": "Dokumenta o prihodima"},
    "Kodi i dërgesës (nëse e keni)": {"en": "Shipment code (if you have it)", "sr": "Kod pošiljke (ako ga imate)"},
    "Indeksi / ID studentore": {"en": "Student index / ID", "sr": "Indeks / studentska iskaznica"},
    "Vërtetim i statusit": {"en": "Status certificate", "sr": "Potvrda o statusu"},
}


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", str(value or "").lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def norm_lang(raw) -> str:
    lang = str(raw or "").lower()[:2]
    return lang if lang in {"sq", "en", "sr"} else "sq"


def infer_documents(service_name, existing=None):
    if isinstance(existing, list) and existing:
        return existing
    n = normalize(service_name)
    for row in DOC_CATALOG:
        if any(k in n for k in row["keys"]):
            return row["docs"]
    return DEFAULT_DOCS


def translate_doc(name, lang):
    if lang == "sq":
        return name
    return (DOC_MAP.get(name) or {}).get(lang) or name


def parse_intent_kind(text: str) -> str:
    n = normalize(text)
    if re.search(r"dokument|cfare duhet|qka duhet|cka duhet|cka me marr|cfare me marr|lista", n):
        return "documents"
    if re.search(r"kur|orar|ore|pritje|vono|me shku|te shkoj|sa kohe|kur vij", n):
        return "when"
    if re.search(r"termin|rezerv", n):
        return "appointment"
    if re.search(r"numer|bilet|ticket|radhe", n):
        return "ticket"
    return "guide"


def detect_type(text: str):
    n = normalize(text)
    hints = [
        (["certifikat", "leternjoftim", "pasaport", "ofiqar", "gjendje", "civile", "leje ndertim"], "municipality"),
        (["spital", "ambulanc", "laborator", "mjek", "pediatr"], "hospital"),
        (["bank", "kredi", "llogari"], "bank"),
        (["atk", "tatim", "deklarim"], "ministry"),
        (["poste", "kolete"], "post"),
        (["universitet", "student", "bursa"], "university"),
    ]
    for keys, typ in hints:
        if any(k in n for k in keys):
            return typ
    return None


def detect_city(text: str):
    n = normalize(text)
    cities = [
        "prishtine", "prizren", "peje", "gjakove", "mitrovice", "gjilan", "ferizaj",
        "fushe kosove", "podujeve", "vushtrri", "rahovec", "suhareke", "malisheve",
        "lipjan", "drenas", "kline", "istog", "decan", "kacanik", "shtime", "obiliq", "gracanice",
    ]
    return next((c for c in cities if c in n), None)


def score_name(hay, needle) -> int:
    h = normalize(hay)
    n = normalize(needle)
    if not n or len(n) < 3:
        return 0
    if h == n:
        return 100
    if n in h or h in n:
        return 70
    words = [w for w in n.split() if len(w) > 3]
    hay_words = [w for w in h.split() if len(w) > 2]
    score = 0
    for w in words:
        if any(hw.startswith(w[:5]) or w.startswith(hw[:5]) or w in hw or hw in w for hw in hay_words if len(hw) > 2):
            score += 18
    return score


def is_open_now(hours, language="sq"):
    lang = norm_lang(language)
    if not hours or not hours.get("open") or not hours.get("close"):
        return {"open": True, "label": "Hours are incomplete" if lang == "en" else "Radno vreme nije potpuno" if lang == "sr" else "Orari nuk është i plotë"}
    from datetime import datetime
    from zoneinfo import ZoneInfo

    now = datetime.now(ZoneInfo("Europe/Belgrade"))
    if now.weekday() >= 5:
        return {
            "open": False,
            "label": f"Closed on weekends. Opens Monday at {hours['open']}"
            if lang == "en"
            else f"Zatvoreno vikendom. Otvara se u ponedeljak u {hours['open']}"
            if lang == "sr"
            else f"I mbyllur fundjavë. Hapet të hënën në {hours['open']}",
        }
    oh, om = [int(x) for x in hours["open"].split(":")[:2]]
    ch, cm = [int(x) for x in hours["close"].split(":")[:2]]
    mins = now.hour * 60 + now.minute
    open_m, close_m = oh * 60 + om, ch * 60 + cm
    if open_m <= mins < close_m:
        return {
            "open": True,
            "label": f"Open now until {hours['close']}"
            if lang == "en"
            else f"Otvoreno sada, do {hours['close']}"
            if lang == "sr"
            else f"Tash osht hapë, deri në orën {hours['close']}",
        }
    if mins < open_m:
        return {
            "open": False,
            "label": f"Still closed. Opens at {hours['open']}"
            if lang == "en"
            else f"Još zatvoreno. Otvara se u {hours['open']}"
            if lang == "sr"
            else f"Ende osht mbyllë. Hapet në orën {hours['open']}",
        }
    return {
        "open": False,
        "label": f"Closed today. Hours: {hours['open']}–{hours['close']}"
        if lang == "en"
        else f"Danas zatvoreno. Radno vreme: {hours['open']}–{hours['close']}"
        if lang == "sr"
        else f"Sot osht mbyllë. Orari: {hours['open']}–{hours['close']}",
    }


def when_to_go(hours, waiting, estimated_wait, best_hour="08:00–09:30", language="sq"):
    lang = norm_lang(language)
    status = is_open_now(hours, lang)
    load = "quiet" if waiting <= 3 else "medium" if waiting <= 10 else "busy"
    if lang == "sq":
        load = "e qetë" if waiting <= 3 else "mesatare" if waiting <= 10 else "e ngarkuar"
    elif lang == "sr":
        load = "mirno" if waiting <= 3 else "srednje" if waiting <= 10 else "gužva"
    parts = [status["label"]]
    if waiting > 0:
        parts.append(
            f"{waiting} people in line, about {estimated_wait} minutes wait. The queue is {load}."
            if lang == "en"
            else f"U redu je {waiting} osoba, oko {estimated_wait} minuta čekanja. Red je {load}."
            if lang == "sr"
            else f"Në radhë janë {waiting} veta, rreth {estimated_wait} minuta pritje. Radha osht {load}."
        )
    else:
        parts.append(
            "No queue right now — a good time to go."
            if lang == "en"
            else "Trenutno nema reda — dobro je vreme da dođete."
            if lang == "sr"
            else "Tash s’ka radhë — kohë e mirë me u paraqit."
        )
    if best_hour:
        parts.append(
            f"The quietest hour is usually {best_hour}."
            if lang == "en"
            else f"Najmirniji sat je obično {best_hour}."
            if lang == "sr"
            else f"Ora ma e qetë zakonisht osht {best_hour}."
        )
    if not status["open"]:
        parts.append(
            "Better book an appointment, or come during working hours."
            if lang == "en"
            else "Bolje rezervišite termin ili dođite u radno vreme."
            if lang == "sr"
            else "Ma mirë rezervo një termin, ose eja në orarin e punës."
        )
    elif waiting > 10:
        parts.append(
            "The wait is long. An online appointment is recommended."
            if lang == "en"
            else "Čekanje je dugo. Preporučuje se online termin."
            if lang == "sr"
            else "Pritja osht e gjatë. Rekomandohet termin online."
        )
    else:
        parts.append(
            "You can take a number now and go."
            if lang == "en"
            else "Možete sada uzeti broj i krenuti."
            if lang == "sr"
            else "Mundesh me marr numrin tash e me u nis."
        )
    return {"status": status, "load": load, "spoken": " ".join(parts)}


async def resolve_institution(institution_id=None, name=None, transcript="", city=None):
    if institution_id and re.match(r"^[a-f0-9]{24}$", str(institution_id), re.I):
        by_id = await col.institutions.find_one({"_id": oid(institution_id), "isActive": True})
        if by_id:
            return by_id
    rows = await col.institutions.find({"isActive": True}, {"name": 1, "type": 1, "location": 1, "services": 1, "workingHours": 1, "contact": 1}).to_list(120)
    q = normalize(name or transcript or "")
    if not q:
        return rows[0] if rows else None
    best, best_score = None, 0
    for row in rows:
        score = score_name(row.get("name"), q) + score_name((row.get("location") or {}).get("city"), q)
        if city and city in normalize((row.get("location") or {}).get("city")):
            score += 40
        type_hint = detect_type(q)
        if type_hint and row.get("type") == type_hint:
            score += 50
        for svc in row.get("services") or []:
            svc_score = score_name(svc.get("name"), q)
            if svc_score:
                score += svc_score + 10
        if score > best_score:
            best_score, best = score, row
    return best if best_score >= 12 else None


def resolve_service(institution, service_id=None, service_name=None, transcript=""):
    services = (institution or {}).get("services") or []
    if not services:
        return None
    if service_id:
        hit = next((s for s in services if str(s.get("_id")) == str(service_id) or s.get("id") == service_id), None)
        if hit:
            return hit
    q = normalize(service_name or transcript or "")
    best, best_score = services[0], 0
    for svc in services:
        score = score_name(svc.get("name"), q)
        if score > best_score:
            best_score, best = score, svc
    if best_score < 18:
        catalog = next((row for row in DOC_CATALOG if any(k in q for k in row["keys"])), None)
        return {
            "name": service_name or (catalog or {}).get("label") or "Shërbimi i kërkuar",
            "requiredDocuments": (catalog or {}).get("docs"),
            "estimatedTime": services[0].get("estimatedTime") or 15,
        }
    return best


def build_speak(kind, institution, service, documents, when, language):
    lang = norm_lang(language)
    inst = (institution or {}).get("name") or ("the institution" if lang == "en" else "institucija" if lang == "sr" else "institucioni")
    svc = (service or {}).get("name") or ("the service" if lang == "en" else "usluga" if lang == "sr" else "shërbimi")
    docs = ", ".join(documents)
    if lang == "en":
        if kind == "documents":
            return f"For {svc} at {inst}, bring: {docs}."
        if kind == "when":
            return when["spoken"]
        return f"Service {svc} at {inst}. Bring: {docs}. {when['spoken']}"
    if lang == "sr":
        if kind == "documents":
            return f"Za uslugu {svc} kod {inst} ponesite: {docs}."
        if kind == "when":
            return when["spoken"]
        return f"Usluga {svc} kod {inst}. Ponesite: {docs}. {when['spoken']} Recite „uzmi broj“ ili „rezerviši termin“."
    if kind == "documents":
        return f"Për shërbimin {svc} te {inst}, duhet me i pas këto dokumente: {docs}."
    if kind == "when":
        return f"Për {svc} te {inst}. {when['spoken']}"
    return f"Për shërbimin {svc} te {inst}, duhet me i pas këto dokumente: {docs}. {when['spoken']} Nëse don, thuaj “merr numër” ose “rezervo termin”."


async def build_service_guide(institution_id=None, service_id=None, service_name=None, name=None, transcript="", language="sq"):
    lang = norm_lang(language)
    city = detect_city(transcript)
    institution = await resolve_institution(institution_id, name, transcript, city)
    if not institution:
        return {
            "ok": False,
            "intent": "unknown",
            "speak": "I could not find that institution. Try saying the city and service, for example passport in Prishtina."
            if lang == "en"
            else "Nisam našao tu instituciju. Recite grad i uslugu, npr. lična karta u Prištini."
            if lang == "sr"
            else "S’e gjeta këtë institucion. Thuaj qytetin edhe shërbimin, p.sh. leternjoftim n’Prishtinë.",
            "suggestions": ["ID card in Prishtina", "When to go to the hospital"]
            if lang == "en"
            else ["Lična karta u Prištini", "Kada da idem u bolnicu"]
            if lang == "sr"
            else ["Letërnjoftim në Prishtinë", "Kur të shkoj në spital", "Dokumente për certifikatë lindjeje"],
        }
    service = resolve_service(institution, service_id, service_name, transcript)
    documents = [translate_doc(d, lang) for d in infer_documents((service or {}).get("name"), (service or {}).get("requiredDocuments"))]
    waiting = await col.tickets.count_documents({"institutionId": institution["_id"], "status": "waiting"})
    avg = (service or {}).get("estimatedTime") or 12
    estimated = round(waiting * avg)
    when = when_to_go(institution.get("workingHours"), waiting, estimated, language=lang)
    kind = parse_intent_kind(transcript)
    speak = build_speak(kind, institution, service, documents, when, lang)
    return {
        "ok": True,
        "intent": kind,
        "speak": speak,
        "institution": {
            "id": str(institution["_id"]),
            "name": institution.get("name"),
            "city": (institution.get("location") or {}).get("city"),
            "address": (institution.get("location") or {}).get("address"),
            "hours": institution.get("workingHours"),
            "phone": (institution.get("contact") or {}).get("phone"),
            "deepLink": f"/queue/{institution['_id']}",
        },
        "service": {
            "id": str((service or {}).get("_id") or (service or {}).get("id") or ""),
            "name": (service or {}).get("name"),
            "description": (service or {}).get("description"),
            "estimatedTime": (service or {}).get("estimatedTime"),
        }
        if service
        else None,
        "documents": documents,
        "when": {
            "open": when["status"]["open"],
            "label": when["status"]["label"],
            "load": when["load"],
            "waiting": waiting,
            "estimatedWaitMinutes": estimated,
            "bestWindow": "08:00–09:30",
            "spoken": when["spoken"],
        },
        "actions": [
            {"label": "Get a number" if lang == "en" else "Uzmi broj" if lang == "sr" else "Merr numër", "href": f"/queue/{institution['_id']}"},
            {"label": "Book appointment" if lang == "en" else "Rezerviši termin" if lang == "sr" else "Rezervo termin", "href": "/appointments"},
        ],
        "suggestions": [
            f"Documents for {(service or {}).get('name') or 'this service'}" if lang == "en" else f"Dokumenta za {(service or {}).get('name') or 'ovu uslugu'}" if lang == "sr" else f"Dokumente për {(service or {}).get('name') or 'këtë shërbim'}",
            f"When to go to {(institution.get('location') or {}).get('city') or institution.get('name')}"
            if lang == "en"
            else f"Kada da dođem u {(institution.get('location') or {}).get('city') or institution.get('name')}"
            if lang == "sr"
            else f"Kur të shkoj në {(institution.get('location') or {}).get('city') or institution.get('name')}",
            "How long is the wait now" if lang == "en" else "Koliko se sada čeka" if lang == "sr" else "Sa është pritja tani",
        ],
    }


async def handle_voice_intent(transcript, institution_id=None, service_id=None, language="sq"):
    text = str(transcript or "").strip()
    lang = norm_lang(language)
    if not text:
        return {
            "ok": False,
            "speak": "I did not hear you. Try again, e.g. what documents are needed for an ID card."
            if lang == "en"
            else "Nisam vas čuo. Pokušajte ponovo, npr. koja dokumenta treba za ličnu kartu."
            if lang == "sr"
            else "S’të kuptova. Provo prap, p.sh. qka dokumente duhen për leternjoftim.",
        }
    return await build_service_guide(institution_id=institution_id, service_id=service_id, transcript=text, language=lang)
