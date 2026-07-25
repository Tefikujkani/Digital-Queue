import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { MapPin, Building2, ArrowRight, Sparkles } from 'lucide-react'
import api from '../lib/api'
import { Button } from '../components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'

type City = { name: string; count: number; types?: string[]; lat?: number; lng?: number }

const CitiesPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [cities, setCities] = useState<City[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/citizen/cities')
      .then((res) => {
        setCities(res.data.cities || [])
        setTotal(res.data.totalInstitutions || 0)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pb-20">
      <section className="relative pt-14 pb-10 px-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3 inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> {t('cities.eyebrow')}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">{t('cities.title')}</h1>
          <p className="text-muted-foreground max-w-2xl text-base md:text-lg">
            {t('cities.subtitle')}{' '}
            <strong className="text-foreground">{total}</strong> {t('cities.activeInstitutions')}.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-5">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : cities.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{t('cities.empty')}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cities.map((city, i) => (
              <motion.button
                key={city.name}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/institutions?city=${encodeURIComponent(city.name)}`)}
                className="surface-card rounded-2xl p-5 text-left hover:border-primary/40 transition-all hover:-translate-y-1 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent/10 text-accent">
                    {city.count} {t('cities.activeInstitutions')}
                  </span>
                </div>
                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                  {city.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {(city.types || []).slice(0, 3).join(' · ') || t('cities.publicServices')}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-medium">
                  {t('cities.viewInstitutions')} <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Nuk e gjen qytetin?</h3>
            <p className="text-sm text-muted-foreground">
              Kërko në të gjitha institucionet ose pyet Asistentin SmartQueue.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/institutions')}>
              Të gjitha
            </Button>
            <Button onClick={() => navigate('/institutions')}>Kërko tani</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CitiesPage
