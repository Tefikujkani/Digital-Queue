import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Institution from '../models/Institution.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './.env' });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB for seeding...');

    await Institution.deleteMany();
    await Counter.deleteMany();
    await User.deleteMany();
    
    console.log('🧹 Cleared existing data...');

    await User.create({
      name: 'Super Admin',
      email: 'admin@smartqueue.com',
      password: 'admin123',
      role: 'superadmin',
      phone: '+38344000000'
    });

    const institutions = [
      // Municipalities
      {
        name: 'Komuna e Prishtinës - Qendra për Pajisje me Dokumente',
        type: 'municipality',
        location: { address: 'Luan Haradinaj', city: 'Prishtinë', lat: 42.6629, lng: 21.1655 },
        contact: { phone: '038 200 400', email: 'info@prishtina.org', website: 'prishtinaonline.com' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Letërnjoftim & Pasaportë', description: 'Aplikim dhe tërheqje e dokumenteve personale', estimatedTime: 15 },
          { name: 'Gjendja Civile', description: 'Certifikata të lindjes, martesës, etj.', estimatedTime: 10 },
          { name: 'Regjistrim i Automjeteve', description: 'Regjistrim dhe vazhdim i automjeteve', estimatedTime: 25 },
        ]
      },
      {
        name: 'Komuna e Prizrenit',
        type: 'municipality',
        location: { address: 'Shatërvan', city: 'Prizren', lat: 42.2300, lng: 20.7415 },
        contact: { phone: '038 200 401', email: 'info@prizreni.org', website: 'kk.rks-gov.net/prizren' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Ofiqaria', description: 'Certifikata, Kurorëzime', estimatedTime: 12 },
          { name: 'Tatimi në Pronë', description: 'Pagesa', estimatedTime: 10 }
        ]
      },
      {
        name: 'Komuna e Gjilanit',
        type: 'municipality',
        location: { address: 'Bulevardi i Pavarësisë', city: 'Gjilan', lat: 42.4635, lng: 21.4694 },
        contact: { phone: '038 200 402', email: 'info@gjilani.org', website: 'kk.rks-gov.net/gjilan' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Gjendja Civile', description: 'Certifikata', estimatedTime: 10 },
          { name: 'Drejtoria e Urbanizmit', description: 'Leje ndërtimi', estimatedTime: 25 }
        ]
      },
      {
        name: 'Komuna e Pejës',
        type: 'municipality',
        location: { address: 'Skenderbeu', city: 'Pejë', lat: 42.6590, lng: 20.2883 },
        contact: { phone: '038 200 403', email: 'info@peja.org', website: 'kk.rks-gov.net/peja' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Gjendja Civile', description: 'Certifikata, letërnjoftime', estimatedTime: 15 },
          { name: 'Kuvendi Komunal', description: 'Aplikime për grante', estimatedTime: 20 }
        ]
      },
      {
        name: 'Komuna e Mitrovicës',
        type: 'municipality',
        location: { address: 'Agim Hajrizi', city: 'Mitrovicë', lat: 42.8914, lng: 20.8660 },
        contact: { phone: '038 200 404', email: 'info@mitrovica.org', website: 'kk.rks-gov.net/mitrovice' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Tatimi në Pronë', description: 'Faturat dhe vërtetimet', estimatedTime: 10 },
          { name: 'Qendra për Punë Sociale', description: 'Ndihmat dhe këshillimi', estimatedTime: 30 }
        ]
      },

      // Hospitals / Health
      {
        name: 'Qendra Klinike Universitare e Kosovës (QKUK)',
        type: 'hospital',
        location: { address: 'Rrethi i Spitalit', city: 'Prishtinë', lat: 42.6456, lng: 21.1627 },
        contact: { phone: '038 500 600', email: 'qkuk@rks-gov.net', website: 'shskuk.rks-gov.net' },
        workingHours: { open: '07:00', close: '20:00' },
        services: [
          { name: 'Emergjenca', description: 'Ndihma e parë dhe raste urgjente', estimatedTime: 5 },
          { name: 'Laboratori Qendror', description: 'Marrja e mostrave dhe analizat', estimatedTime: 10 },
          { name: 'Radiologjia (CT / MRI)', description: 'Skanime dhe rëntgen', estimatedTime: 30 },
        ]
      },
      {
        name: 'Spitali Rajonal i Pejës',
        type: 'hospital',
        location: { address: 'Rruga Nëna Terezë', city: 'Pejë', lat: 42.6610, lng: 20.2883 },
        contact: { phone: '039 432 100', email: 'spitalipeje@rks-gov.net', website: 'shskuk.rks-gov.net/peja' },
        workingHours: { open: '00:00', close: '24:00' },
        services: [
          { name: 'Emergjenca', description: 'Raste urgjente (24h)', estimatedTime: 5 },
          { name: 'Ambulanca Specialistike', description: 'Kontrolla mujore', estimatedTime: 20 }
        ]
      },
      {
        name: 'Spitali Rajonal i Prizrenit',
        type: 'hospital',
        location: { address: 'Bulevardi i Dëshmorëve', city: 'Prizren', lat: 42.2280, lng: 20.7380 },
        contact: { phone: '029 222 222', email: 'spitaliprizren@rks-gov.net', website: 'shskuk.rks-gov.net/prizren' },
        workingHours: { open: '00:00', close: '24:00' },
        services: [
          { name: 'Pediatria', description: 'Vizita për fëmijë', estimatedTime: 15 },
          { name: 'Kirurgjia', description: 'Konsultime pre-operative', estimatedTime: 25 }
        ]
      },

      // Banks
      {
        name: 'ProCredit Bank - Dega Kryesore',
        type: 'bank',
        location: { address: 'Sheshi Nënë Tereza', city: 'Prishtinë', lat: 42.6631, lng: 21.1645 },
        contact: { phone: '038 555 555', email: 'info@procreditbank-kos.com', website: 'procreditbank-kos.com' },
        workingHours: { open: '08:30', close: '16:30' },
        services: [
          { name: 'Shërbime për Klientë Individualë', description: 'Hapje llogarie, kartela', estimatedTime: 15 },
          { name: 'Këshilltar i Biznesit', description: 'Shërbime për biznese', estimatedTime: 35 },
        ]
      },
      {
        name: 'Raiffeisen Bank Kosova',
        type: 'bank',
        location: { address: 'Rruga UÇK', city: 'Prishtinë', lat: 42.6640, lng: 21.1620 },
        contact: { phone: '038 222 222', email: 'info@raiffeisen-kosovo.com', website: 'raiffeisen-kosovo.com' },
        workingHours: { open: '08:30', close: '16:30' },
        services: [
          { name: 'Llogari dhe Kartela', description: 'Hapje llogarish', estimatedTime: 15 },
          { name: 'Aplikim për Kredi', description: 'Kredi personale', estimatedTime: 30 }
        ]
      },
      {
        name: 'NLB Banka',
        type: 'bank',
        location: { address: 'Bulevardi Dëshmorët e Kombit', city: 'Prishtinë', lat: 42.6580, lng: 21.1560 },
        contact: { phone: '038 240 240', email: 'info@nlb-kos.com', website: 'nlb-kos.com' },
        workingHours: { open: '08:30', close: '16:00' },
        services: [
          { name: 'Kredi Konsumuese', description: 'Kredi të shpejta', estimatedTime: 20 },
          { name: 'E-Banking', description: 'Aktivizimi i shërbimeve online', estimatedTime: 10 }
        ]
      },
      {
        name: 'TEB Banka',
        type: 'bank',
        location: { address: 'Agim Ramadani', city: 'Prishtinë', lat: 42.6600, lng: 21.1630 },
        contact: { phone: '038 230 000', email: 'info@teb-kos.com', website: 'teb-kos.com' },
        workingHours: { open: '08:30', close: '16:30' },
        services: [
          { name: 'StarCard', description: 'Aplikim për kredit kartelë', estimatedTime: 15 },
          { name: 'Kredi për Biznese', description: 'Këshillime dhe aplikime', estimatedTime: 30 }
        ]
      },

      // Ministries / Government
      {
        name: 'Administrata Tatimore e Kosovës (ATK)',
        type: 'ministry',
        location: { address: 'Bulevardi Bill Clinton', city: 'Prishtinë', lat: 42.6560, lng: 21.1540 },
        contact: { phone: '0800 80000', email: 'info@atk-ks.org', website: 'atk-ks.org' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Deklarimi i Tatimeve', description: 'Deklarim i TVSH', estimatedTime: 20 },
          { name: 'Vërtetim Tatimor', description: 'Lëshimi i vërtetimeve', estimatedTime: 10 }
        ]
      },
      {
        name: 'Ministria e Punëve të Brendshme (MPB)',
        type: 'ministry',
        location: { address: 'Luan Haradinaj', city: 'Prishtinë', lat: 42.6625, lng: 21.1650 },
        contact: { phone: '038 200 190', email: 'mpb@rks-gov.net', website: 'mpb.rks-gov.net' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Nënshtetësia', description: 'Aplikimi për shtetësi të Kosovës', estimatedTime: 30 },
          { name: 'Apostile', description: 'Vulosja e dokumenteve me vulë Apostile', estimatedTime: 15 }
        ]
      },
      {
        name: 'Ministria e Arsimit (MAShTI)',
        type: 'ministry',
        location: { address: 'Agim Ramadani', city: 'Prishtinë', lat: 42.6610, lng: 21.1630 },
        contact: { phone: '038 200 200', email: 'mashti@rks-gov.net', website: 'masht.rks-gov.net' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Nostrifikimi i Diplomave', description: 'Njohja e diplomave ndërkombëtare', estimatedTime: 25 },
          { name: 'Licencimi i Mësimdhënësve', description: 'Aplikimi për licencë', estimatedTime: 20 }
        ]
      },

      // Universities
      {
        name: 'Universiteti i Prishtinës "Hasan Prishtina"',
        type: 'university',
        location: { address: 'George Bush', city: 'Prishtinë', lat: 42.6575, lng: 21.1600 },
        contact: { phone: '038 244 183', email: 'rektorati@uni-pr.edu', website: 'uni-pr.edu' },
        workingHours: { open: '08:00', close: '15:00' },
        services: [
          { name: 'Shërbimi i Studentëve', description: 'Vërtetime, transkripta, pagesa', estimatedTime: 15 },
          { name: 'Diplomimi', description: 'Dorëzimi i temës dhe certifikata', estimatedTime: 20 }
        ]
      },
      {
        name: 'Kolegji AAB',
        type: 'university',
        location: { address: 'Zona Industriale', city: 'Fushë Kosovë', lat: 42.6370, lng: 21.1200 },
        contact: { phone: '038 600 000', email: 'info@aab-edu.net', website: 'aab-edu.net' },
        workingHours: { open: '08:00', close: '18:00' },
        services: [
          { name: 'Regjistrimi', description: 'Regjistrimi i studentëve të rinj', estimatedTime: 20 },
          { name: 'Financat', description: 'Pagesa e semestrave', estimatedTime: 10 }
        ]
      },
      {
        name: 'UBT College',
        type: 'university',
        location: { address: 'Kalabria', city: 'Prishtinë', lat: 42.6450, lng: 21.1500 },
        contact: { phone: '038 541 400', email: 'info@ubt-uni.net', website: 'ubt-uni.net' },
        workingHours: { open: '08:00', close: '18:00' },
        services: [
          { name: 'Zyra e Studentëve', description: 'Dokumente dhe vërtetime', estimatedTime: 10 },
          { name: 'Këshillimi për Karrierë', description: 'Takime për orientim', estimatedTime: 25 }
        ]
      },

      // Utilities / Posts
      {
        name: 'Posta e Kosovës - Dega Qendër',
        type: 'post',
        location: { address: 'Rruga UÇK', city: 'Prishtinë', lat: 42.6645, lng: 21.1610 },
        contact: { phone: '038 222 333', email: 'info@postakosoves.com', website: 'postakosoves.com' },
        workingHours: { open: '08:00', close: '18:00' },
        services: [
          { name: 'Dërgesa & Pako', description: 'Pranimi dhe dërgimi i pakove', estimatedTime: 10 },
          { name: 'Pagesa të Faturave', description: 'Rrymë, Ujë, Mbeturina, Tatim', estimatedTime: 5 }
        ]
      },
      {
        name: 'KEDS / KESCO',
        type: 'utility',
        location: { address: 'Bulevardi Bill Clinton', city: 'Prishtinë', lat: 42.6565, lng: 21.1550 },
        contact: { phone: '0800 79100', email: 'info@kesco-energy.com', website: 'kesco-energy.com' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Ankesa dhe Fatura', description: 'Korrigjim faturash dhe pagesa', estimatedTime: 15 },
          { name: 'Lidhje e re', description: 'Aplikim për njehsor të ri', estimatedTime: 30 }
        ]
      },
      {
        name: 'KUR Prishtina (Ujësjellësi)',
        type: 'utility',
        location: { address: 'Tahir Zajmi', city: 'Prishtinë', lat: 42.6450, lng: 21.1600 },
        contact: { phone: '0800 90000', email: 'info@kur-prishtina.com', website: 'kur-prishtina.com' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Faturimi', description: 'Printim i faturave dhe reklamacione', estimatedTime: 10 },
          { name: 'Lidhje në Rrjet', description: 'Aplikim për lidhje të ujit', estimatedTime: 25 }
        ]
      },

      // Courts & Embassies
      {
        name: 'Gjykata Themelore Prishtinë',
        type: 'court',
        location: { address: 'Pallati i Drejtësisë', city: 'Prishtinë', lat: 42.6400, lng: 21.1800 },
        contact: { phone: '038 200 170', email: 'gjykatapr@rks-gov.net', website: 'gjykatat.rks-gov.net' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Vërtetime Penale', description: 'Vërtetim që nuk jeni nën hetime', estimatedTime: 10 },
          { name: 'Dorëzimi i Padive', description: 'Protokolli dhe parashtresat', estimatedTime: 15 }
        ]
      },
      {
        name: 'Ambasada e Gjermanisë',
        type: 'embassy',
        location: { address: 'Azem Jashanica', city: 'Prishtinë', lat: 42.6580, lng: 21.1500 },
        contact: { phone: '038 254 500', email: 'info@pristina.diplo.de', website: 'pristina.diplo.de' },
        workingHours: { open: '08:00', close: '12:00' },
        services: [
          { name: 'Viza Pune', description: 'Aplikimi dhe intervista për viza pune', estimatedTime: 20 },
          { name: 'Bashkim Familjar', description: 'Aplikimi për bashkim familjar', estimatedTime: 30 },
          { name: 'Vërtetime dhe Noterizime', description: 'Përkthime dhe legalizime', estimatedTime: 15 }
        ]
      },
      {
        name: 'Ambasada e Zvicrës',
        type: 'embassy',
        location: { address: 'Adrian Krasniqi', city: 'Prishtinë', lat: 42.6600, lng: 21.1680 },
        contact: { phone: '038 248 088', email: 'pristina@eda.admin.ch', website: 'eda.admin.ch/pristina' },
        workingHours: { open: '08:00', close: '11:00' },
        services: [
          { name: 'Viza Schengen', description: 'Aplikim turistik dhe biznes', estimatedTime: 15 },
          { name: 'Shërbime Konsullore', description: 'Pasaporta për shtetasit zviceranë', estimatedTime: 20 }
        ]
      },
      {
        name: 'Qendra e Regjistrimit të Automjeteve (QRA) - Prishtinë',
        type: 'ministry',
        location: { address: 'Zona Industriale', city: 'Fushë Kosovë', lat: 42.6350, lng: 21.1100 },
        contact: { phone: '038 200 195', email: 'qra.prishtina@rks-gov.net', website: 'mpb.rks-gov.net' },
        workingHours: { open: '08:00', close: '16:00' },
        services: [
          { name: 'Vazhdimi i Regjistrimit', description: 'Për të gjitha mjetet motorike', estimatedTime: 15 },
          { name: 'Ndërrimi i Pronarit', description: 'Kontrata dhe transferi', estimatedTime: 25 },
          { name: 'Targat (KS/RKS)', description: 'Pajisja me targa të reja', estimatedTime: 20 }
        ]
      }
    ];

    const createdInstitutions = await Institution.insertMany(institutions);
    console.log(`✅ Created ${createdInstitutions.length} institutions with advanced data`);

    const counters = [];
    const admins = [];

    for (let i = 0; i < createdInstitutions.length; i++) {
      const inst = createdInstitutions[i];
      
      const admin = await User.create({
        name: `Admin ${inst.name.substring(0, 10)}`,
        email: `admin${i}@smartqueue.com`,
        password: 'admin123',
        role: 'admin',
        institutionId: inst._id,
        phone: '+38344000000'
      });
      admins.push(admin);

      counters.push(
        { number: 1, name: 'Sporteli 1 - Shërbime të Shpejta', institutionId: inst._id, isActive: true },
        { number: 2, name: 'Sporteli 2 - Shërbime Gjenerale', institutionId: inst._id, isActive: true },
        { number: 3, name: 'Sporteli 3 - Përparësi / VIP', institutionId: inst._id, isActive: true }
      );
    }

    await Counter.insertMany(counters);
    console.log(`✅ Created ${counters.length} counters`);
    console.log(`✅ Created ${admins.length} institution admins`);

    console.log('🌟 Extended Seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error(`❌ Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

seedData();
