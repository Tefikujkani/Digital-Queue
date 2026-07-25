import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useQueue } from '../contexts/QueueContext'
import api from '../lib/api'
import type { Institution } from '../types'
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Bell,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronRight,
} from 'lucide-react'

const CitizenDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  const { tickets, cancelTicket } = useQueue()

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

  const myTickets = useMemo(
    () => tickets.filter((t) => t.userId === user?.id || (user as any)?._id === t.userId),
    [tickets, user],
  )

  const activeTicket = myTickets.find((t) => t.status === 'waiting' || t.status === 'called')
  const completedTickets = myTickets.filter((t) => t.status === 'completed')

  const getInstitutionName = (institutionId: string) => {
    const inst = institutions.find(
      (i) => i.id === institutionId || (i as any)._id === institutionId,
    )
    return inst?.name || 'Institucion...'
  }

  const getServiceName = (institutionId: string, serviceId: string) => {
    const inst = institutions.find(
      (i) => i.id === institutionId || (i as any)._id === institutionId,
    )
    const service = inst?.services?.find((s: any) => s.id === serviceId || s._id === serviceId)
    return service?.name || 'Shërbimi...'
  }

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Mirëmëngjes' : hour < 18 ? 'Mirëdita' : 'Mirëmbrëma'

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Zap className="w-8 h-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-8 pb-6 px-5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center text-xl font-bold text-white glow-primary-sm">
                {(user?.name || 'Q')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{greeting}</p>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {user?.name}
                </h1>
              </div>
            </div>
            <Button className="h-11" onClick={() => navigate('/institutions')}>
              Merr një numër <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Bileta Aktive', value: activeTicket ? 1 : 0, icon: Ticket, tone: 'text-primary' },
            {
              label: 'Të Përfunduara',
              value: completedTickets.length,
              icon: CheckCircle2,
              tone: 'text-success',
            },
            { label: 'Termine', value: 0, icon: Calendar, tone: 'text-secondary' },
            { label: 'Njoftime', value: 3, icon: Bell, tone: 'text-warning' },
          ].map((stat, i) => (
            <div key={i} className="surface-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-5 h-5 ${stat.tone}`} />
              </div>
            </div>
          ))}
        </div>

        {activeTicket ? (
          <div className="surface-card rounded-2xl p-6 mb-6 border-primary/30 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-6 relative">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                Bileta Juaj Aktive
              </h2>
              <Badge className="bg-primary/15 text-primary border-primary/25">
                {t(`status.${activeTicket.status}`)}
              </Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-6 relative">
              <div className="text-center">
                <div className="inline-block px-8 py-5 btn-gradient rounded-2xl glow-primary">
                  <div className="text-5xl font-extrabold text-white">{activeTicket.number}</div>
                </div>
                <Badge variant="outline" className="mt-3 px-4 py-1 border-white/15">
                  {t(`priority.${activeTicket.priority}`)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/6">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Institucioni
                  </p>
                  <p className="font-semibold flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-primary" />
                    {getInstitutionName(activeTicket.institutionId)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/6">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Shërbimi
                  </p>
                  <p className="font-semibold flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-warning" />
                    {getServiceName(activeTicket.institutionId, activeTicket.serviceId)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/6 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Pozicioni
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      #{activeTicket.positionInQueue}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/6 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Pritja
                    </p>
                    <p className="text-2xl font-bold text-warning">
                      ~{activeTicket.estimatedWaitTime}m
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="h-11"
                  onClick={() => cancelTicket(activeTicket.id || (activeTicket as any)._id)}
                >
                  <AlertCircle className="w-4 h-4" /> Anulo Radhën
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-10 text-center cursor-pointer border-2 border-dashed border-white/10 hover:border-primary/40 transition-colors mb-6 bg-white/[0.02]"
            onClick={() => navigate('/institutions')}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nuk keni asnjë biletë aktive</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
              Merrni një numër të ri digjital për çdo institucion në Kosovë.
            </p>
            <Button>Merr një numër tani</Button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {[
            {
              title: 'Institucionet',
              desc: 'Merrni numër të ri digjital',
              icon: Building2,
              path: '/institutions',
            },
            {
              title: 'Terminet',
              desc: 'Rezervoni një orar fiks',
              icon: Calendar,
              path: '/appointments',
            },
            {
              title: 'Hartat Live',
              desc: 'Shihni radhët afër jush',
              icon: MapPin,
              path: '/institutions',
            },
          ].map((action, i) => (
            <div
              key={i}
              className="surface-card rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-all group"
              onClick={() => navigate(action.path)}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3 group-hover:glow-primary-sm transition-all">
                <action.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

        <div className="surface-card rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Aktiviteti i Fundit</h2>
            <p className="text-sm text-muted-foreground">Historiku i shërbimeve tuaja</p>
          </div>
          {myTickets.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nuk keni asnjë biletë në historik.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id || (ticket as any)._id}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-lg font-bold text-primary">
                      {ticket.number}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {getInstitutionName(ticket.institutionId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getServiceName(ticket.institutionId, ticket.serviceId)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        ticket.status === 'completed'
                          ? 'wait-low'
                          : ticket.status === 'cancelled'
                            ? 'wait-high'
                            : 'bg-primary/15 text-primary border border-primary/25'
                      }`}
                    >
                      {t(`status.${ticket.status}`)}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(ticket.createdAt).toLocaleDateString('sq-AL')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CitizenDashboard
