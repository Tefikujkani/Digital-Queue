import type { Institution, Service, Counter, Ticket, InstitutionType } from '../types';

export const mockInstitutions: Institution[] = [
  {
    id: 'inst-1',
    name: 'Komuna e Prishtinës',
    type: 'municipality' as InstitutionType,
    description: 'Shërbime komunale për qytetarët e Prishtinës',
    address: 'Sheshi Nënë Tereza',
    city: 'Prishtinë',
    workingHours: { open: '08:00', close: '16:00' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
  {
    id: 'inst-2',
    name: 'QKUK - Qendra Klinike Universitare e Kosovës',
    type: 'hospital' as InstitutionType,
    description: 'Shërbime spitalore dhe emergjente',
    address: 'Rr. e Spitalit',
    city: 'Prishtinë',
    workingHours: { open: '07:00', close: '20:00' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
  {
    id: 'inst-3',
    name: 'ATK - Administrata Tatimore e Kosovës',
    type: 'atk' as InstitutionType,
    description: 'Shërbime tatimore dhe doganore',
    address: 'Rr. UÇK',
    city: 'Prishtinë',
    workingHours: { open: '08:00', close: '15:00' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
  {
    id: 'inst-4',
    name: 'Banka Kombëtare Tregtare',
    type: 'bank' as InstitutionType,
    description: 'Shërbime bankare',
    address: 'Sheshi Bill Clinton',
    city: 'Prishtinë',
    workingHours: { open: '08:30', close: '16:30' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
  {
    id: 'inst-5',
    name: 'Universiteti i Prishtinës',
    type: 'university' as InstitutionType,
    description: 'Shërbime akademike dhe administrative',
    address: 'Rr. George Bush',
    city: 'Prishtinë',
    workingHours: { open: '08:00', close: '16:00' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
  {
    id: 'inst-6',
    name: 'Posta e Kosovës',
    type: 'post' as InstitutionType,
    description: 'Shërbime postare',
    address: 'Rr. Nënë Tereza',
    city: 'Prishtinë',
    workingHours: { open: '07:30', close: '19:00' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
  {
    id: 'inst-7',
    name: 'Qendra Studentore',
    type: 'student_center' as InstitutionType,
    description: 'Shërbime për studentë',
    address: 'Bregu i Diellit',
    city: 'Prishtinë',
    workingHours: { open: '08:00', close: '16:00' },
    services: [],
    counters: [],
    logo: '',
    isActive: true,
  },
];

export const mockServices: Service[] = [
  // Municipality
  { id: 'serv-1', name: 'Lëshimi i Dokumenteve', description: 'Dokumente personale', estimatedTime: 15, institutionId: 'inst-1' },
  { id: 'serv-2', name: 'Regjistrim Biznesi', description: 'Regjistrim biznesesh të reja', estimatedTime: 30, institutionId: 'inst-1' },
  { id: 'serv-3', name: 'Ndihma Sociale', description: 'Aplikim për ndihma sociale', estimatedTime: 20, institutionId: 'inst-1' },
  
  // Hospital
  { id: 'serv-4', name: 'Konsultë e Përgjithshme', description: 'Mjekësi e përgjithshme', estimatedTime: 20, institutionId: 'inst-2' },
  { id: 'serv-5', name: 'Laborator', description: 'Analiza laboratorike', estimatedTime: 10, institutionId: 'inst-2' },
  { id: 'serv-6', name: 'Emergjenca', description: 'Shërbime emergjente', estimatedTime: 5, institutionId: 'inst-2' },
  
  // ATK
  { id: 'serv-7', name: 'Deklarimi i Tatimeve', description: 'Dorëzim deklaratash', estimatedTime: 25, institutionId: 'inst-3' },
  { id: 'serv-8', name: 'Pagesa e Taksave', description: 'Pagesa tatimore', estimatedTime: 15, institutionId: 'inst-3' },
  { id: 'serv-9', name: 'Këshillim Tatimor', description: 'Konsulencë tatimore', estimatedTime: 30, institutionId: 'inst-3' },
  
  // Bank
  { id: 'serv-10', name: 'Hapje Llogarie', description: 'Llogari të reja bankare', estimatedTime: 20, institutionId: 'inst-4' },
  { id: 'serv-11', name: 'Kredi', description: 'Aplikim për kredi', estimatedTime: 40, institutionId: 'inst-4' },
  { id: 'serv-12', name: 'Transaksione', description: 'Transaksione dhe transfere', estimatedTime: 10, institutionId: 'inst-4' },
  
  // University
  { id: 'serv-13', name: 'Regjistrim', description: 'Regjistrim studentësh', estimatedTime: 15, institutionId: 'inst-5' },
  { id: 'serv-14', name: 'Certifikata', description: 'Lëshimi i certifikatave', estimatedTime: 10, institutionId: 'inst-5' },
  { id: 'serv-15', name: 'Këshillim Akademik', description: 'Konsulencë akademike', estimatedTime: 25, institutionId: 'inst-5' },
  
  // Post
  { id: 'serv-16', name: 'Dërgesa Postare', description: 'Dërgim paketash', estimatedTime: 10, institutionId: 'inst-6' },
  { id: 'serv-17', name: 'Pagesa Faturash', description: 'Pagim i faturave', estimatedTime: 5, institutionId: 'inst-6' },
  { id: 'serv-18', name: 'Shërbime Financiare', description: 'Transferta dhe pagesa', estimatedTime: 15, institutionId: 'inst-6' },
  
  // Student Center
  { id: 'serv-19', name: 'Aplikim për Bursë', description: 'Bursë studimore', estimatedTime: 20, institutionId: 'inst-7' },
  { id: 'serv-20', name: 'Akomodim', description: 'Regjistrim për strehim', estimatedTime: 15, institutionId: 'inst-7' },
  { id: 'serv-21', name: 'Kartelë Studentore', description: 'Lëshim i kartelës', estimatedTime: 10, institutionId: 'inst-7' },
];

export const mockCounters: Counter[] = [
  // Municipality
  { id: 'counter-1', number: 1, name: 'Sporteli 1', institutionId: 'inst-1', serviceIds: ['serv-1', 'serv-2'], isActive: true },
  { id: 'counter-2', number: 2, name: 'Sporteli 2', institutionId: 'inst-1', serviceIds: ['serv-1', 'serv-3'], isActive: true },
  { id: 'counter-3', number: 3, name: 'Sporteli 3', institutionId: 'inst-1', serviceIds: ['serv-2', 'serv-3'], isActive: false },
  
  // Hospital
  { id: 'counter-4', number: 1, name: 'Kabina 1', institutionId: 'inst-2', serviceIds: ['serv-4'], isActive: true },
  { id: 'counter-5', number: 2, name: 'Kabina 2', institutionId: 'inst-2', serviceIds: ['serv-4'], isActive: true },
  { id: 'counter-6', number: 3, name: 'Laboratori', institutionId: 'inst-2', serviceIds: ['serv-5'], isActive: true },
  { id: 'counter-7', number: 4, name: 'Emergjenca', institutionId: 'inst-2', serviceIds: ['serv-6'], isActive: true },
  
  // ATK
  { id: 'counter-8', number: 1, name: 'Sporteli 1', institutionId: 'inst-3', serviceIds: ['serv-7', 'serv-8'], isActive: true },
  { id: 'counter-9', number: 2, name: 'Sporteli 2', institutionId: 'inst-3', serviceIds: ['serv-8'], isActive: true },
  { id: 'counter-10', number: 3, name: 'Këshillim', institutionId: 'inst-3', serviceIds: ['serv-9'], isActive: true },
];

// Generate mock tickets
export const generateMockTickets = (institutionId: string, count: number = 10): Ticket[] => {
  const tickets: Ticket[] = [];
  const statuses: any[] = ['waiting', 'called', 'serving', 'completed'];
  const priorities: any[] = ['normal', 'elderly', 'emergency', 'disability'];
  
  for (let i = 0; i < count; i++) {
    const service = mockServices.find(s => s.institutionId === institutionId);
    if (!service) continue;
    
    tickets.push({
      id: `ticket-${institutionId}-${i}`,
      number: `${String(i + 1).padStart(3, '0')}`,
      userId: `user-${i}`,
      userName: `Qytetar ${i + 1}`,
      institutionId,
      serviceId: service.id,
      status: i < 3 ? 'waiting' : statuses[Math.floor(Math.random() * statuses.length)],
      priority: i === 0 ? 'emergency' : priorities[Math.floor(Math.random() * priorities.length)],
      qrCode: `QR-${institutionId}-${i}`,
      estimatedWaitTime: (count - i) * 5,
      positionInQueue: i + 1,
      createdAt: new Date(Date.now() - (count - i) * 60000),
      calledAt: i < 5 ? new Date(Date.now() - (count - i - 3) * 60000) : undefined,
      completedAt: i < 3 ? new Date(Date.now() - (count - i - 5) * 60000) : undefined,
    });
  }
  
  return tickets;
};

export const mockAnalytics = {
  peakHoursData: [
    { hour: '08:00', count: 45 },
    { hour: '09:00', count: 78 },
    { hour: '10:00', count: 95 },
    { hour: '11:00', count: 112 },
    { hour: '12:00', count: 85 },
    { hour: '13:00', count: 68 },
    { hour: '14:00', count: 92 },
    { hour: '15:00', count: 87 },
    { hour: '16:00', count: 54 },
  ],
  weeklyData: [
    { day: 'Hënë', visitors: 234 },
    { day: 'Martë', visitors: 189 },
    { day: 'Mërkurë', visitors: 267 },
    { day: 'Enjte', visitors: 298 },
    { day: 'Premte', visitors: 312 },
  ],
  serviceDistribution: [
    { name: 'Dokumente', value: 35 },
    { name: 'Biznes', value: 25 },
    { name: 'Sociale', value: 15 },
    { name: 'Tjera', value: 25 },
  ],
};
