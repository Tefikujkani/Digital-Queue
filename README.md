# SmartQueue Kosova 🇽🇰

Sistem inteligjent për menaxhimin digjital të radhëve dhe termineve për institucione publike dhe private në Kosovë.

## 🎯 Qëllimi

SmartQueue Kosova është një platformë moderne që mundëson:
- ✅ Menaxhim digjital të radhëve në kohë reale
- ✅ Rezervim online të termineve
- ✅ Reduktim të pritjeve fizike
- ✅ Transparencë të procesit
- ✅ Njoftime dhe përditësime live

## 🏛️ Institucione të Mbështetura

- **Komuna** - Shërbime administrative dhe dokumente
- **Spitale** - Konsulta, laboratorë, emergjenca
- **ATK** - Deklarime tatimore dhe pagesa
- **Banka** - Shërbime bankare
- **Universitete** - Shërbime akademike
- **Posta** - Shërbime postare
- **Qendra Studentore** - Bursa, akomodim, kartela

## 🚀 Veçoritë Kryesore

### Për Qytetarët
- 🎫 **Biletë Digjitale** - Merrni numër pa pritje fizike
- 📅 **Rezervim Terminesh** - Planifikoni vizitat tuaja
- 📱 **QR Code** - Skanim i shpejtë për check-in
- 🔔 **Njoftime Live** - Dini kur radha juaj afrohet
- ⏱️ **Kohë të Pritjes** - Shihni sa kohë duhet të pritni
- 📊 **Histori** - Ndiqni të gjitha vizitat tuaja

### Për Administratorët
- 🖥️ **Dashboard** - Kontrollo radhët në kohë reale
- 📞 **Thirrje Automatike** - Thirr numrin tjetër me një klik
- 📈 **Analitika** - Statistika dhe raporte detajuese
- ⏰ **Orët më të Ngarkuara** - Identifiko kohët me trafikun më të lartë
- 👥 **Menaxhim Sportelesh** - Kontrollo sportelet aktive
- 📊 **Performanca** - Monitorimi i efikasitetit

### Veçori Teknike
- 🔄 **Real-time Updates** - Përditësime live të radhës
- 🔐 **JWT Authentication** - Autentikim i sigurt
- 🌐 **Multi-language** - Shqip, Anglisht, Serbisht
- 📱 **Responsive Design** - Funksionon në të gjitha pajisjet
- 🎨 **Modern UI/UX** - Dizajn i pastër dhe intuitiv
- 🔔 **Toast Notifications** - Njoftime të lehta për përdoruesin

## 🛠️ Stack Teknologjik

### Frontend
- ⚛️ **React.js 18.3** - Library modern për UI
- 🎨 **Tailwind CSS v4** - Utility-first CSS framework
- 🔀 **React Router 7** - Navigation dhe routing
- 📊 **Chart.js & Recharts** - Grafikë dhe vizualizime
- 🎯 **React Context API** - State management
- 📱 **QRCode.react** - Gjenerimi i QR kodeve
- 🔔 **Sonner** - Toast notifications

### UI Components
- 🧩 **Radix UI** - Kompponentë të aksesueshëm
- 🎭 **shadcn/ui** - Kompponentë të stilizuar
- 🌙 **next-themes** - Dark/Light mode support
- 🎨 **Lucide React** - Ikona moderne

### Features
- 🔐 **Mock Authentication** - Simulim i JWT auth
- 💾 **LocalStorage** - Ruajtje lokale e të dhënave
- ⏱️ **Real-time Simulation** - Simulim i përditësimeve live
- 📊 **Mock Data** - Të dhëna demo për testim

## 📦 Struktura e Projektit

```
smartqueue-kosova/
├── src/
│   ├── app/
│   │   ├── components/        # Kompponentë React
│   │   │   ├── ui/           # UI kompponentë bazë
│   │   │   └── Navigation.tsx
│   │   ├── contexts/          # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   ├── LanguageContext.tsx
│   │   │   └── QueueContext.tsx
│   │   ├── data/              # Mock data dhe constants
│   │   │   └── mockData.ts
│   │   ├── layouts/           # Layout kompponentë
│   │   │   └── RootLayout.tsx
│   │   ├── pages/             # Faqet e aplikacionit
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── InstitutionsPage.tsx
│   │   │   ├── QueuePage.tsx
│   │   │   ├── AppointmentsPage.tsx
│   │   │   ├── CitizenDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── NotFound.tsx
│   │   ├── types/             # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── App.tsx            # Komponenti kryesor
│   │   └── routes.tsx         # Routing configuration
│   └── styles/                # CSS dhe stilizime
│       ├── theme.css
│       └── fonts.css
└── package.json
```

## 🎮 Si të Përdorni

### 1. Regjistrimi dhe Hyrja

**Për Qytetarë:**
- Shkoni te `/register`
- Zgjidhni "Qytetar"
- Mbushni informacionin (demo: çdo email/password)
- Kyçuni dhe filloni të përdorni platformën

**Për Administratorë:**
- Shkoni te `/register`
- Zgjidhni "Administrator"
- Zgjidhni institucionin tuaj
- Mbushni informacionin (demo: çdo email/password)
- Kyçuni dhe menaxhoni radhët

### 2. Si Qytetar

#### Merrni Biletë Digjitale:
1. Shkoni te "Institucionet"
2. Zgjidhni institucionin e dëshiruar
3. Zgjidhni shërbimin
4. Zgjidhni prioritetin (normal, të moshuar, emergjencë, aftësi të kufizuara)
5. Klikoni "Merr Numër"
6. Shkarkoni QR kodin tuaj
7. Ndiqni radhën në kohë reale

#### Rezervoni Termin:
1. Shkoni te "Termine"
2. Zgjidhni institucionin dhe shërbimin
3. Zgjidhni datën dhe orën
4. Konfirmoni rezervimin
5. Merrni njoftime për terminin tuaj

### 3. Si Administrator

#### Menaxhoni Radhën:
1. Shkoni te Dashboard
2. Zgjidhni sportelin tuaj
3. Shihni radhën live
4. Klikoni "Thirr Tjetrin" për të thirrur numrin tjetër
5. Klikoni "Përfundo Shërbimin" kur mbaroni
6. Monitoroni statistikat dhe analizat

#### Shihni Analitika:
- Orët më të ngarkuara të ditës
- Numri i vizitorëve javor
- Shpërndarja e shërbimeve
- Koha mesatare e pritjes
- Efikasiteti i sporteleve

## 🌐 Mbështetja e Gjuhëve

Aplikacioni mbështet tre gjuhë:
- 🇦🇱 **Shqip** (Gjuha kryesore)
- 🇬🇧 **English**
- 🇷🇸 **Српски** (Serbian)

Ndryshoni gjuhën duke klikuar ikonën e globit në navigacion.

## 🎨 Design System

Aplikacioni përdor një design system modern me:
- **Ngjyra të Qarta** - Paleta ngjyrash profesionale
- **Tailwind CSS** - Utility classes për stilizim të shpejtë
- **Radix UI** - Kompponentë të aksesueshëm
- **Responsive** - Funksionon në desktop, tablet dhe mobile
- **Dark/Light Mode** - Mbështetje për tema të errëta

## 📊 Sistem Prioriteti

Platforma mbështet prioritete të ndryshme:
- 🟢 **Normal** - Radha e rregullt
- 🟡 **Të Moshuar** - Prioritet për personat mbi 65 vjeç
- 🔴 **Emergjencë** - Prioritet maksimal për raste urgjente
- 🔵 **Aftësi të Kufizuara** - Prioritet për persona me nevoja të veçanta

## 🔔 Sistemi i Njoftimeve

- ✅ Njoftime kur merrni numrin
- ⏱️ Njoftime kur radha juaj afrohet
- 📅 Kujtesa për termine
- ✉️ Njoftime për statusin e biletës
- 🔄 Përditësime live të radhës

## 📈 Analitika dhe Raporte

Administratorët mund të shohin:
- 📊 Grafikë të vizitorëve ditorë dhe javor
- ⏰ Orët më të ngarkuara
- 📈 Tendencat e trafikut
- 🎯 Efikasiteti i sporteleve
- 💯 Statistika të përfundimeve

## 🚀 Deployment

Aplikacioni është i gatshëm për deployment në:
- Vercel
- Netlify
- GitHub Pages
- Çdo hosting statik

## 🔮 Veçori të Ardhshme

- 🤖 AI për parashikimin e kohës së pritjes
- 📱 Aplikacion mobile native
- 💬 Chat support
- 📧 Email notifications (me backend real)
- 📲 SMS notifications
- 🗺️ Harta interaktive e institucioneve
- 📊 Raporte më të avancuara
- 🔗 Integrim me API reale
- 🌡️ Heatmap analytics për fluksin e qytetarëve
- 🎯 Optimizim i algoritmit të radhës

## 👥 Rolet e Përdoruesve

### Qytetar
- Merr bileta digjitale
- Rezervon termine
- Shikon histori
- Menaxhon profile

### Admin i Institucionit
- Menaxhon radhët
- Thirr numrat
- Shikon statistika
- Kontrollon sportelet

### Super Admin (e ardhshme)
- Menaxhon institucione
- Krijon përdorues admin
- Shikon statistika globale
- Konfiguron sistemin

## 🎓 Demo Account

Përdorni çfarëdo email dhe password për të testuar aplikacionin.

**Shembuj:**
- Qytetar: `qytetar@test.com` / `demo123`
- Admin: `admin@komuna.gov` / `demo123`

## 📝 Licensa

© 2026 SmartQueue Kosova. Të gjitha të drejtat e rezervuara.

## 🤝 Kontributi

Ky është një projekt demo i ndërtuar për të demonstruar një sistem modern të menaxhimit të radhëve.

## 📧 Kontakt

Për pyetje dhe mbështetje:
- Email: info@smartqueue.gov
- Telefon: +383 XX XXX XXX
- Adresa: Prishtinë, Kosovë

---

**Ndërtuar me ❤️ për qytetarët e Kosovës** 🇽🇰
# kosovoweb
# SmartKosovo
# SmartKosovo
