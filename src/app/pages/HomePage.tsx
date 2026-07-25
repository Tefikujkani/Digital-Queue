import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { io } from 'socket.io-client'
import { Button } from '../components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import type { Institution, Ticket } from '../types'
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
  Ticket as TicketIcon,
  Zap,
  MapPin,
  Search,
} from 'lucide-react'

type WaitLevel = 'low' | 'medium' | 'high'
type LiveTab = 'near' | 'popular' | 'favorites'

const TAB_ORDER: LiveTab[] = ['near', 'popular', 'favorites']

type LiveStation = {
  id: string
  name: string
  city: string
  wait: number
  level: WaitLevel
  waitingCount: number
  distKm: number
  distLabel: string
}

const USER_LOCATION = { lat: 42.6629, lng: 21.1655 }
const FAVORITES_KEY = 'smartqueue_favorites'

const SOCKET_CANDIDATES = [
  (import.meta as any).env?.VITE_SOCKET_URL as string | undefined,
  'http://localhost:5001',
  'http://localhost:5000',
].filter(Boolean) as string[]

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function waitLevel(wait: number): WaitLevel {
  if (wait < 20) return 'low'
  if (wait < 40) return 'medium'
  return 'high'
}

function greetingKey(hour: number) {
  if (hour < 12) return 'home.greeting.morning'
  if (hour < 18) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}

function AnimatedWait({ value }: { value: number }) {
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { stiffness: 120, damping: 18 })
  const display = useTransform(spring, (v) => Math.round(v))
  const [text, setText] = useState(String(value))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    return display.on('change', (v) => setText(String(v)))
  }, [display])

  return <span>{text}</span>
}

function buildLiveStations(institutions: Institution[], tickets: Ticket[]): LiveStation[] {
  return institutions.map((inst, index) => {
    const id = String(inst.id || (inst as any)._id)
    const waiting = tickets.filter(
      (t) =>
        String(t.institutionId) === id &&
        (t.status === 'waiting' || t.status === 'called' || t.status === 'serving'),
    )
    const avgService =
      inst.services?.length > 0
        ? Math.round(
            inst.services.reduce((sum, s) => sum + (s.estimatedTime || 5), 0) / inst.services.length,
          )
        : 5
    const wait = waiting.length === 0 ? avgService : waiting.length * avgService
    const lat = inst.location?.lat ?? USER_LOCATION.lat + (index % 5) * 0.02
    const lng = inst.location?.lng ?? USER_LOCATION.lng + (index % 4) * 0.02
    const distKm = haversineKm(USER_LOCATION, { lat, lng })

    return {
      id,
      name: inst.name,
      city: inst.location?.city || inst.city || '',
      wait,
      level: waitLevel(wait),
      waitingCount: waiting.filter((t) => t.status === 'waiting').length,
      distKm,
      distLabel: `${distKm.toFixed(1)} km`,
    }
  })
}

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const [cities, setCities] = useState<{ name: string; count: number }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const cityRes = await api.get('/citizen/cities')
        setCities((cityRes.data?.cities || []).slice(0, 6))
      } catch {
        /* keep empty */
      }
    }
    load()
  }, [])

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loadingLive, setLoadingLive] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<LiveTab>('near')
  const [tabPausedUntil, setTabPausedUntil] = useState(0)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [isLive, setIsLive] = useState(false)

  const selectTab = (next: LiveTab, manual = false) => {
    setTab(next)
    if (manual) {
      setTabPausedUntil(Date.now() + 20_000)
    }
  }

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
      title: t('features.qr'),
      description: t('features.qrDesc'),
    },
  ]

  const steps = [
    {
      num: '01',
      title: t('home.step1.title'),
      desc: t('home.step1.desc'),
      icon: MapPin,
    },
    {
      num: '02',
      title: t('home.step2.title'),
      desc: t('home.step2.desc'),
      icon: TicketIcon,
    },
    {
      num: '03',
      title: t('home.step3.title'),
      desc: t('home.step3.desc'),
      icon: QrCode,
    },
  ]

  const fetchLiveData = async () => {
    try {
      const [instRes, ticketRes] = await Promise.all([
        api.get('/institutions'),
        api.get('/tickets'),
      ])
      setInstitutions(instRes.data || [])
      setTickets(ticketRes.data || [])
    } catch (error) {
      console.error('Failed to load live queues:', error)
    } finally {
      setLoadingLive(false)
    }
  }

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 20000)
    return () => clearInterval(interval)
  }, [])

  // Auto-switch Near me → Popular → Favorites every 20 seconds
  useEffect(() => {
    const rotate = setInterval(() => {
      if (Date.now() < tabPausedUntil) return

      setTab((current) => {
        let idx = TAB_ORDER.indexOf(current)
        for (let step = 0; step < TAB_ORDER.length; step++) {
          idx = (idx + 1) % TAB_ORDER.length
          const next = TAB_ORDER[idx]
          // Skip Favorites when empty so the list still shows live data
          if (next === 'favorites' && favorites.length === 0) continue
          return next
        }
        return 'near'
      })
      fetchLiveData()
    }, 20_000)

    return () => clearInterval(rotate)
  }, [favorites.length, tabPausedUntil])

  useEffect(() => {
    let cancelled = false
    let currentIndex = 0
    let activeSocket = io(SOCKET_CANDIDATES[currentIndex], {
      transports: ['websocket'],
      reconnection: false,
    })

    const bind = (s: ReturnType<typeof io>) => {
      s.on('connect', () => {
        if (!cancelled) setIsLive(true)
      })
      s.on('disconnect', () => {
        if (!cancelled) setIsLive(false)
      })
      s.on('connect_error', () => {
        if (cancelled) return
        if (currentIndex < SOCKET_CANDIDATES.length - 1) {
          currentIndex += 1
          s.close()
          activeSocket = io(SOCKET_CANDIDATES[currentIndex], {
            transports: ['websocket'],
            reconnection: false,
          })
          bind(activeSocket)
        } else {
          setIsLive(false)
        }
      })
      s.on('new_ticket', (ticket: Ticket) => {
        setTickets((prev) => {
          const id = String((ticket as any)._id || ticket.id)
          if (prev.some((t) => String((t as any)._id || t.id) === id)) return prev
          return [...prev, ticket]
        })
      })
      s.on('ticket_updated', (updated: Ticket) => {
        const id = String((updated as any)._id || updated.id)
        setTickets((prev) =>
          prev.map((t) => (String((t as any)._id || t.id) === id ? updated : t)),
        )
      })
    }

    bind(activeSocket)

    return () => {
      cancelled = true
      activeSocket.close()
    }
  }, [])

  const stations = useMemo(
    () => buildLiveStations(institutions, tickets),
    [institutions, tickets],
  )

  const visibleStations = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = stations.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
    )

    if (tab === 'favorites') {
      list = list.filter((s) => favorites.includes(s.id))
    } else if (tab === 'popular') {
      list = [...list].sort((a, b) => b.waitingCount - a.waitingCount || b.wait - a.wait)
    } else {
      list = [...list].sort((a, b) => a.distKm - b.distKm)
    }

    return list.slice(0, 3)
  }, [stations, search, tab, favorites])

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  const tabs: { id: LiveTab; label: string }[] = [
    { id: 'near', label: t('home.nearMe') },
    { id: 'popular', label: t('home.popular') },
    { id: 'favorites', label: t('home.favorites') },
  ]

  return (
    <div className="min-h-screen">
      <section className="relative min-h-[88vh] flex items-center px-5 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-background" />
          <motion.div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[120px]"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
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
              <motion.div
                className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center glow-primary"
                animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.35)', '0 0 36px rgba(124,58,237,0.55)', '0 0 20px rgba(124,58,237,0.35)'] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <TicketIcon className="w-7 h-7 text-white" />
              </motion.div>
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

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <motion.div
              className="surface-card rounded-3xl p-6 relative overflow-hidden"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl" />

              <div className="flex items-center justify-between mb-6 relative">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {t(greetingKey(new Date().getHours()))}
                  </p>
                  <p className="font-semibold text-lg">{t('home.liveQueues')}</p>
                </div>
                <motion.div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full wait-low text-xs font-semibold"
                  animate={{ scale: isLive ? [1, 1.04, 1] : 1 }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-success' : 'bg-muted-foreground'} ${isLive ? 'animate-pulse' : ''}`}
                  />
                  {t('home.live')}
                </motion.div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('home.searchPlaceholder')}
                  className="w-full h-12 rounded-2xl bg-muted/80 border border-white/6 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
                />
              </div>

              <div className="flex gap-2 mb-5">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id, true)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      tab === item.id
                        ? 'btn-gradient text-white glow-primary-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3 min-h-[220px]">
                {loadingLive ? (
                  [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[72px] rounded-2xl bg-white/[0.04] border border-white/6 animate-pulse"
                    />
                  ))
                ) : visibleStations.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                    {t('home.noLiveData')}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {visibleStations.map((s, i) => (
                      <motion.div
                        key={s.id}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.35, delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/6 hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/queue/${s.id}`)}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(s.id)
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <motion.div
                            className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"
                            whileHover={{ scale: 1.06 }}
                          >
                            <Building2 className="w-5 h-5 text-primary" />
                          </motion.div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.distLabel} {t('home.away')}
                              {favorites.includes(s.id) ? ' · ★' : ''}
                            </p>
                          </div>
                        </div>
                        <motion.span
                          key={`${s.id}-${s.wait}-${s.level}`}
                          initial={{ scale: 0.9, opacity: 0.6 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ml-3 ${
                            s.level === 'low'
                              ? 'wait-low'
                              : s.level === 'medium'
                                ? 'wait-medium'
                                : 'wait-high'
                          }`}
                        >
                          <AnimatedWait value={s.wait} /> min · {t(`wait.${s.level}`)}
                        </motion.span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              <Button className="w-full mt-5 h-12" onClick={() => navigate('/institutions')}>
                {t('home.reserveSlot')}
                <Zap className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Kosovo cities */}
      <section className="py-10 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-5 gap-4">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-2">
                {t('home.citiesEyebrow')}
              </p>
              <h2 className="text-2xl font-bold">{t('home.citiesTitle')}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/cities')}>
              {t('home.allCities')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {cities.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => navigate(`/institutions?city=${encodeURIComponent(c.name)}`)}
                className="shrink-0 px-5 py-3 rounded-2xl surface-card hover:border-primary/40 text-left min-w-[140px]"
              >
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t('home.institutionCount', { n: c.count })}
                </p>
              </button>
            ))}
            {!cities.length && (
              <p className="text-sm text-muted-foreground">{t('home.loadingCities')}</p>
            )}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-12 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: t('home.stat.institutions'),
                value: institutions.length || `${cities.reduce((s, c) => s + c.count, 0) || '50'}+`,
                icon: Building2,
              },
              { label: t('home.stat.users'), value: '10K+', icon: Users },
              {
                label: t('home.stat.waiting'),
                value: tickets.filter((tk) => tk.status === 'waiting').length,
                icon: CheckCircle2,
              },
              { label: t('home.stat.timeSaved'), value: '1M+ min', icon: TrendingUp },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="surface-card rounded-2xl p-5 text-center hover:border-primary/30 transition-colors"
              >
                <s.icon className="w-5 h-5 text-primary mx-auto mb-3" />
                <div className="text-2xl md:text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {t('home.featuresEyebrow')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('home.features')}</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              {t('home.featuresSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="surface-card rounded-2xl p-6 hover:border-primary/35 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:glow-primary-sm transition-all">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {t('home.howItWorksEyebrow')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">{t('home.howItWorks')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center p-8"
              >
                <div className="w-16 h-16 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-6 glow-primary-sm">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-xs text-primary font-bold tracking-widest mb-2">
                  {t('home.stepLabel')} {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-14 -right-3 w-6 h-px bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-center border border-primary/30">
            <div className="absolute inset-0 btn-gradient opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.2),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                {t('home.ctaTitle')}
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8 text-sm md:text-base">
                {t('home.ctaBody')}
              </p>
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 glow-primary border-0 h-14 px-10"
                onClick={() => navigate(isAuthenticated ? '/institutions' : '/register')}
              >
                {t('home.ctaRegister')}
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
