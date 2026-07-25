import React from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Button } from '../components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import {
  Clock,
  Calendar,
  Bell,
  BarChart3,
  Shield,
  QrCode,
  Building2,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Users,
  Ticket,
  Zap,
  MapPin,
} from 'lucide-react'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()

  const features = [
    {
      icon: Clock,
      title: t('features.digital'),
      description: t('features.digitalDesc'),
    },
    {
      icon: Calendar,
      title: t('features.appointments'),
      description: t('features.appointmentsDesc'),
    },
    {
      icon: Bell,
      title: t('features.notifications'),
      description: t('features.notificationsDesc'),
    },
    {
      icon: BarChart3,
      title: t('features.analytics'),
      description: t('features.analyticsDesc'),
    },
    {
      icon: Shield,
      title: t('features.priority'),
      description: t('features.priorityDesc'),
    },
    {
      icon: QrCode,
      title: 'QR Check-in',
      description: 'Skanim i lehtë për check-in të shpejtë dhe verifikim të menjëhershëm.',
    },
  ]

  const steps = [
    {
      num: '01',
      title: 'Zgjidhni Institucionin',
      desc: 'Shihni kohën e pritjes live dhe zgjidhni institucionin më të afërt.',
      icon: MapPin,
    },
    {
      num: '02',
      title: 'Rezervoni Slotin',
      desc: 'Merrni numër digjital ose rezervoni një orar 15-minutësh.',
      icon: Ticket,
    },
    {
      num: '03',
      title: 'Skanoni QR-në',
      desc: 'Arrini në kohë, skanoni kodin dhe anashkaloni radhën fizike.',
      icon: QrCode,
    },
  ]

  const liveStations = [
    { name: 'Komuna e Prishtinës', wait: 12, level: 'low', dist: '0.8 km' },
    { name: 'QKUK — Ambulanca', wait: 35, level: 'medium', dist: '1.4 km' },
    { name: 'ATK Prishtinë', wait: 52, level: 'high', dist: '2.1 km' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero — one composition */}
      <section className="relative min-h-[88vh] flex items-center px-5 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-background" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-16 lg:py-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center glow-primary animate-pulse-glow">
                <Ticket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none">
                  SmartQueue
                </h1>
                <p className="text-primary text-xs font-semibold uppercase tracking-[0.25em] mt-1">
                  Kosova
                </p>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.1] mb-5"
            >
              {t('home.title')}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18 }}
              className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed mb-9"
            >
              {t('home.description')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.26 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                onClick={() =>
                  isAuthenticated ? navigate('/institutions') : navigate('/login')
                }
              >
                {t('home.getStarted')}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/institutions')}>
                {t('nav.institutions')}
              </Button>
            </motion.div>
          </div>

          {/* Live preview panel — visual anchor */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="surface-card rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl" />
              <div className="flex items-center justify-between mb-6 relative">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Mirëmëngjes</p>
                  <p className="font-semibold text-lg">Radhët Live</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full wait-low text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="w-full h-12 rounded-2xl bg-muted/80 border border-white/6 pl-11 pr-4 flex items-center text-sm text-muted-foreground">
                  Kërko institucion ose qytet...
                </div>
              </div>

              <div className="flex gap-2 mb-5">
                {['Afër meje', 'Popullore', 'Favorite'].map((tab, i) => (
                  <span
                    key={tab}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                      i === 0
                        ? 'btn-gradient text-white glow-primary-sm'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                {liveStations.map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/6 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.dist} larg</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                        s.level === 'low'
                          ? 'wait-low'
                          : s.level === 'medium'
                            ? 'wait-medium'
                            : 'wait-high'
                      }`}
                    >
                      {s.wait} min · {t(`wait.${s.level}`)}
                    </span>
                  </motion.div>
                ))}
              </div>

              <Button className="w-full mt-5 h-12" onClick={() => navigate('/institutions')}>
                Rezervo Slot
                <Zap className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-12 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Institucione', value: '50+', icon: Building2 },
              { label: 'Përdorues Aktivë', value: '10K+', icon: Users },
              { label: 'Bileta të Dhëna', value: '250K+', icon: CheckCircle2 },
              { label: 'Kohë e Kursyer', value: '1M+ min', icon: TrendingUp },
            ].map((s, i) => (
              <div
                key={i}
                className="surface-card rounded-2xl p-5 text-center hover:border-primary/30 transition-colors"
              >
                <s.icon className="w-5 h-5 text-primary mx-auto mb-3" />
                <div className="text-2xl md:text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
              Veçoritë
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('home.features')}</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              Teknologjia më e fundit për të menaxhuar kohën tuaj në mënyrë efikase.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="surface-card rounded-2xl p-6 hover:border-primary/35 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:glow-primary-sm transition-all">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
              Si funksionon
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">{t('home.howItWorks')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center p-8">
                <div className="w-16 h-16 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-6 glow-primary-sm">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs text-primary font-bold tracking-widest mb-2">
                  HAPI {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-14 -right-3 w-6 h-px bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-center border border-primary/30">
            <div className="absolute inset-0 btn-gradient opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.2),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Gati për të kursyer kohë?
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8 text-sm md:text-base">
                Bashkohuni me mijëra qytetarë që kanë modernizuar përvojën e tyre me shërbimet
                publike.
              </p>
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 glow-primary border-0 h-14 px-10"
                onClick={() => navigate(isAuthenticated ? '/institutions' : '/register')}
              >
                Regjistrohu Falas
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
