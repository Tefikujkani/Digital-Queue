import Institution from '../models/Institution.js'
import Ticket from '../models/Ticket.js'

export const GROK_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_institutions',
      description:
        'Search active institutions on SmartQueue by name, city, or type (municipality, hospital, bank, university, post, ministry, utility, court, embassy, other).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Free-text search for institution name or city',
          },
          type: {
            type: 'string',
            enum: [
              'municipality',
              'hospital',
              'bank',
              'university',
              'post',
              'ministry',
              'utility',
              'court',
              'embassy',
              'other',
            ],
            description: 'Filter by institution type',
          },
          city: {
            type: 'string',
            description: 'City name filter, e.g. Prishtinë, Prizren, Pejë',
          },
          limit: {
            type: 'integer',
            description: 'Max results (default 8)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_institution_details',
      description:
        'Get full details for one institution: services, working hours, contact, address.',
      parameters: {
        type: 'object',
        properties: {
          institutionId: {
            type: 'string',
            description: 'MongoDB institution id',
          },
          name: {
            type: 'string',
            description: 'Institution name if id is unknown',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_queue_status',
      description:
        'Live queue stats for an institution: waiting count, estimated wait, currently called tickets.',
      parameters: {
        type: 'object',
        properties: {
          institutionId: { type: 'string' },
          name: { type: 'string', description: 'Institution name fallback' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_tickets',
      description:
        'Get the logged-in citizen active and recent tickets. Only works when the user is authenticated.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['waiting', 'called', 'completed', 'cancelled', 'all'],
            description: 'Filter by ticket status (default: active waiting+called)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_guide',
      description:
        'Return step-by-step how-to guides for using SmartQueue (tickets, appointments, priority, QR, notifications).',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: [
              'get_ticket',
              'book_appointment',
              'priority',
              'qr_checkin',
              'notifications',
              'cancel_ticket',
              'register_login',
              'overview',
            ],
          },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_best_time',
      description:
        'Suggest quieter visit windows based on current queue load for an institution.',
      parameters: {
        type: 'object',
        properties: {
          institutionId: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  },
]

const GUIDES = {
  overview: {
    sq: `SmartQueue Kosova është platformë digjitale për radhë dhe termine.
1) Regjistrohu / hyr si qytetar
2) Zgjidh institucionin nga Institucionet
3) Merr numër digjital ose rezervo termin
4) Ndiq statusin live dhe QR-në në telefon
5) Merr njoftime kur afrohet radha`,
    en: `SmartQueue Kosova is a digital queue & appointment platform.
1) Register / log in as a citizen
2) Pick an institution
3) Take a digital ticket or book an appointment
4) Track live status + QR on your phone
5) Get notified when your turn approaches`,
  },
  get_ticket: {
    sq: `Si merret numri digjital:
1) Shko te Institucionet dhe hap institucionin
2) Zgjidh shërbimin
3) Zgjidh prioritetin (normal, të moshuar, emergjencë, aftësi të kufizuara)
4) Shtyp "Merr Numër" (duhet të jesh i kyçur)
5) Ruaj QR-në dhe ndiq radhën live`,
    en: `How to get a digital ticket:
1) Open Institutions and select one
2) Choose a service
3) Choose priority if needed
4) Tap Get Ticket (login required)
5) Save the QR and watch live status`,
  },
  book_appointment: {
    sq: `Si rezervohen terminet:
1) Hyr në llogari
2) Shko te Terminet
3) Zgjidh institucionin, shërbimin, datën dhe orën
4) Konfirmo rezervimin
5) Do të shfaqet si ticket me orar të planifikuar`,
    en: `How to book an appointment:
1) Log in
2) Open Appointments
3) Pick institution, service, date and time
4) Confirm
5) It appears as a scheduled ticket`,
  },
  priority: {
    sq: `Prioritetet: normal, të moshuar, emergjencë, aftësi të kufizuara.
Përdor prioritetin e duhur vetëm kur ke të drejtë — sistemi e ndihmon radhën të jetë më e drejtë.`,
    en: `Priorities: normal, elderly, emergency, disability.
Use the correct priority only when eligible so the queue stays fair.`,
  },
  qr_checkin: {
    sq: `Pas marrjes së numrit shfaqet QR. Mbaje në telefon dhe paraqite te sporteli kur thirret numri yt.`,
    en: `After issuing a ticket you get a QR code. Keep it on your phone and show it at the counter when called.`,
  },
  notifications: {
    sq: `Njoftimet vijnë në aplikacion (zile), dhe kur janë të konfiguruara edhe email/SMS kur merret numri ose thirret radha.`,
    en: `Notifications appear in-app (bell). Email/SMS are sent when configured (ticket issued / called).`,
  },
  cancel_ticket: {
    sq: `Anulo ticket-in nga Paneli i Qytetarit ose faqja e radhës me butonin Anulo, përderisa statusi është waiting.`,
    en: `Cancel from Citizen Dashboard or the queue page while status is waiting.`,
  },
  register_login: {
    sq: `Regjistrohu me emër, email, telefon dhe fjalëkalim si Qytetar. Pastaj Hyrja me email/fjalëkalim.`,
    en: `Register as Citizen with name, email, phone and password. Then log in.`,
  },
}

async function findInstitution({ institutionId, name }) {
  if (institutionId) {
    const byId = await Institution.findById(institutionId).lean()
    if (byId) return byId
  }
  if (name) {
    return Institution.findOne({
      isActive: true,
      name: { $regex: name.trim(), $options: 'i' },
    }).lean()
  }
  return null
}

export async function executeChatTool(name, args = {}, context = {}) {
  const { user, language = 'sq' } = context
  const lang = ['sq', 'en', 'sr'].includes(language) ? language : 'sq'

  try {
    switch (name) {
      case 'search_institutions': {
        const filter = { isActive: true }
        if (args.type) filter.type = args.type
        if (args.city) filter['location.city'] = { $regex: args.city, $options: 'i' }
        if (args.query) {
          filter.$or = [
            { name: { $regex: args.query, $options: 'i' } },
            { 'location.city': { $regex: args.query, $options: 'i' } },
            { 'location.address': { $regex: args.query, $options: 'i' } },
          ]
        }
        const limit = Math.min(Number(args.limit) || 8, 15)
        const rows = await Institution.find(filter)
          .select('name type location services workingHours contact')
          .limit(limit)
          .lean()
        return {
          count: rows.length,
          institutions: rows.map((i) => ({
            id: i._id.toString(),
            name: i.name,
            type: i.type,
            city: i.location?.city,
            address: i.location?.address,
            services: (i.services || []).map((s) => s.name),
            hours: i.workingHours,
            phone: i.contact?.phone,
            deepLink: `/queue/${i._id}`,
          })),
        }
      }

      case 'get_institution_details': {
        const inst = await findInstitution(args)
        if (!inst) return { error: 'Institution not found' }
        return {
          id: inst._id.toString(),
          name: inst.name,
          type: inst.type,
          location: inst.location,
          contact: inst.contact,
          workingHours: inst.workingHours,
          services: inst.services,
          deepLink: `/queue/${inst._id}`,
          appointmentsLink: '/appointments',
        }
      }

      case 'get_queue_status': {
        const inst = await findInstitution(args)
        if (!inst) return { error: 'Institution not found' }
        const waiting = await Ticket.countDocuments({
          institutionId: inst._id,
          status: 'waiting',
        })
        const called = await Ticket.find({
          institutionId: inst._id,
          status: 'called',
        })
          .select('number counterId calledAt')
          .limit(5)
          .lean()
        const avgService =
          (inst.services || []).reduce((s, x) => s + (x.estimatedTime || 5), 0) /
            Math.max((inst.services || []).length, 1) || 5
        const estimatedWaitMinutes = Math.round(waiting * avgService)
        return {
          institution: { id: inst._id.toString(), name: inst.name },
          waitingCount: waiting,
          estimatedWaitMinutes,
          currentlyCalled: called.map((t) => ({
            number: t.number,
            counter: t.counterId,
          })),
          deepLink: `/queue/${inst._id}`,
          tip:
            waiting === 0
              ? lang === 'en'
                ? 'Queue is quiet right now — good time to visit.'
                : 'Radha është e qetë tani — kohë e mirë për vizitë.'
              : lang === 'en'
                ? 'Consider booking an appointment if the wait is long.'
                : 'Nëse pritja është e gjatë, konsidero rezervimin e një termini.',
        }
      }

      case 'get_my_tickets': {
        if (!user?._id) {
          return {
            error: 'not_authenticated',
            message:
              lang === 'en'
                ? 'User must log in to see personal tickets.'
                : 'Duhet të kyçeni për të parë ticket-et tuaja.',
            loginLink: '/login',
          }
        }
        const statusFilter =
          !args.status || args.status === 'all'
            ? {}
            : args.status === 'waiting'
              ? { status: { $in: ['waiting', 'called'] } }
              : { status: args.status }

        const tickets = await Ticket.find({ userId: user._id, ...statusFilter })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('institutionId', 'name type location.city')
          .lean()

        return {
          count: tickets.length,
          tickets: tickets.map((t) => ({
            id: t._id.toString(),
            number: t.number,
            status: t.status,
            priority: t.priority,
            estimatedWaitTime: t.estimatedWaitTime,
            scheduledAt: t.scheduledAt,
            institution: t.institutionId?.name,
            institutionId: t.institutionId?._id?.toString(),
            deepLink: t.institutionId?._id
              ? `/queue/${t.institutionId._id}`
              : '/dashboard/citizen',
          })),
          dashboardLink: '/dashboard/citizen',
        }
      }

      case 'get_platform_guide': {
        const topic = args.topic || 'overview'
        const guide = GUIDES[topic] || GUIDES.overview
        return {
          topic,
          guide: guide[lang] || guide.sq || guide.en,
          links: {
            institutions: '/institutions',
            appointments: '/appointments',
            register: '/register',
            login: '/login',
            dashboard: '/dashboard/citizen',
          },
        }
      }

      case 'suggest_best_time': {
        const inst = await findInstitution(args)
        if (!inst) return { error: 'Institution not found' }
        const waiting = await Ticket.countDocuments({
          institutionId: inst._id,
          status: 'waiting',
        })
        const hour = new Date().getHours()
        const suggestions = [
          { window: '08:00–09:30', note: 'Hapja e mëngjesit — shpesh më e qetë' },
          { window: '14:00–15:30', note: 'Pas dite — zakonisht më pak njerëz' },
          { window: 'Terminet', note: 'Rezervo orar të saktë nga faqja Terminet' },
        ]
        return {
          institution: inst.name,
          currentWaiting: waiting,
          currentHour: hour,
          load:
            waiting <= 3 ? 'low' : waiting <= 10 ? 'medium' : 'high',
          suggestions,
          deepLink: `/queue/${inst._id}`,
          appointmentsLink: '/appointments',
        }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    console.error(`Tool ${name} failed:`, err.message)
    return { error: err.message }
  }
}
