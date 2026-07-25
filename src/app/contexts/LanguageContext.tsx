import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations: Record<Language, Record<string, string>> = {
  sq: {
    // Navigation
    'nav.home': 'Ballina',
    'nav.institutions': 'Institucionet',
    'nav.myQueue': 'Radha Ime',
    'nav.appointments': 'Terminet',
    'nav.dashboard': 'Paneli',
    'nav.logout': 'Dalja',
    'nav.login': 'Hyrja',
    'nav.register': 'Regjistrohu',
    
    // Home
    'home.title': 'SmartQueue Kosova',
    'home.subtitle': 'Sistem inteligjent për menaxhimin e radhëve digjitale',
    'home.description': 'Rezervoni termine dhe merrni numra digjitalë për institucione publike dhe private në Kosovë. Përfundoni pritjet e gjata fizike!',
    'home.getStarted': 'Fillo Tani',
    'home.howItWorks': 'Si Funksionon',
    'home.features': 'Veçoritë',
    'home.stats': 'Statistikat',
    
    // Features
    'features.digital': 'Radhë Digjitale',
    'features.digitalDesc': 'Merrni numër digjital dhe ndiqni radhën tuaj në kohë reale',
    'features.appointments': 'Rezervim Terminesh',
    'features.appointmentsDesc': 'Rezervoni termine dhe menaxhojini online',
    'features.realtime': 'Përditësim Live',
    'features.realtimeDesc': 'Shihni statusin e radhës në kohë reale',
    'features.notifications': 'Njoftime',
    'features.notificationsDesc': 'Merrni njoftime kur radha juaj afrohet',
    'features.analytics': 'Analitika',
    'features.analyticsDesc': 'Shihni statistika dhe koha më të mirë për vizitë',
    'features.priority': 'Sistem Prioriteti',
    'features.priorityDesc': 'Trajtim i veçantë për raste emergjente',
    
    // Institutions
    'institution.municipality': 'Komuna',
    'institution.hospital': 'Spital',
    'institution.atk': 'ATK',
    'institution.bank': 'Bankë',
    'institution.university': 'Universitet',
    'institution.post': 'Posta',
    'institution.student_center': 'Qendër Studentore',
    'institution.selectInstitution': 'Zgjidh Institucionin',
    'institution.selectService': 'Zgjidh Shërbimin',
    
    // Queue
    'queue.yourNumber': 'Numri Juaj',
    'queue.currentNumber': 'Numri Aktual',
    'queue.inFront': 'Përpara Jush',
    'queue.estimatedWait': 'Koha e Pritjes',
    'queue.minutes': 'minuta',
    'queue.status': 'Statusi',
    'queue.getTicket': 'Merr Numër',
    'queue.downloadQR': 'Shkarko QR',
    'queue.cancel': 'Anulo',
    
    // Status
    'status.waiting': 'Në pritje',
    'status.called': 'U thirr',
    'status.serving': 'Duke u shërbyer',
    'status.completed': 'Përfunduar',
    'status.cancelled': 'Anuluar',
    
    // Priority
    'priority.normal': 'Normal',
    'priority.elderly': 'Të moshuar',
    'priority.emergency': 'Emergjencë',
    'priority.disability': 'Aftësi të kufizuara',
    
    // Auth
    'auth.email': 'Email',
    'auth.password': 'Fjalëkalimi',
    'auth.name': 'Emri dhe Mbiemri',
    'auth.phone': 'Telefoni',
    'auth.login': 'Hyrja',
    'auth.register': 'Regjistrohu',
    'auth.dontHaveAccount': 'Nuk keni llogari?',
    'auth.alreadyHaveAccount': 'Keni llogari?',
    'auth.selectRole': 'Zgjidh Rolin',
    'auth.citizen': 'Qytetar',
    'auth.admin': 'Administrator',
    
    // Appointments
    'appointment.book': 'Rezervo Termin',
    'appointment.date': 'Data',
    'appointment.time': 'Ora',
    'appointment.selectDate': 'Zgjidh Datën',
    'appointment.selectTime': 'Zgjidh Orën',
    'appointment.confirm': 'Konfirmo',
    'appointment.myAppointments': 'Terminet e Mia',
    'appointment.upcoming': 'Të ardhshme',
    'appointment.past': 'Të kaluara',
    
    // Dashboard
    'dashboard.welcome': 'Mirë se vini',
    'dashboard.activeCounters': 'Sportele Aktive',
    'dashboard.waitingTickets': 'Në Pritje',
    'dashboard.todayVisitors': 'Vizitorë Sot',
    'dashboard.avgWaitTime': 'Koha Mesatare',
    'dashboard.callNext': 'Thirr Tjetrin',
    'dashboard.completeService': 'Përfundo Shërbimin',
    'dashboard.statistics': 'Statistikat',
    'dashboard.peakHours': 'Orët më të Ngarkuara',
    'dashboard.efficiency': 'Efikasiteti',
    
    // Common
    'common.search': 'Kërko',
    'common.filter': 'Filtro',
    'common.save': 'Ruaj',
    'common.cancel': 'Anulo',
    'common.delete': 'Fshi',
    'common.edit': 'Ndrysho',
    'common.view': 'Shiko',
    'common.close': 'Mbyll',
    'common.loading': 'Duke u ngarkuar...',
    'common.noData': 'Nuk ka të dhëna',
    'common.error': 'Gabim',
    'common.success': 'Sukses',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.institutions': 'Institutions',
    'nav.myQueue': 'My Queue',
    'nav.appointments': 'Appointments',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.register': 'Register',
    
    // Home
    'home.title': 'SmartQueue Kosova',
    'home.subtitle': 'Smart Digital Queue Management System',
    'home.description': 'Book appointments and get digital numbers for public and private institutions in Kosovo. End long physical waits!',
    'home.getStarted': 'Get Started',
    'home.howItWorks': 'How It Works',
    'home.features': 'Features',
    'home.stats': 'Statistics',
    
    // Features
    'features.digital': 'Digital Queue',
    'features.digitalDesc': 'Get a digital number and track your queue in real-time',
    'features.appointments': 'Appointment Booking',
    'features.appointmentsDesc': 'Book and manage appointments online',
    'features.realtime': 'Live Updates',
    'features.realtimeDesc': 'See queue status in real-time',
    'features.notifications': 'Notifications',
    'features.notificationsDesc': 'Get notified when your turn approaches',
    'features.analytics': 'Analytics',
    'features.analyticsDesc': 'View statistics and best times to visit',
    'features.priority': 'Priority System',
    'features.priorityDesc': 'Special handling for emergency cases',
    
    // Institutions
    'institution.municipality': 'Municipality',
    'institution.hospital': 'Hospital',
    'institution.atk': 'Tax Administration',
    'institution.bank': 'Bank',
    'institution.university': 'University',
    'institution.post': 'Post Office',
    'institution.student_center': 'Student Center',
    'institution.selectInstitution': 'Select Institution',
    'institution.selectService': 'Select Service',
    
    // Queue
    'queue.yourNumber': 'Your Number',
    'queue.currentNumber': 'Current Number',
    'queue.inFront': 'In Front of You',
    'queue.estimatedWait': 'Estimated Wait',
    'queue.minutes': 'minutes',
    'queue.status': 'Status',
    'queue.getTicket': 'Get Ticket',
    'queue.downloadQR': 'Download QR',
    'queue.cancel': 'Cancel',
    
    // Status
    'status.waiting': 'Waiting',
    'status.called': 'Called',
    'status.serving': 'Serving',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    
    // Priority
    'priority.normal': 'Normal',
    'priority.elderly': 'Elderly',
    'priority.emergency': 'Emergency',
    'priority.disability': 'Disability',
    
    // Auth
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Full Name',
    'auth.phone': 'Phone',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.selectRole': 'Select Role',
    'auth.citizen': 'Citizen',
    'auth.admin': 'Administrator',
    
    // Appointments
    'appointment.book': 'Book Appointment',
    'appointment.date': 'Date',
    'appointment.time': 'Time',
    'appointment.selectDate': 'Select Date',
    'appointment.selectTime': 'Select Time',
    'appointment.confirm': 'Confirm',
    'appointment.myAppointments': 'My Appointments',
    'appointment.upcoming': 'Upcoming',
    'appointment.past': 'Past',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.activeCounters': 'Active Counters',
    'dashboard.waitingTickets': 'Waiting',
    'dashboard.todayVisitors': 'Today\'s Visitors',
    'dashboard.avgWaitTime': 'Average Wait',
    'dashboard.callNext': 'Call Next',
    'dashboard.completeService': 'Complete Service',
    'dashboard.statistics': 'Statistics',
    'dashboard.peakHours': 'Peak Hours',
    'dashboard.efficiency': 'Efficiency',
    
    // Common
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
    'common.error': 'Error',
    'common.success': 'Success',
  },
  sr: {
    // Navigation
    'nav.home': 'Početna',
    'nav.institutions': 'Institucije',
    'nav.myQueue': 'Moj Red',
    'nav.appointments': 'Termini',
    'nav.dashboard': 'Kontrolna Tabla',
    'nav.logout': 'Odjavi se',
    'nav.login': 'Prijavi se',
    'nav.register': 'Registruj se',
    
    // Home
    'home.title': 'SmartQueue Kosova',
    'home.subtitle': 'Pametan sistem za upravljanje digitalnim redovima',
    'home.description': 'Rezervišite termine i dobijte digitalne brojeve za javne i privatne institucije na Kosovu. Završite duga fizička čekanja!',
    'home.getStarted': 'Počnite',
    'home.howItWorks': 'Kako funkcioniše',
    'home.features': 'Karakteristike',
    'home.stats': 'Statistika',
    
    // Features
    'features.digital': 'Digitalni Red',
    'features.digitalDesc': 'Dobijte digitalni broj i pratite red u realnom vremenu',
    'features.appointments': 'Rezervacija Termina',
    'features.appointmentsDesc': 'Rezervišite i upravljajte terminima online',
    'features.realtime': 'Ažuriranje uživo',
    'features.realtimeDesc': 'Vidite status reda u realnom vremenu',
    'features.notifications': 'Obaveštenja',
    'features.notificationsDesc': 'Dobijte obaveštenje kad se vaš red približi',
    'features.analytics': 'Analitika',
    'features.analyticsDesc': 'Pogledajte statistiku i najbolje vreme za posetu',
    'features.priority': 'Sistem Prioriteta',
    'features.priorityDesc': 'Poseban tretman za hitne slučajeve',
    
    // Institutions
    'institution.municipality': 'Opština',
    'institution.hospital': 'Bolnica',
    'institution.atk': 'Poreska Uprava',
    'institution.bank': 'Banka',
    'institution.university': 'Univerzitet',
    'institution.post': 'Pošta',
    'institution.student_center': 'Studentski Centar',
    'institution.selectInstitution': 'Izaberite Instituciju',
    'institution.selectService': 'Izaberite Uslugu',
    
    // Queue
    'queue.yourNumber': 'Vaš Broj',
    'queue.currentNumber': 'Trenutni Broj',
    'queue.inFront': 'Ispred Vas',
    'queue.estimatedWait': 'Procenjeno Čekanje',
    'queue.minutes': 'minuta',
    'queue.status': 'Status',
    'queue.getTicket': 'Dobij Kartu',
    'queue.downloadQR': 'Preuzmi QR',
    'queue.cancel': 'Otkaži',
    
    // Status
    'status.waiting': 'Čekanje',
    'status.called': 'Pozvan',
    'status.serving': 'Služenje',
    'status.completed': 'Završeno',
    'status.cancelled': 'Otkazano',
    
    // Priority
    'priority.normal': 'Normalan',
    'priority.elderly': 'Stariji',
    'priority.emergency': 'Hitno',
    'priority.disability': 'Invaliditet',
    
    // Auth
    'auth.email': 'Email',
    'auth.password': 'Lozinka',
    'auth.name': 'Ime i Prezime',
    'auth.phone': 'Telefon',
    'auth.login': 'Prijavi se',
    'auth.register': 'Registruj se',
    'auth.dontHaveAccount': 'Nemate nalog?',
    'auth.alreadyHaveAccount': 'Već imate nalog?',
    'auth.selectRole': 'Izaberite Ulogu',
    'auth.citizen': 'Građanin',
    'auth.admin': 'Administrator',
    
    // Appointments
    'appointment.book': 'Rezerviši Termin',
    'appointment.date': 'Datum',
    'appointment.time': 'Vreme',
    'appointment.selectDate': 'Izaberite Datum',
    'appointment.selectTime': 'Izaberite Vreme',
    'appointment.confirm': 'Potvrdi',
    'appointment.myAppointments': 'Moji Termini',
    'appointment.upcoming': 'Predstojeci',
    'appointment.past': 'Prošli',
    
    // Dashboard
    'dashboard.welcome': 'Dobrodošli',
    'dashboard.activeCounters': 'Aktivni Šalteri',
    'dashboard.waitingTickets': 'Čeka',
    'dashboard.todayVisitors': 'Danas Posetioci',
    'dashboard.avgWaitTime': 'Prosečno Čekanje',
    'dashboard.callNext': 'Pozovi Sledeći',
    'dashboard.completeService': 'Završi Uslugu',
    'dashboard.statistics': 'Statistika',
    'dashboard.peakHours': 'Najfrekventnije Sati',
    'dashboard.efficiency': 'Efikasnost',
    
    // Common
    'common.search': 'Pretraži',
    'common.filter': 'Filter',
    'common.save': 'Sačuvaj',
    'common.cancel': 'Otkaži',
    'common.delete': 'Obriši',
    'common.edit': 'Uredi',
    'common.view': 'Pogledaj',
    'common.close': 'Zatvori',
    'common.loading': 'Učitavanje...',
    'common.noData': 'Nema podataka',
    'common.error': 'Greška',
    'common.success': 'Uspeh',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('sq');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
