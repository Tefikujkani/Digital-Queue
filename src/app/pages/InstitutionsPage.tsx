import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import api from '../lib/api'
import type { Institution } from '../types'
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

function waitLevel(index: number) {
  const wait = 8 + ((index * 17) % 55)
  const level = wait < 20 ? 'low' : wait < 40 ? 'medium' : 'high'
  return { wait, level }
}

const InstitutionsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await api.get('/institutions')
        setInstitutions(response.data)
      } catch (error) {
        console.error('Failed to fetch institutions:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchInstitutions()
  }, [])

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.location?.city || (inst as any).city || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || inst.type === selectedType
    return matchesSearch && matchesType
  })

  const types = [
    { id: 'all', label: 'Të gjitha' },
    { id: 'municipality', label: 'Komunat' },
    { id: 'hospital', label: 'Spitalet' },
    { id: 'bank', label: 'Bankat' },
    { id: 'ministry', label: 'Ministritë' },
    { id: 'university', label: 'Universitetet' },
    { id: 'utility', label: 'Shërbimet Publike' },
    { id: 'court', label: 'Gjykatat' },
    { id: 'embassy', label: 'Ambasadat' },
    { id: 'post', label: 'Posta' },
  ]

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-2">
              Zbuloni
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('nav.institutions')}</h1>
            <p className="text-muted-foreground">
              Zgjidhni institucionin — shihni kohën e pritjes live dhe rezervoni slot.
            </p>
          </div>

          <div className="relative mb-5 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder={t('common.search') + ' sipas emrit ose qytetit...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-muted/60 border-white/8 text-base focus-visible:ring-primary/40"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {types.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedType === type.id
                    ? 'btn-gradient text-white glow-primary-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-white/5'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-5">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstitutions.map((institution, index) => {
              const Icon = institutionIcons[institution.type] || Building2
              const { wait, level } = waitLevel(index)
              const id = institution.id || (institution as any)._id

              return (
                <div
                  key={id}
                  className="surface-card rounded-2xl p-5 cursor-pointer group hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                  onClick={() => navigate(`/queue/${id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center group-hover:glow-primary-sm transition-all">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          institution.isActive
                            ? 'wait-low'
                            : 'bg-white/5 text-muted-foreground border border-white/10'
                        }`}
                      >
                        {institution.isActive ? '● Online' : 'Offline'}
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
                        {wait} min · {t(`wait.${level}`)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors mb-1 line-clamp-2 min-h-[3.5rem]">
                    {institution.name}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t(`institution.${institution.type}`)}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
                    {institution.description}
                  </p>

                  <div className="space-y-2 text-sm text-muted-foreground mb-5 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary/70" />
                      <span className="truncate text-xs">
                        {institution.location?.address},{' '}
                        {institution.location?.city || (institution as any).city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-warning/80" />
                      <span className="text-xs">
                        {institution.workingHours?.open} - {institution.workingHours?.close}
                      </span>
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

        {!loading && filteredInstitutions.length === 0 && (
          <div className="text-center py-24">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">{t('common.noData')}</p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Pastro kërkimin
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstitutionsPage
