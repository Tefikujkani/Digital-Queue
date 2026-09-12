import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { io } from 'socket.io-client'
import { Button } from '../components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { FALLBACK_CITIES, FALLBACK_INSTITUTIONS } from '../lib/offlineData'
import type { Institution } from '../types'
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
  Download,
} from 'lucide-react'
import DownloadApp from '../components/DownloadApp'

type WaitLevel = 'low' | 'medium' | 'high'
type LiveTab = 'near' | 'popular' | 'favorites'

const TAB_ORDER: LiveTab[] = ['near', 'popular', 'favorites']

type WaitStat = {
  waiting?: number
  estimatedWaitMinutes?: number
  load?: WaitLevel
}

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

function buildLiveStations(
  institutions: Institution[],
  waitMap: Record<string, WaitStat>,
): LiveStation[] {
  return institutions.map((inst, index) => {
    const id = String(inst.id || (inst as any)._id)
    const stat = waitMap[id] || {}
    const avgService =
      inst.services?.length > 0
        ? Math.round(
            inst.services.reduce((sum, s) => sum + (s.estimatedTime || 5), 0) / inst.services.length,
          )
        : 5
    const waitingCount = stat.waiting || 0
    const wait =
      stat.estimatedWaitMinutes && stat.estimatedWaitMinutes > 0
        ? stat.estimatedWaitMinutes
        : Math.max(avgService, waitingCount * avgService)
    const lat = inst.location?.lat ?? USER_LOCATION.lat + (index % 5) * 0.02
    const lng = inst.location?.lng ?? USER_LOCATION.lng + (index % 4) * 0.02
    const distKm = haversineKm(USER_LOCATION, { lat, lng })

    return {
      id,
      name: inst.name,
      city: inst.location?.city || inst.city || '',
      wait,
      level: stat.load || waitLevel(wait),
      waitingCount,
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
        setCities(FALLBACK_CITIES)
      }
    }
    load()
  }, [])

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [waitMap, setWaitMap] = useState<Record<string, WaitStat>>({})
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
      const instRes = await api.get('/institutions')
      const list: Institution[] = Array.isArray(instRes.data) ? instRes.data : []
      setInstitutions(list)
      const ids = list
        .map((inst) => String(inst.id || (inst as any)._id || ''))
        .filter(Boolean)
        .slice(0, 50)
        .join(',')
      if (ids) {
        const statsRes = await api.get('/citizen/wait-stats', { params: { ids } }).catch(() => ({
          data: {},
        }))
        setWaitMap(statsRes.data || {})
      }
    } catch (error) {
      console.error('Failed to load live queues:', error)
      setInstitutions((prev) => (prev.length ? prev : FALLBACK_INSTITUTIONS))
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
      s.on('new_ticket', () => {
        fetchLiveData()
      })
      s.on('ticket_updated', () => {
        fetchLiveData()
      })
    }

    bind(activeSocket)

    return () => {
      cancelled = true
      activeSocket.close()
    }
  }, [])

  const stations = useMemo(
    () => buildLiveStations(institutions, waitMap),
    [institutions, waitMap],
  )
  const waitingTotal = Object.values(waitMap).reduce((sum, row) => sum + (row.waiting || 0), 0)

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
      <section className="relative overflow-hidden bg-white">
        <div className="gov-skyline absolute inset-x-0 bottom-0 h-24 sm:h-36 opacity-50 sm:opacity-70 pointer-events-none hidden sm:block" />
        <div className="container mx-auto max-w-6xl relative z-10 px-4 sm:px-5 pt-5 pb-10 sm:pt-8 sm:pb-14 lg:pt-14 lg:pb-24">
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs sm:text-sm font-semibold text-primary mb-2 sm:mb-3"
          >
            SmartQueue {t('brand.region')}
          </motion.p>
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="text-[1.65rem] sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold text-primary max-w-3xl leading-[1.2]"
          >
            {t('home.title')}
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 sm:mt-5 text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed"
          >
            {t('home.description')}
          </motion.p>
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 sm:mt-8 flex flex-col sm:flex-row gap-2.5 sm:gap-3"
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12"
              onClick={() => navigate(isAuthenticated ? '/institutions' : '/register')}
            >
              {t('auth.register')}
            </Button>
            <Button
              size="lg"
              className="w-full sm:w-auto h-12"
              onClick={() => navigate(isAuthenticated ? '/institutions' : '/login')}
            >
              {t('home.getStarted')}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto h-12"
              onClick={() => document.getElementById('shkarko')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Download className="w-5 h-5" />
              {t('pwa.shkarko')}
            </Button>
          </motion.div>
          <p className="mt-4 sm:mt-5 text-xs sm:text-sm text-primary font-medium">{t('voice.homeHint')}</p>
        </div>
      </section>

      <section className="bg-white border-y border-border px-4 sm:px-5 py-7 sm:py-10">
        <div className="container mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              label: t('home.stat.institutions'),
              value: institutions.length || cities.reduce((s, c) => s + c.count, 0) || '24+',
              icon: Building2,
              tile: 'gov-tile-orange bg-[#f39b3c]',
            },
            { label: t('home.stat.users'), value: '10K+', icon: Users, tile: 'gov-tile-blue bg-[#3db5e6]' },
            {
              label: t('home.stat.waiting'),
              value: waitingTotal,
              icon: CheckCircle2,
              tile: 'gov-tile-green bg-[#7cb342]',
            },
            { label: t('home.stat.timeSaved'), value: '1M+', icon: TrendingUp, tile: 'gov-tile-purple bg-[#7e57c2]' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center min-w-0">
              <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-lg ${s.tile} flex items-center justify-center mb-2 sm:mb-3`}>
                <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{s.value}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium leading-tight">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-5 py-8 sm:py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="surface-card rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">
                  {t(greetingKey(new Date().getHours()))}
                </p>
                <p className="font-semibold text-base sm:text-lg text-foreground truncate">
                  {t('home.liveQueues')}
                </p>
              </div>
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full wait-low text-[11px] sm:text-xs font-semibold shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-success' : 'bg-muted-foreground'} ${isLive ? 'animate-pulse' : ''}`}
                />
                {t('home.live')}
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                className="w-full h-12 rounded-lg bg-muted border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex gap-2 mb-5">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id, true)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    tab === item.id
                      ? 'btn-gradient text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 min-h-[180px]">
              {loadingLive ? (
                [0, 1, 2].map((i) => (
                  <div key={i} className="h-[72px] rounded-lg bg-muted border border-border animate-pulse" />
                ))
              ) : visibleStations.length === 0 ? (
                <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                  {t('home.noLiveData')}
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {visibleStations.map((s, i) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5 sm:p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/queue/${s.id}`)}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(s.id)
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.distLabel} {t('home.away')}
                            {favorites.includes(s.id) ? ' · ★' : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 self-start sm:self-auto sm:ml-3 ${
                          s.level === 'low'
                            ? 'wait-low'
                            : s.level === 'medium'
                              ? 'wait-medium'
                              : 'wait-high'
                        }`}
                      >
                        <AnimatedWait value={s.wait} /> min · {t(`wait.${s.level}`)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <Button className="w-full mt-5 h-12" onClick={() => navigate('/institutions')}>
              {t('home.reserveSlot')}
              <Zap className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Kosovo cities */}
      <section className="py-8 sm:py-10 px-4 sm:px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-5 gap-3">
            <div className="min-w-0">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-2">
                {t('home.citiesEyebrow')}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold">{t('home.citiesTitle')}</h2>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate('/cities')}>
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
                className="shrink-0 px-5 py-3 rounded-lg surface-card hover:border-primary/40 text-left min-w-[140px]"
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

      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-5 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {t('home.featuresEyebrow')}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">{t('home.features')}</h2>
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
                className="surface-card rounded-xl p-6 hover:border-primary/35 transition-colors duration-300 group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/12 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {t('home.howItWorksEyebrow')}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{t('home.howItWorks')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center p-5 sm:p-8"
              >
                <div className="w-16 h-16 rounded-lg btn-gradient flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-7 h-7 text-primary-foreground" />
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

      <DownloadApp />

      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-5">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-xl bg-primary p-6 sm:p-10 md:p-16 text-center">
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white">
                {t('home.ctaTitle')}
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-6 sm:mb-8 text-sm md:text-base">
                {t('home.ctaBody')}
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="h-12 sm:h-14 px-8 sm:px-10 w-full sm:w-auto"
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
