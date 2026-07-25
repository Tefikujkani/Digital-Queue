import type { Language } from '../types'

/** Extra UI strings — settings, cities, help, legal, auth recovery, command palette */
export const extraTranslations: Record<Language, Record<string, string>> = {
  sq: {
    'nav.settings': 'Cilësimet',
    'nav.cities': 'Qytetet',
    'nav.help': 'Ndihma',
    'footer.cities': 'Qytetet',
    'footer.help': 'Ndihma',
    'a11y.skipContent': 'Kalo te përmbajtja',

    'settings.title': 'Cilësimet',
    'settings.subtitle': 'Njoftime falas me Telegram — kanali kryesor',
    'settings.telegramTitle': 'Telegram (rekomanduar)',
    'settings.free': 'Falas',
    'settings.telegramBody':
      'Kanali më i mirë për SmartQueue: falas, i menjëhershëm, pa kredi SMS. Merr konfirmime termini, kujtesa dhe thirrjen e radhës direkt në Telegram.',
    'settings.linked': 'I lidhur',
    'settings.unlink': 'Shkëput',
    'settings.adminBotHint':
      'Admin: krijo bot te @BotFather → vendos TELEGRAM_BOT_TOKEN në backend/.env → rinis serverin.',
    'settings.linkTelegram': 'Lidhu me Telegram',
    'settings.linkHint': 'Hapët Telegram → shtyp Start → lidhja bëhet automatikisht',
    'settings.preferredCity': 'Qyteti i preferuar',
    'settings.channels': 'Kanalet e njoftimeve',
    'settings.inApp': 'Në aplikacion',
    'settings.inAppHint': 'Zile live',
    'settings.email': 'Email',
    'settings.telegram': 'Telegram',
    'settings.telegramOn': 'Aktiv · i lidhur',
    'settings.telegramOff': 'Lidhe më sipër',
    'settings.smsOptional': 'SMS (opsional)',
    'settings.smsHint': 'Backup nëse ke kredi provider',
    'settings.account': 'Llogaria',
    'settings.changePassword': 'Ndrysho fjalëkalimin',
    'settings.currentPassword': 'Fjalëkalimi aktual',
    'settings.newPassword': 'Fjalëkalimi i ri (min. 8)',
    'settings.savePassword': 'Ruaj fjalëkalimin',
    'settings.deleteAccount': 'Fshi llogarinë',
    'settings.deleteHint': 'Fshin të dhënat personale (LPDP). Terminet aktive anulohen.',
    'settings.confirmPassword': 'Konfirmo me fjalëkalimin',
    'settings.deleteForever': 'Fshi përgjithmonë',
    'settings.save': 'Ruaj cilësimet',
    'settings.saving': 'Duke ruajtur…',
    'settings.saved': 'Cilësimet u ruajtën',
    'settings.saveFailed': 'Ruajtja dështoi',
    'settings.openTelegram': 'Hape Telegram dhe shtyp Start',
    'settings.unlinked': 'Telegram u shkëput',
    'settings.passwordChanged': 'Fjalëkalimi u ndryshua',
    'settings.passwordFailed': 'Ndryshimi dështoi',
    'settings.deleteConfirm': 'Je i sigurt? Llogaria fshihet përgjithmonë.',
    'settings.deleted': 'Llogaria u fshi',
    'settings.deleteFailed': 'Fshirja dështoi',
    'settings.linkFailed': 'Lidhja dështoi',

    'settings.viberTitle': 'Viber (falas)',
    'settings.viberBody':
      'Merr njoftime SmartQueue direkt në Viber — falas, pa kredi SMS. Ideale nëse e përdor Viber çdo ditë.',
    'settings.viberAdminHint':
      'Admin: krijo bot te partners.viber.com → VIBER_AUTH_TOKEN + VIBER_BOT_URI në .env → HTTPS webhook (ngrok).',
    'settings.linkViber': 'Lidhu me Viber',
    'settings.viberLinkHint': 'Hapet Viber → nis bisedën → lidhja bëhet automatikisht',
    'settings.openViber': 'Hape Viber dhe nis bisedën',
    'settings.viberUnlinked': 'Viber u shkëput',
    'settings.viberLinkFailed': 'Lidhja me Viber dështoi',
    'settings.viberWebhookHint':
      'Për lokal: nis ngrok HTTPS dhe vendos VIBER_WEBHOOK_URL, pastaj rinis backend-in.',
    'settings.viber': 'Viber',
    'settings.viberOn': 'Aktiv · i lidhur',
    'settings.viberOff': 'Lidhe më sipër',

    'settings.iosAndroid': 'iOS + Android',
    'settings.waTitle': 'WhatsApp (iOS & Android)',
    'settings.waBody':
      'Njoftime falas në WhatsApp — funksionon në iPhone dhe Android. Ruaj numrin ose hap deep link për lidhje.',
    'settings.waAdminHint':
      'Admin: Meta Developers → WhatsApp → WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (+ numri i biznesit) në .env.',
    'settings.linkWhatsApp': 'Hap WhatsApp (lidhje)',
    'settings.waLinkHint':
      'Ruaj numrin (më e shpejtë) ose hap WhatsApp dhe dërgo kodin. Funksionon iOS + Android.',
    'settings.waPhonePlaceholder': '38344XXXXXX',
    'settings.waSavePhone': 'Ruaj',
    'settings.openWhatsApp': 'Hape WhatsApp dhe dërgo mesazhin',
    'settings.waSaved': 'Numri WhatsApp u ruajt',
    'settings.waUnlinked': 'WhatsApp u shkëput',
    'settings.waLinkFailed': 'Lidhja me WhatsApp dështoi',
    'settings.whatsapp': 'WhatsApp',
    'settings.waOn': 'Aktiv · i lidhur',
    'settings.waOff': 'Lidhe më sipër',

    'settings.freeSmsTitle': 'SMS falas (TextBee / Textbelt)',
    'settings.freeSmsBody':
      'SMS reale: TextBee dërgon nga një telefon Android (marrësit mund të jenë iOS ose Android). Textbelt ~1 SMS/ditë për test — çdo telefon.',
    'settings.textbeeSetup':
      'Setup TextBee: textbee.dev → app Android → API key + Device ID → TEXTBEE_API_KEY dhe TEXTBEE_DEVICE_ID në backend/.env → rinis serverin.',

    'cities.eyebrow': 'Republika e Kosovës',
    'cities.title': 'Qytetet & Komunat',
    'cities.subtitle': 'Zgjidh qytetin tënd dhe gjej institucione publike e private me radhë digjitale —',
    'cities.activeInstitutions': 'institucione aktive',
    'cities.publicServices': 'Shërbime publike',
    'cities.viewInstitutions': 'Shiko institucionet',
    'cities.loading': 'Duke ngarkuar…',
    'cities.empty': 'Nuk u gjetën qytete',

    'help.title': 'Ndihma & FAQ',
    'help.subtitle': 'Udhëzues i shkurtër për qytetarët e Kosovës',
    'help.getNumber': 'Merr numër',
    'help.appointments': 'Termine',
    'help.cities': 'Qytetet',
    'help.q1': 'Si e marr një numër digjital?',
    'help.a1':
      'Shko te Institucionet → zgjidh institucionin → zgjidh shërbimin → konfirmo dokumentet → Merr Numrin Digjital. Duhet të jesh i kyçur.',
    'help.q2': 'Çfarë është prioriteti (të moshuar, emergjencë…)?',
    'help.a2':
      'Përdore vetëm nëse ke të drejtë. Prioriteti ndihmon radhën të jetë më e drejtë për rastet urgjente dhe personat me nevoja të veçanta.',
    'help.q3': 'Si rezervoj termin?',
    'help.a3':
      'Nga Terminet zgjidh institucionin, shërbimin, datën dhe orën. Termini shfaqet si ticket me orar të planifikuar.',
    'help.q4': 'A funksionon në të gjithë Kosovën?',
    'help.a4':
      'Po — filtro sipas qytetit (Prishtinë, Prizren, Pejë, Gjilan, etj.) ose hap faqen Qytetet.',
    'help.q5': 'Si i marr njoftimet?',
    'help.a5':
      'Në aplikacion (zile), email dhe opsionalisht SMS/Telegram. Kontrollo Cilësimet për kanalet që dëshiron.',
    'help.q6': 'Ku e shoh historikun e ticket-eve?',
    'help.a6': 'Në Panelin e Qytetarit. Mund të eksportosh historikun si CSV.',

    'privacy.title': 'Politika e Privatësisë',
    'privacy.updated': 'SmartQueue Kosova · përditësuar Korrik 2026',
    'privacy.s1': 'Kush jemi',
    'privacy.p1':
      'SmartQueue Kosova është platformë digjitale për menaxhimin e radhëve dhe termineve në institucione publike e private në Republikën e Kosovës.',
    'privacy.s2': 'Çfarë mbledhim',
    'privacy.s3': 'Pse i përdorim',
    'privacy.p3':
      'Për ofrimin e shërbimit (radhë, termine, njoftime), përmirësim të sistemit dhe mbrojtje nga abuzimi. Nuk i shesim të dhënat te palë të treta.',
    'privacy.s4': 'Njoftimet',
    'privacy.p4':
      'SMS, email dhe Telegram dërgohen vetëm sipas preferencave në Cilësime ose kur janë të nevojshme për konfirmim termini.',
    'privacy.s5': 'Të drejtat e tua (LPDP)',
    'privacy.p5':
      'Mund të kërkosh qasje, korrigjim ose fshirje të llogarisë nga Cilësimet → «Fshi llogarinë».',
    'privacy.s6': 'Ruajtja',
    'privacy.p6':
      'Të dhënat ruhen për sa kohë llogaria është aktive. Pas fshirjes, ticket-et aktive anulohen.',
    'privacy.seeTerms': 'Shih edhe Kushtet e Përdorimit',

    'terms.title': 'Kushtet e Përdorimit',
    'terms.updated': 'SmartQueue Kosova · përditësuar Korrik 2026',
    'terms.s1': 'Pranimi',
    'terms.p1':
      'Duke përdorur SmartQueue, pranon këto kushte. Nëse nuk pajtohesh, mos e përdor platformën.',
    'terms.s2': 'Llogaria',
    'terms.p2':
      'Je përgjegjës për sigurinë e fjalëkalimit dhe aktivitetin në llogarinë tënde.',
    'terms.s3': 'Përdorimi i saktë',
    'terms.s4': 'Ticket & QR',
    'terms.p4':
      'Bileta digjitale dhe QR janë personale. Check-in bëhet nga stafi i institucionit.',
    'terms.s5': 'Disponueshmëria',
    'terms.p5':
      'Synojmë shërbim të vazhdueshëm, por nuk garantojmë 100% uptime.',
    'terms.s6': 'Ligji',
    'terms.p6':
      'Këto kushte interpretohen sipas ligjeve të Republikës së Kosovës.',

    'auth.forgotPassword': 'Harruat fjalëkalimin?',
    'auth.forgotSubtitle': 'Shkruaj emailin dhe do të marrësh link rivendosjeje.',
    'auth.sendLink': 'Dërgo linkun',
    'auth.sending': 'Duke dërguar…',
    'auth.checkInbox': 'Kontrollo inbox-in (dhe spam). Linku vlen 1 orë.',
    'auth.resetTitle': 'Rivendos fjalëkalimin',
    'auth.newPassword': 'Fjalëkalimi i ri',
    'auth.savePassword': 'Ruaj fjalëkalimin',
    'auth.passwordMin': 'Fjalëkalimi duhet të ketë të paktën 8 karaktere',
    'auth.resetSuccess': 'Fjalëkalimi u rivendos',
    'auth.invalidLink': 'Link i pavlefshëm.',
    'auth.backToLogin': 'Kthehu te hyrja',

    'cmd.placeholder': 'Kërko faqe, institucione…',
    'cmd.pages': 'Faqet',
    'cmd.institutions': 'Institucionet',

    'appointment.notifyTitle': 'Njoftime (Telegram + SMS)',
    'appointment.notifyLinked':
      'Telegram është i lidhur — njoftimi shkon falas aty së pari. SMS është opsional si backup.',
    'appointment.notifyHint':
      'Rekomandohet Telegram (falas) te Cilësimet. Ose aktivizo SMS këtu si backup.',
    'appointment.telegramActive':
      'Telegram aktiv — konfirmimi dhe kujtesat shkojnë aty automatikisht',
    'appointment.phoneSms': 'Numri i telefonit (+383…) — SMS backup',

    'admin.checkInTitle': 'Check-in me QR',
    'admin.checkInDesc':
      'Skano ose ngjit kodin QR të biletës së qytetarit për check-in në sportele.',
    'admin.checkIn': 'Check-in',
    'admin.checkInOk': 'Check-in OK',
    'admin.checkInFailed': 'Check-in dështoi',
    'admin.avgWait': 'Pritja Mesatare',

    'queue.printTicket': 'Printo biletën',
    'queue.openConfirm': 'Institucioni duket {status}. A dëshiron të vazhdosh me ticket / termin?',

    'chat.tool.search': 'Duke kërkuar institucione…',
    'chat.tool.details': 'Duke lexuar detajet…',
    'chat.tool.queue': 'Duke kontrolluar radhën…',
    'chat.tool.tickets': 'Duke ngarkuar ticket-et…',
    'chat.tool.guide': 'Duke hapur udhëzuesin…',
    'chat.tool.bestTime': 'Duke analizuar kohën më të mirë…',

    'home.citiesEyebrow': 'Kosovë',
    'home.citiesTitle': 'Zgjidh qytetin tënd',
    'home.allCities': 'Të gjitha qytetet',
    'home.institutionCount': '{n} institucione',
    'home.loadingCities': 'Duke ngarkuar qytetet…',

    'institution.viewList': 'Lista',
    'institution.viewMap': 'Harta',
    'institution.allCities': 'Të gjitha qytetet',
    'institution.favoritesFilter': 'Të preferuarat',
    'institution.mapTitle': 'Harta e institucioneve · OpenStreetMap',
    'institution.locationsCount': '{n} lokacione',
    'institution.favoriteAria': 'Preferuar',
    'institution.openNow': '● Hapur',
    'institution.closedNow': '● Mbyllur',
    'institution.waitingNow': '{n} në pritje tani',

    'hours.unknown': 'Orar i panjohur',
    'hours.contact': 'Kontakto institucionin',
    'hours.closedWeekend': 'Mbyllur (fundjavë)',
    'hours.opensSoon': 'Hapet së shpejti · {open}–{close}',
    'hours.openNow': 'Hapur tani',
    'hours.until': 'Deri në {time}',
    'hours.stillClosed': 'Ende i mbyllur',
    'hours.opensAt': 'Hapet në {time}',
    'hours.closedToday': 'Mbyllur sot',
    'hours.schedule': 'Orari: {open}–{close}',

    'citizen.exportCsv': 'Eksporto CSV',

    'lang.changed': 'Gjuha u ndryshua',
  },

  en: {
    'nav.settings': 'Settings',
    'nav.cities': 'Cities',
    'nav.help': 'Help',
    'footer.cities': 'Cities',
    'footer.help': 'Help',
    'a11y.skipContent': 'Skip to content',

    'settings.title': 'Settings',
    'settings.subtitle': 'Free Telegram alerts — primary channel',
    'settings.telegramTitle': 'Telegram (recommended)',
    'settings.free': 'Free',
    'settings.telegramBody':
      'Best channel for SmartQueue: free, instant, no SMS credits. Get appointment confirmations, reminders and queue calls on Telegram.',
    'settings.linked': 'Connected',
    'settings.unlink': 'Disconnect',
    'settings.adminBotHint':
      'Admin: create a bot with @BotFather → set TELEGRAM_BOT_TOKEN in backend/.env → restart server.',
    'settings.linkTelegram': 'Connect Telegram',
    'settings.linkHint': 'Opens Telegram → press Start → linking is automatic',
    'settings.preferredCity': 'Preferred city',
    'settings.channels': 'Notification channels',
    'settings.inApp': 'In app',
    'settings.inAppHint': 'Live bell',
    'settings.email': 'Email',
    'settings.telegram': 'Telegram',
    'settings.telegramOn': 'On · connected',
    'settings.telegramOff': 'Connect above',
    'settings.smsOptional': 'SMS (optional)',
    'settings.smsHint': 'Backup if you have provider credits',
    'settings.account': 'Account',
    'settings.changePassword': 'Change password',
    'settings.currentPassword': 'Current password',
    'settings.newPassword': 'New password (min. 8)',
    'settings.savePassword': 'Save password',
    'settings.deleteAccount': 'Delete account',
    'settings.deleteHint': 'Deletes personal data. Active appointments are cancelled.',
    'settings.confirmPassword': 'Confirm with password',
    'settings.deleteForever': 'Delete forever',
    'settings.save': 'Save settings',
    'settings.saving': 'Saving…',
    'settings.saved': 'Settings saved',
    'settings.saveFailed': 'Save failed',
    'settings.openTelegram': 'Open Telegram and press Start',
    'settings.unlinked': 'Telegram disconnected',
    'settings.passwordChanged': 'Password changed',
    'settings.passwordFailed': 'Password change failed',
    'settings.deleteConfirm': 'Are you sure? Account will be permanently deleted.',
    'settings.deleted': 'Account deleted',
    'settings.deleteFailed': 'Delete failed',
    'settings.linkFailed': 'Link failed',

    'settings.viberTitle': 'Viber (free)',
    'settings.viberBody':
      'Get SmartQueue alerts on Viber — free, no SMS credits. Ideal if you use Viber daily.',
    'settings.viberAdminHint':
      'Admin: create a bot at partners.viber.com → set VIBER_AUTH_TOKEN + VIBER_BOT_URI → HTTPS webhook (ngrok).',
    'settings.linkViber': 'Connect Viber',
    'settings.viberLinkHint': 'Opens Viber → start chat → linking is automatic',
    'settings.openViber': 'Open Viber and start the chat',
    'settings.viberUnlinked': 'Viber disconnected',
    'settings.viberLinkFailed': 'Viber link failed',
    'settings.viberWebhookHint':
      'For local: start HTTPS ngrok, set VIBER_WEBHOOK_URL, then restart backend.',
    'settings.viber': 'Viber',
    'settings.viberOn': 'On · connected',
    'settings.viberOff': 'Connect above',

    'settings.iosAndroid': 'iOS + Android',
    'settings.waTitle': 'WhatsApp (iOS & Android)',
    'settings.waBody':
      'Free SmartQueue alerts in WhatsApp — works on iPhone and Android. Save your number or open the deep link to connect.',
    'settings.waAdminHint':
      'Admin: Meta Developers → WhatsApp → WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (+ business number) in .env.',
    'settings.linkWhatsApp': 'Open WhatsApp (link)',
    'settings.waLinkHint':
      'Save your number (fastest) or open WhatsApp and send the code. Works on iOS + Android.',
    'settings.waPhonePlaceholder': '38344XXXXXX',
    'settings.waSavePhone': 'Save',
    'settings.openWhatsApp': 'Open WhatsApp and send the message',
    'settings.waSaved': 'WhatsApp number saved',
    'settings.waUnlinked': 'WhatsApp disconnected',
    'settings.waLinkFailed': 'WhatsApp link failed',
    'settings.whatsapp': 'WhatsApp',
    'settings.waOn': 'On · connected',
    'settings.waOff': 'Connect above',

    'settings.freeSmsTitle': 'Free SMS (TextBee / Textbelt)',
    'settings.freeSmsBody':
      'Real SMS: TextBee sends from an Android phone (recipients can be iOS or Android). Textbelt ~1 SMS/day for tests — any phone.',
    'settings.textbeeSetup':
      'TextBee setup: textbee.dev → Android app → API key + Device ID → TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in backend/.env → restart server.',

    'cities.eyebrow': 'Republic of Kosovo',
    'cities.title': 'Cities & Municipalities',
    'cities.subtitle': 'Pick your city and find public & private institutions with digital queues —',
    'cities.activeInstitutions': 'active institutions',
    'cities.publicServices': 'Public services',
    'cities.viewInstitutions': 'View institutions',
    'cities.loading': 'Loading…',
    'cities.empty': 'No cities found',

    'help.title': 'Help & FAQ',
    'help.subtitle': 'Short guide for citizens of Kosovo',
    'help.getNumber': 'Get a number',
    'help.appointments': 'Appointments',
    'help.cities': 'Cities',
    'help.q1': 'How do I get a digital number?',
    'help.a1':
      'Go to Institutions → pick an institution → pick a service → confirm documents → Get Digital Number. You must be logged in.',
    'help.q2': 'What is priority (elderly, emergency…)?',
    'help.a2':
      'Use only if you qualify. Priority makes the queue fairer for urgent cases and people with special needs.',
    'help.q3': 'How do I book an appointment?',
    'help.a3':
      'From Appointments pick institution, service, date and time. It appears as a ticket with a scheduled time.',
    'help.q4': 'Does it work across Kosovo?',
    'help.a4':
      'Yes — filter by city (Prishtina, Prizren, Peja, Gjilan, etc.) or open the Cities page.',
    'help.q5': 'How do I get notifications?',
    'help.a5':
      'In-app (bell), email and optionally SMS/Telegram. Check Settings for the channels you want.',
    'help.q6': 'Where do I see ticket history?',
    'help.a6': 'In the Citizen Dashboard. You can export history as CSV.',

    'privacy.title': 'Privacy Policy',
    'privacy.updated': 'SmartQueue Kosova · updated July 2026',
    'privacy.s1': 'Who we are',
    'privacy.p1':
      'SmartQueue Kosova is a digital platform for queues and appointments at public and private institutions in the Republic of Kosovo.',
    'privacy.s2': 'What we collect',
    'privacy.s3': 'Why we use it',
    'privacy.p3':
      'To provide the service (queues, appointments, notifications), improve the system and prevent abuse. We do not sell your data.',
    'privacy.s4': 'Notifications',
    'privacy.p4':
      'SMS, email and Telegram are sent only per your Settings preferences or when needed for appointment confirmation.',
    'privacy.s5': 'Your rights',
    'privacy.p5':
      'You can request access, correction or deletion from Settings → «Delete account».',
    'privacy.s6': 'Retention',
    'privacy.p6':
      'Data is kept while the account is active. After deletion, active tickets are cancelled.',
    'privacy.seeTerms': 'Also see Terms of Use',

    'terms.title': 'Terms of Use',
    'terms.updated': 'SmartQueue Kosova · updated July 2026',
    'terms.s1': 'Acceptance',
    'terms.p1': 'By using SmartQueue you accept these terms. If you disagree, do not use the platform.',
    'terms.s2': 'Account',
    'terms.p2': 'You are responsible for password security and activity on your account.',
    'terms.s3': 'Proper use',
    'terms.s4': 'Ticket & QR',
    'terms.p4':
      'Digital tickets and QR codes are personal. Check-in is done by institution staff.',
    'terms.s5': 'Availability',
    'terms.p5': 'We aim continuous service but do not guarantee 100% uptime.',
    'terms.s6': 'Law',
    'terms.p6': 'These terms are governed by the laws of the Republic of Kosovo.',

    'auth.forgotPassword': 'Forgot password?',
    'auth.forgotSubtitle': 'Enter your email and you will receive a reset link.',
    'auth.sendLink': 'Send link',
    'auth.sending': 'Sending…',
    'auth.checkInbox': 'Check your inbox (and spam). Link is valid for 1 hour.',
    'auth.resetTitle': 'Reset password',
    'auth.newPassword': 'New password',
    'auth.savePassword': 'Save password',
    'auth.passwordMin': 'Password must be at least 8 characters',
    'auth.resetSuccess': 'Password reset',
    'auth.invalidLink': 'Invalid link.',
    'auth.backToLogin': 'Back to login',

    'cmd.placeholder': 'Search pages, institutions…',
    'cmd.pages': 'Pages',
    'cmd.institutions': 'Institutions',

    'appointment.notifyTitle': 'Notifications (Telegram + SMS)',
    'appointment.notifyLinked':
      'Telegram is connected — alerts go there first for free. SMS is optional backup.',
    'appointment.notifyHint':
      'Telegram (free) is recommended in Settings. Or enable SMS here as backup.',
    'appointment.telegramActive':
      'Telegram on — confirmations and reminders go there automatically',
    'appointment.phoneSms': 'Phone number (+383…) — SMS backup',

    'admin.checkInTitle': 'QR Check-in',
    'admin.checkInDesc': 'Scan or paste the citizen ticket QR code for counter check-in.',
    'admin.checkIn': 'Check-in',
    'admin.checkInOk': 'Check-in OK',
    'admin.checkInFailed': 'Check-in failed',
    'admin.avgWait': 'Average wait',

    'queue.printTicket': 'Print ticket',
    'queue.openConfirm': 'Institution appears {status}. Continue with ticket / appointment?',

    'chat.tool.search': 'Searching institutions…',
    'chat.tool.details': 'Reading details…',
    'chat.tool.queue': 'Checking queue…',
    'chat.tool.tickets': 'Loading tickets…',
    'chat.tool.guide': 'Opening guide…',
    'chat.tool.bestTime': 'Analyzing best time…',

    'home.citiesEyebrow': 'Kosovo',
    'home.citiesTitle': 'Choose your city',
    'home.allCities': 'All cities',
    'home.institutionCount': '{n} institutions',
    'home.loadingCities': 'Loading cities…',

    'institution.viewList': 'List',
    'institution.viewMap': 'Map',
    'institution.allCities': 'All cities',
    'institution.favoritesFilter': 'Favorites',
    'institution.mapTitle': 'Institutions map · OpenStreetMap',
    'institution.locationsCount': '{n} locations',
    'institution.favoriteAria': 'Favorite',
    'institution.openNow': '● Open',
    'institution.closedNow': '● Closed',
    'institution.waitingNow': '{n} waiting now',

    'hours.unknown': 'Hours unknown',
    'hours.contact': 'Contact the institution',
    'hours.closedWeekend': 'Closed (weekend)',
    'hours.opensSoon': 'Opens soon · {open}–{close}',
    'hours.openNow': 'Open now',
    'hours.until': 'Until {time}',
    'hours.stillClosed': 'Still closed',
    'hours.opensAt': 'Opens at {time}',
    'hours.closedToday': 'Closed today',
    'hours.schedule': 'Hours: {open}–{close}',

    'citizen.exportCsv': 'Export CSV',

    'lang.changed': 'Language changed',
  },

  sr: {
    'nav.settings': 'Podešavanja',
    'nav.cities': 'Gradovi',
    'nav.help': 'Pomoć',
    'footer.cities': 'Gradovi',
    'footer.help': 'Pomoć',
    'a11y.skipContent': 'Preskoči na sadržaj',

    'settings.title': 'Podešavanja',
    'settings.subtitle': 'Besplatna Telegram obaveštenja — glavni kanal',
    'settings.telegramTitle': 'Telegram (preporučeno)',
    'settings.free': 'Besplatno',
    'settings.telegramBody':
      'Najbolji kanal za SmartQueue: besplatno, trenutno, bez SMS kredita. Potvrde termina, podsetnici i pozivi na Telegramu.',
    'settings.linked': 'Povezano',
    'settings.unlink': 'Prekini',
    'settings.adminBotHint':
      'Admin: napravi bota kod @BotFather → stavi TELEGRAM_BOT_TOKEN u backend/.env → restartuj server.',
    'settings.linkTelegram': 'Poveži Telegram',
    'settings.linkHint': 'Otvara Telegram → pritisni Start → povezivanje je automatsko',
    'settings.preferredCity': 'Omiljeni grad',
    'settings.channels': 'Kanali obaveštenja',
    'settings.inApp': 'U aplikaciji',
    'settings.inAppHint': 'Živo zvono',
    'settings.email': 'Email',
    'settings.telegram': 'Telegram',
    'settings.telegramOn': 'Aktivno · povezano',
    'settings.telegramOff': 'Poveži iznad',
    'settings.smsOptional': 'SMS (opciono)',
    'settings.smsHint': 'Rezerva ako imaš kredite providera',
    'settings.account': 'Nalog',
    'settings.changePassword': 'Promeni lozinku',
    'settings.currentPassword': 'Trenutna lozinka',
    'settings.newPassword': 'Nova lozinka (min. 8)',
    'settings.savePassword': 'Sačuvaj lozinku',
    'settings.deleteAccount': 'Obriši nalog',
    'settings.deleteHint': 'Briše lične podatke. Aktivni termini se otkazuju.',
    'settings.confirmPassword': 'Potvrdi lozinkom',
    'settings.deleteForever': 'Obriši zauvek',
    'settings.save': 'Sačuvaj podešavanja',
    'settings.saving': 'Čuvanje…',
    'settings.saved': 'Podešavanja sačuvana',
    'settings.saveFailed': 'Čuvanje nije uspelo',
    'settings.openTelegram': 'Otvori Telegram i pritisni Start',
    'settings.unlinked': 'Telegram prekinut',
    'settings.passwordChanged': 'Lozinka promenjena',
    'settings.passwordFailed': 'Promena lozinke nije uspela',
    'settings.deleteConfirm': 'Da li si siguran? Nalog se trajno briše.',
    'settings.deleted': 'Nalog obrisan',
    'settings.deleteFailed': 'Brisanje nije uspelo',
    'settings.linkFailed': 'Povezivanje nije uspelo',

    'settings.viberTitle': 'Viber (besplatno)',
    'settings.viberBody':
      'Primaj SmartQueue obaveštenja na Viberu — besplatno, bez SMS kredita.',
    'settings.viberAdminHint':
      'Admin: napravi bota na partners.viber.com → VIBER_AUTH_TOKEN + VIBER_BOT_URI → HTTPS webhook (ngrok).',
    'settings.linkViber': 'Poveži Viber',
    'settings.viberLinkHint': 'Otvara Viber → započni chat → povezivanje je automatsko',
    'settings.openViber': 'Otvori Viber i započni chat',
    'settings.viberUnlinked': 'Viber prekinut',
    'settings.viberLinkFailed': 'Povezivanje Vibera nije uspelo',
    'settings.viberWebhookHint':
      'Za lokal: pokreni HTTPS ngrok, stavi VIBER_WEBHOOK_URL, restartuj backend.',
    'settings.viber': 'Viber',
    'settings.viberOn': 'Aktivno · povezano',
    'settings.viberOff': 'Poveži iznad',

    'settings.iosAndroid': 'iOS + Android',
    'settings.waTitle': 'WhatsApp (iOS & Android)',
    'settings.waBody':
      'Besplatne SmartQueue notifikacije u WhatsApp-u — radi na iPhone i Android. Sačuvaj broj ili otvori deep link.',
    'settings.waAdminHint':
      'Admin: Meta Developers → WhatsApp → WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (+ poslovni broj) u .env.',
    'settings.linkWhatsApp': 'Otvori WhatsApp (poveži)',
    'settings.waLinkHint':
      'Sačuvaj broj (najbrže) ili otvori WhatsApp i pošalji kod. Radi na iOS + Android.',
    'settings.waPhonePlaceholder': '38344XXXXXX',
    'settings.waSavePhone': 'Sačuvaj',
    'settings.openWhatsApp': 'Otvori WhatsApp i pošalji poruku',
    'settings.waSaved': 'WhatsApp broj sačuvan',
    'settings.waUnlinked': 'WhatsApp prekinut',
    'settings.waLinkFailed': 'Povezivanje WhatsApp-a nije uspelo',
    'settings.whatsapp': 'WhatsApp',
    'settings.waOn': 'Aktivno · povezano',
    'settings.waOff': 'Poveži iznad',

    'settings.freeSmsTitle': 'Besplatni SMS (TextBee / Textbelt)',
    'settings.freeSmsBody':
      'Pravi SMS: TextBee šalje sa Android telefona (primaoci mogu biti iOS ili Android). Textbelt ~1 SMS/dan — bilo koji telefon.',
    'settings.textbeeSetup':
      'TextBee setup: textbee.dev → Android app → API key + Device ID → TEXTBEE_API_KEY i TEXTBEE_DEVICE_ID u backend/.env → restartuj server.',

    'cities.eyebrow': 'Republika Kosovo',
    'cities.title': 'Gradovi i opštine',
    'cities.subtitle': 'Izaberi grad i pronađi javne i privatne institucije sa digitalnim redom —',
    'cities.activeInstitutions': 'aktivnih institucija',
    'cities.publicServices': 'Javne usluge',
    'cities.viewInstitutions': 'Pogledaj institucije',
    'cities.loading': 'Učitavanje…',
    'cities.empty': 'Nema gradova',

    'help.title': 'Pomoć i FAQ',
    'help.subtitle': 'Kratak vodič za građane Kosova',
    'help.getNumber': 'Uzmi broj',
    'help.appointments': 'Termini',
    'help.cities': 'Gradovi',
    'help.q1': 'Kako da uzmem digitalni broj?',
    'help.a1':
      'Idi na Institucije → izaberi instituciju → uslugu → potvrdi dokumenta → Uzmi digitalni broj. Moraš biti prijavljen.',
    'help.q2': 'Šta je prioritet (stariji, hitno…)?',
    'help.a2':
      'Koristi samo ako imaš pravo. Prioritet čini red pravednijim za hitne slučajeve.',
    'help.q3': 'Kako da rezervišem termin?',
    'help.a3':
      'Iz Termina izaberi instituciju, uslugu, datum i vreme. Prikazuje se kao tiket sa zakazanim vremenom.',
    'help.q4': 'Da li radi širom Kosova?',
    'help.a4':
      'Da — filtriraj po gradu (Priština, Prizren, Peć, Gnjilane…) ili otvori stranicu Gradovi.',
    'help.q5': 'Kako dobijam obaveštenja?',
    'help.a5':
      'U aplikaciji, email i opciono SMS/Telegram. Proveri Podešavanja.',
    'help.q6': 'Gde vidim istoriju tiketa?',
    'help.a6': 'Na panelu građanina. Možeš izvesti istoriju kao CSV.',

    'privacy.title': 'Politika privatnosti',
    'privacy.updated': 'SmartQueue Kosova · ažurirano jul 2026',
    'privacy.s1': 'Ko smo',
    'privacy.p1':
      'SmartQueue Kosova je digitalna platforma za redove i termine u javnim i privatnim institucijama na Kosovu.',
    'privacy.s2': 'Šta prikupljamo',
    'privacy.s3': 'Zašto koristimo',
    'privacy.p3':
      'Za pružanje usluge, poboljšanje sistema i zaštitu od zloupotrebe. Ne prodajemo podatke.',
    'privacy.s4': 'Obaveštenja',
    'privacy.p4':
      'SMS, email i Telegram se šalju samo prema podešavanjima ili za potvrdu termina.',
    'privacy.s5': 'Tvoja prava',
    'privacy.p5':
      'Možeš zatražiti pristup, ispravku ili brisanje iz Podešavanja → «Obriši nalog».',
    'privacy.s6': 'Čuvanje',
    'privacy.p6':
      'Podaci se čuvaju dok je nalog aktivan. Posle brisanja aktivni tiketi se otkazuju.',
    'privacy.seeTerms': 'Vidi i Uslove korišćenja',

    'terms.title': 'Uslovi korišćenja',
    'terms.updated': 'SmartQueue Kosova · ažurirano jul 2026',
    'terms.s1': 'Prihvatanje',
    'terms.p1': 'Korišćenjem SmartQueue prihvataš ove uslove.',
    'terms.s2': 'Nalog',
    'terms.p2': 'Odgovoran si za bezbednost lozinke i aktivnost na nalogu.',
    'terms.s3': 'Ispravna upotreba',
    'terms.s4': 'Tiket i QR',
    'terms.p4':
      'Digitalni tiketi i QR su lični. Check-in radi osoblje institucije.',
    'terms.s5': 'Dostupnost',
    'terms.p5': 'Ciljamo kontinuiranu uslugu, ali ne garantujemo 100% uptime.',
    'terms.s6': 'Zakon',
    'terms.p6': 'Ovi uslovi se tumače prema zakonima Republike Kosovo.',

    'auth.forgotPassword': 'Zaboravljena lozinka?',
    'auth.forgotSubtitle': 'Unesi email i dobićeš link za reset.',
    'auth.sendLink': 'Pošalji link',
    'auth.sending': 'Slanje…',
    'auth.checkInbox': 'Proveri inbox (i spam). Link važi 1 sat.',
    'auth.resetTitle': 'Resetuj lozinku',
    'auth.newPassword': 'Nova lozinka',
    'auth.savePassword': 'Sačuvaj lozinku',
    'auth.passwordMin': 'Lozinka mora imati najmanje 8 karaktera',
    'auth.resetSuccess': 'Lozinka resetovana',
    'auth.invalidLink': 'Nevažeći link.',
    'auth.backToLogin': 'Nazad na prijavu',

    'cmd.placeholder': 'Pretraži stranice, institucije…',
    'cmd.pages': 'Stranice',
    'cmd.institutions': 'Institucije',

    'appointment.notifyTitle': 'Obaveštenja (Telegram + SMS)',
    'appointment.notifyLinked':
      'Telegram je povezan — obaveštenja idu tamo besplatno. SMS je opciona rezervna.',
    'appointment.notifyHint':
      'Preporučen je Telegram (besplatno) u Podešavanjima. Ili uključi SMS ovde.',
    'appointment.telegramActive':
      'Telegram aktivan — potvrde i podsetnici idu automatski',
    'appointment.phoneSms': 'Broj telefona (+383…) — SMS rezervna',

    'admin.checkInTitle': 'QR Check-in',
    'admin.checkInDesc': 'Skeniraj ili nalepi QR kod tiketa građanina.',
    'admin.checkIn': 'Check-in',
    'admin.checkInOk': 'Check-in OK',
    'admin.checkInFailed': 'Check-in nije uspeo',
    'admin.avgWait': 'Prosečno čekanje',

    'queue.printTicket': 'Štampaj tiket',
    'queue.openConfirm': 'Institucija izgleda {status}. Nastavi sa tiketom / terminom?',

    'chat.tool.search': 'Tražim institucije…',
    'chat.tool.details': 'Čitam detalje…',
    'chat.tool.queue': 'Proveravam red…',
    'chat.tool.tickets': 'Učitavam tikete…',
    'chat.tool.guide': 'Otvaram vodič…',
    'chat.tool.bestTime': 'Analiziram najbolje vreme…',

    'home.citiesEyebrow': 'Kosovo',
    'home.citiesTitle': 'Izaberite grad',
    'home.allCities': 'Svi gradovi',
    'home.institutionCount': '{n} institucija',
    'home.loadingCities': 'Učitavanje gradova…',

    'institution.viewList': 'Lista',
    'institution.viewMap': 'Mapa',
    'institution.allCities': 'Svi gradovi',
    'institution.favoritesFilter': 'Omiljene',
    'institution.mapTitle': 'Mapa institucija · OpenStreetMap',
    'institution.locationsCount': '{n} lokacija',
    'institution.favoriteAria': 'Omiljeno',
    'institution.openNow': '● Otvoreno',
    'institution.closedNow': '● Zatvoreno',
    'institution.waitingNow': '{n} na čekanju',

    'hours.unknown': 'Radno vreme nepoznato',
    'hours.contact': 'Kontaktiraj instituciju',
    'hours.closedWeekend': 'Zatvoreno (vikend)',
    'hours.opensSoon': 'Otvara se uskoro · {open}–{close}',
    'hours.openNow': 'Otvoreno sada',
    'hours.until': 'Do {time}',
    'hours.stillClosed': 'Još zatvoreno',
    'hours.opensAt': 'Otvara se u {time}',
    'hours.closedToday': 'Zatvoreno danas',
    'hours.schedule': 'Radno vreme: {open}–{close}',

    'citizen.exportCsv': 'Izvezi CSV',

    'lang.changed': 'Jezik promenjen',
  },
}
