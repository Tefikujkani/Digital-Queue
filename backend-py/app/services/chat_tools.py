from __future__ import annotations

from datetime import datetime

from app.db import col
from app.serialize import oid, to_json
from app.services.voice import build_service_guide

GUIDES = {
    "overview": {
        "sq": "SmartQueue Kosova është platformë digjitale për radhë dhe termine.\n1) Regjistrohu / hyr si qytetar\n2) Zgjidh institucionin nga Institucionet\n3) Merr numër digjital ose rezervo termin\n4) Ndiq statusin live dhe QR-në në telefon\n5) Merr njoftime kur afrohet radha",
        "en": "SmartQueue Kosova is a digital queue & appointment platform.\n1) Register / log in as a citizen\n2) Pick an institution\n3) Take a digital ticket or book an appointment\n4) Track live status + QR on your phone\n5) Get notified when your turn approaches",
        "sr": "SmartQueue Kosova je digitalna platforma za redove i termine.\n1) Registruj se / prijavi se kao građanin\n2) Izaberi instituciju\n3) Uzmi digitalni broj ili rezerviši termin\n4) Prati status uživo i QR na telefonu\n5) Dobij obaveštenje kad se približi tvoj red",
    },
    "get_ticket": {
        "sq": "Si merret numri digjital:\n1) Shko te Institucionet dhe hap institucionin\n2) Zgjidh shërbimin\n3) Zgjidh prioritetin\n4) Shtyp Merr Numër\n5) Ruaj QR-në dhe ndiq radhën live",
        "en": "How to get a digital ticket:\n1) Open Institutions and select one\n2) Choose a service\n3) Choose priority if needed\n4) Tap Get Ticket\n5) Save the QR and watch live status",
        "sr": "Kako da uzmeš digitalni broj:\n1) Otvori Institucije i izaberi jednu\n2) Izaberi uslugu\n3) Izaberi prioritet\n4) Pritisni Uzmi broj\n5) Sačuvaj QR i prati status uživo",
    },
    "book_appointment": {
        "sq": "Si rezervohen terminet:\n1) Hyr në llogari\n2) Shko te Terminet\n3) Zgjidh institucionin, shërbimin, datën dhe orën\n4) Konfirmo rezervimin",
        "en": "How to book an appointment:\n1) Log in\n2) Open Appointments\n3) Pick institution, service, date and time\n4) Confirm",
        "sr": "Kako da rezervišeš termin:\n1) Prijavi se\n2) Otvori Termine\n3) Izaberi instituciju, uslugu, datum i vreme\n4) Potvrdi",
    },
    "priority": {
        "sq": "Prioritetet: normal, të moshuar, emergjencë, aftësi të kufizuara.",
        "en": "Priorities: normal, elderly, emergency, disability.",
        "sr": "Prioriteti: normalan, stariji, hitan slučaj, osobe sa invaliditetom.",
    },
    "qr_checkin": {
        "sq": "Pas marrjes së numrit shfaqet QR. Mbaje në telefon dhe paraqite te sporteli kur thirret numri yt.",
        "en": "After issuing a ticket you get a QR code. Keep it on your phone and show it at the counter when called.",
        "sr": "Posle uzimanja broja dobijaš QR. Drži ga na telefonu i pokaži na šalteru kad te pozovu.",
    },
    "notifications": {
        "sq": "Njoftimet vijnë në aplikacion, dhe kur janë të konfiguruara edhe email/SMS/WhatsApp.",
        "en": "Notifications appear in-app. Email/SMS/WhatsApp are sent when configured.",
        "sr": "Obaveštenja stižu u aplikaciji, a ako su podešeni i email/SMS/WhatsApp.",
    },
    "cancel_ticket": {
        "sq": "Anulo ticket-in nga Paneli i Qytetarit përderisa statusi është waiting.",
        "en": "Cancel from Citizen Dashboard while status is waiting.",
        "sr": "Otkaži tiket sa panela građanina dok je status waiting.",
    },
    "register_login": {
        "sq": "Regjistrohu me emër, email, telefon dhe fjalëkalim si Qytetar. Pastaj Hyrja me email/fjalëkalim.",
        "en": "Register as Citizen with name, email, phone and password. Then log in.",
        "sr": "Registruj se kao građanin imenom, emailom, telefonom i lozinkom. Zatim se prijavi.",
    },
}

GROK_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_institutions",
            "description": "Search active institutions by name, city, or type.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "type": {"type": "string"},
                    "city": {"type": "string"},
                    "limit": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_institution_details",
            "description": "Get full details for one institution.",
            "parameters": {"type": "object", "properties": {"institutionId": {"type": "string"}, "name": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_queue_status",
            "description": "Live queue stats for an institution.",
            "parameters": {"type": "object", "properties": {"institutionId": {"type": "string"}, "name": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_tickets",
            "description": "Get logged-in citizen tickets.",
            "parameters": {"type": "object", "properties": {"status": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_platform_guide",
            "description": "How-to guides for SmartQueue.",
            "parameters": {"type": "object", "properties": {"topic": {"type": "string"}}, "required": ["topic"]},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_best_time",
            "description": "Suggest quieter visit windows.",
            "parameters": {"type": "object", "properties": {"institutionId": {"type": "string"}, "name": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_service_guide",
            "description": "Civic briefing: documents, hours, wait.",
            "parameters": {
                "type": "object",
                "properties": {
                    "institutionId": {"type": "string"},
                    "serviceId": {"type": "string"},
                    "name": {"type": "string"},
                    "serviceName": {"type": "string"},
                },
            },
        },
    },
]


async def find_institution(args: dict):
    if args.get("institutionId") and oid(args["institutionId"]):
        found = await col.institutions.find_one({"_id": oid(args["institutionId"])})
        if found:
            return found
    if args.get("name"):
        return await col.institutions.find_one(
            {"isActive": True, "name": {"$regex": str(args["name"]).strip(), "$options": "i"}}
        )
    return None


async def execute_chat_tool(name: str, args: dict | None = None, context: dict | None = None) -> dict:
    args = args or {}
    context = context or {}
    user = context.get("user")
    lang = context.get("language") if context.get("language") in {"sq", "en", "sr"} else "sq"
    try:
        if name == "search_institutions":
            filt: dict = {"isActive": True}
            if args.get("type"):
                filt["type"] = args["type"]
            if args.get("city"):
                filt["location.city"] = {"$regex": args["city"], "$options": "i"}
            if args.get("query"):
                filt["$or"] = [
                    {"name": {"$regex": args["query"], "$options": "i"}},
                    {"location.city": {"$regex": args["query"], "$options": "i"}},
                    {"location.address": {"$regex": args["query"], "$options": "i"}},
                ]
            limit = min(int(args.get("limit") or 8), 15)
            rows = await col.institutions.find(filt, {"name": 1, "type": 1, "location": 1, "services": 1, "workingHours": 1, "contact": 1}).to_list(limit)
            return {
                "count": len(rows),
                "institutions": [
                    {
                        "id": str(i["_id"]),
                        "name": i.get("name"),
                        "type": i.get("type"),
                        "city": (i.get("location") or {}).get("city"),
                        "address": (i.get("location") or {}).get("address"),
                        "services": [s.get("name") for s in (i.get("services") or [])],
                        "hours": i.get("workingHours"),
                        "phone": (i.get("contact") or {}).get("phone"),
                        "deepLink": f"/queue/{i['_id']}",
                    }
                    for i in rows
                ],
            }
        if name == "get_institution_details":
            inst = await find_institution(args)
            if not inst:
                return {"error": "Institution not found"}
            return {
                "id": str(inst["_id"]),
                "name": inst.get("name"),
                "type": inst.get("type"),
                "location": to_json(inst.get("location")),
                "contact": inst.get("contact"),
                "workingHours": inst.get("workingHours"),
                "services": to_json(inst.get("services")),
                "deepLink": f"/queue/{inst['_id']}",
                "appointmentsLink": "/appointments",
            }
        if name == "get_queue_status":
            inst = await find_institution(args)
            if not inst:
                return {"error": "Institution not found"}
            waiting = await col.tickets.count_documents({"institutionId": inst["_id"], "status": "waiting"})
            called = await col.tickets.find({"institutionId": inst["_id"], "status": "called"}, {"number": 1, "counterId": 1}).to_list(5)
            services = inst.get("services") or []
            avg = (sum(s.get("estimatedTime") or 5 for s in services) / max(len(services), 1)) if services else 5
            return {
                "institution": {"id": str(inst["_id"]), "name": inst.get("name")},
                "waitingCount": waiting,
                "estimatedWaitMinutes": round(waiting * avg),
                "currentlyCalled": [{"number": t.get("number"), "counter": t.get("counterId")} for t in called],
                "deepLink": f"/queue/{inst['_id']}",
                "tip": "Queue is quiet right now — good time to visit." if waiting == 0 and lang == "en" else "Radha është e qetë tani — kohë e mirë për vizitë." if waiting == 0 else "Nëse pritja është e gjatë, konsidero rezervimin e një termini.",
            }
        if name == "get_my_tickets":
            if not user or not user.get("_id"):
                return {"error": "not_authenticated", "loginLink": "/login"}
            status = args.get("status")
            filt: dict = {"userId": user["_id"]}
            if status and status != "all":
                filt["status"] = {"$in": ["waiting", "called"]} if status == "waiting" else status
            tickets = await col.tickets.find(filt).sort("createdAt", -1).to_list(10)
            out = []
            for t in tickets:
                inst = await col.institutions.find_one({"_id": oid(t.get("institutionId"))}, {"name": 1})
                out.append({
                    "id": str(t["_id"]),
                    "number": t.get("number"),
                    "status": t.get("status"),
                    "priority": t.get("priority"),
                    "estimatedWaitTime": t.get("estimatedWaitTime"),
                    "scheduledAt": t.get("scheduledAt").isoformat() if isinstance(t.get("scheduledAt"), datetime) else t.get("scheduledAt"),
                    "institution": (inst or {}).get("name"),
                    "institutionId": str((inst or {}).get("_id") or t.get("institutionId") or ""),
                    "deepLink": f"/queue/{t.get('institutionId')}" if t.get("institutionId") else "/dashboard/citizen",
                })
            return {"count": len(out), "tickets": out, "dashboardLink": "/dashboard/citizen"}
        if name == "get_platform_guide":
            topic = args.get("topic") or "overview"
            guide = GUIDES.get(topic) or GUIDES["overview"]
            return {
                "topic": topic,
                "guide": guide.get(lang) or guide["sq"],
                "links": {"institutions": "/institutions", "appointments": "/appointments", "register": "/register", "login": "/login", "dashboard": "/dashboard/citizen"},
            }
        if name == "get_service_guide":
            return await build_service_guide(
                institution_id=args.get("institutionId"),
                service_id=args.get("serviceId"),
                service_name=args.get("serviceName"),
                name=args.get("name"),
                transcript=args.get("name") or args.get("serviceName") or "",
                language=lang,
            )
        if name == "suggest_best_time":
            inst = await find_institution(args)
            if not inst:
                return {"error": "Institution not found"}
            waiting = await col.tickets.count_documents({"institutionId": inst["_id"], "status": "waiting"})
            copy = {
                "sq": [
                    {"window": "08:00–09:30", "note": "Hapja e mëngjesit — shpesh më e qetë"},
                    {"window": "14:00–15:30", "note": "Pas dite — zakonisht më pak njerëz"},
                    {"window": "Terminet", "note": "Rezervo orar të saktë nga faqja Terminet"},
                ],
                "en": [
                    {"window": "08:00–09:30", "note": "Morning opening — often quieter"},
                    {"window": "14:00–15:30", "note": "Afternoon — usually fewer people"},
                    {"window": "Appointments", "note": "Book an exact slot from Appointments"},
                ],
                "sr": [
                    {"window": "08:00–09:30", "note": "Jutarnje otvaranje — često mirnije"},
                    {"window": "14:00–15:30", "note": "Popodne — obično manje ljudi"},
                    {"window": "Termini", "note": "Rezerviši tačno vreme na stranici Termini"},
                ],
            }
            return {
                "institution": inst.get("name"),
                "currentWaiting": waiting,
                "currentHour": datetime.now().hour,
                "load": "low" if waiting <= 3 else "medium" if waiting <= 10 else "high",
                "suggestions": copy.get(lang) or copy["sq"],
                "deepLink": f"/queue/{inst['_id']}",
                "appointmentsLink": "/appointments",
            }
        return {"error": f"Unknown tool: {name}"}
    except Exception as err:
        return {"error": str(err)}
