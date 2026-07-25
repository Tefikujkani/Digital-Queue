import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useFavorites } from '../contexts/FavoritesContext'
import api from '../lib/api'
import type { Institution } from '../types'
import { getOpenStatus } from '../lib/hours'
import { translate } from '../i18n/translate'
import {
  Building2,
  Hospital,
  Landmark,
  School,
  Mail,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Phone,
  Globe,
  Gavel,
  Zap,
  Building,
  Heart,
  Star,
  LayoutGrid,
  Map as MapIcon,
} from 'lucide-react'

const institutionIcons: Record<string, any> = {
  municipality: Building2,
  hospital: Hospital,
  atk: Landmark,
  bank: Landmark,
  university: School,
  post: Mail,
  ministry: Building,
  utility: Zap,
  court: Gavel,
  embassy: Globe,
  other: Building2,
}

type WaitStat = { waiting: number; estimatedWaitMinutes: number; load: string }

const InstitutionsPage: React.FC = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

  const [searchTerm, setSearchTerm] = useState(params.get('q') || '')
  const [selectedType, setSelectedType] = useState(params.get('type') || 'all')
  const [selectedCity, setSelectedCity] = useState(params.get('city') || 'all')
  const [onlyFavorites, setOnlyFavorites] = useState(params.get('fav') === '1')
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [cities, setCities] = useState<{ name: string; count: number }[]>([])
  const [waitStats, setWaitStats] = useState<Record<string, WaitStat>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const query: Record<string, string> = {}
        if (selectedCity !== 'all') query.city = selectedCity
        if (selectedType !== 'all') query.type = selectedType
        if (searchTerm.trim()) query.q = searchTerm.trim()

        const [instRes, cityRes] = await Promise.all([
          api.get('/institutions', { params: query }),
          api.get('/citizen/cities'),
        ])
        setInstitutions(instRes.data || [])
        setCities(cityRes.data?.cities || [])

        const ids = (instRes.data || [])
          .map((i: any) => i._id || i.id)
          .filter(Boolean)
          .join(',')
        if (ids) {
          const stats = await api.get('/citizen/wait-stats', { params: { ids } })
          setWaitStats(stats.data || {})
        } else {
          setWaitStats({})
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    const tmr = setTimeout(load, 200)
    return () => clearTimeout(tmr)
  }, [selectedCity, selectedType, searchTerm])

  useEffect(() => {
    const next = new URLSearchParams()
    if (selectedCity !== 'all') next.set('city', selectedCity)
    if (selectedType !== 'all') next.set('type', selectedType)
    if (searchTerm.trim()) next.set('q', searchTerm.trim())
    if (onlyFavorites) next.set('fav', '1')
    setParams(next, { replace: true })
  }, [selectedCity, selectedType, searchTerm, onlyFavorites, setParams])

  const types = [
    'all',
    'municipality',
    'hospital',
    'bank',
    'ministry',
    'university',
    'utility',
    'court',
    'embassy',
    'post',
  ]

  const list = useMemo(() => {
    let rows = institutions
    if (onlyFavorites) {
      rows = rows.filter((i) => isFavorite(String((i as any)._id || i.id)))
    }
    return rows
  }, [institutions, onlyFavorites, isFavorite])

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-2">
                {t('institution.discover')}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('nav.institutions')}</h1>
              <p className="text-muted-foreground">
                {t('institution.pageSubtitle')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="w-4 h-4" /> {t('institution.viewList')}
              </Button>
              <Button
                variant={view === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('map')}
              >
                <MapIcon className="w-4 h-4" /> {t('institution.viewMap')}
              </Button>
            </div>
          </div>

          <div className="relative mb-5 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder={t('institution.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-muted/60 border-white/8 text-base focus-visible:ring-primary/40"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
            <button
              onClick={() => setSelectedCity('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                selectedCity === 'all'
                  ? 'btn-gradient text-white'
                  : 'bg-muted/60 text-muted-foreground border border-white/5'
              }`}
            >
              {t('institution.allCities')}
            </button>
            {cities.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedCity(c.name)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                  selectedCity === c.name
                    ? 'btn-gradient text-white'
                    : 'bg-muted/60 text-muted-foreground border border-white/5'
                }`}
              >
                {c.name} ({c.count})
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
            {types.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedType(id)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedType === id
                    ? 'btn-gradient text-white glow-primary-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-white/5'
                }`}
              >
                {t(`institution.filter.${id}`)}
              </button>
            ))}
            <button
              onClick={() => {
                if (!isAuthenticated) return navigate('/login')
                setOnlyFavorites((v) => !v)
              }}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${
                onlyFavorites
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-muted/40 text-muted-foreground border border-white/5'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-accent' : ''}`} />
              {t('institution.favoritesFilter')}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-5">
        {view === 'map' && (
          <div className="mb-8 rounded-3xl border border-white/10 overflow-hidden bg-[#0c1020]">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <p className="text-sm font-medium">{t('institution.mapTitle')}</p>
              <span className="text-xs text-muted-foreground">
                {t('institution.locationsCount', { n: list.length })}
              </span>
            </div>
            <iframe
              title={t('institution.mapTitle')}
              className="w-full h-[420px] grayscale-[20%] contrast-125"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=19.9%2C41.8%2C21.8%2C43.3&layer=mapnik&marker=${
                list[0]?.location?.lat || 42.6629
              }%2C${list[0]?.location?.lng || 21.1655}`}
            />
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
              {list.map((inst) => {
                const id = String((inst as any)._id || inst.id)
                const lat = inst.location?.lat
                const lng = inst.location?.lng
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/queue/${id}`)}
                    className="text-left text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-primary/15 border border-white/5"
                  >
                    <span className="font-semibold text-foreground line-clamp-1">{inst.name}</span>
                    <span className="block text-muted-foreground mt-0.5">
                      {inst.location?.city}
                      {lat && lng ? ` · ${lat.toFixed(2)}, ${lng.toFixed(2)}` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((institution) => {
              const Icon = institutionIcons[institution.type] || Building2
              const id = String((institution as any)._id || institution.id)
              const stats = waitStats[id] || { waiting: 0, estimatedWaitMinutes: 0, load: 'low' }
              const level = stats.load || 'low'
              const wait = stats.estimatedWaitMinutes || 0
              const rating = (institution as any).ratingAvg || 0
              const fav = isFavorite(id)
              const open = getOpenStatus(institution.workingHours)

              return (
                <div
                  key={id}
                  className="surface-card rounded-2xl p-5 cursor-pointer group hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full relative"
                  onClick={() => navigate(`/queue/${id}`)}
                >
                  <button
                    type="button"
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center hover:bg-accent/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(id)
                    }}
                    aria-label={t('institution.favoriteAria')}
                  >
                    <Heart className={`w-4 h-4 ${fav ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                  </button>

                  <div className="flex items-start justify-between mb-4 pr-10">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center group-hover:glow-primary-sm transition-all">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          open.isOpen
                            ? 'wait-low'
                            : 'bg-destructive/15 text-destructive border border-destructive/25'
                        }`}
                      >
                        {open.isOpen ? t('institution.openNow') : t('institution.closedNow')}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          level === 'low'
                            ? 'wait-low'
                            : level === 'medium'
                              ? 'wait-medium'
                              : 'wait-high'
                        }`}
                      >
                        ~{wait} min · {t(`wait.${level}`)}
                      </span>
                      {rating > 0 && (
                        <span className="text-[11px] text-warning inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-warning" /> {rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors mb-1 line-clamp-2 min-h-[3.5rem]">
                    {institution.name}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t(`institution.${institution.type}`) || institution.type}
                  </p>

                  <div className="space-y-2 text-sm text-muted-foreground mb-5 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary/70" />
                      <span className="truncate text-xs">
                        {institution.location?.city || (institution as any).city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-warning/80" />
                      <span className="text-xs">
                        {institution.workingHours?.open} - {institution.workingHours?.close}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <UsersIcon waiting={stats.waiting} />
                    </div>
                    {(institution as any).contact?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary/70" />
                        <span className="text-xs">{(institution as any).contact.phone}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-11 mt-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/queue/${id}`)
                    }}
                  >
                    {t('queue.getTicket')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-24">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">{t('common.noData')}</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setSelectedCity('all')
                setSelectedType('all')
                setOnlyFavorites(false)
              }}
            >
              {t('institution.clearSearch')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function UsersIcon({ waiting }: { waiting: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      {translate('institution.waitingNow', { n: waiting })}
    </span>
  )
}

export default InstitutionsPage
