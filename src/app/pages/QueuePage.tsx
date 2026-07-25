import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useQueue } from '../contexts/QueueContext'
import api from '../lib/api'
import type { Institution, Service } from '../types'
import { QRCodeSVG } from 'qrcode.react'
import {
  Clock,
  Users,
  Ticket as TicketIcon,
  Download,
  X,
  ChevronLeft,
  ShieldAlert,
  UserRound,
  Accessibility,
  ArrowRight,
  MapPin,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { TicketPriority } from '../types'
import { toast } from 'sonner'

const QueuePage: React.FC = () => {
  const { institutionId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const { getTicket, currentTicket, cancelTicket, getWaitingTickets } = useQueue()

  const [institution, setInstitution] = useState<Institution | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>('normal')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [showTicketDialog, setShowTicketDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [instRes, servRes] = await Promise.all([
          api.get(`/institutions/${institutionId}`).catch(() => ({ data: null })),
          api.get(`/institutions/${institutionId}/services`).catch(() => ({ data: [] })),
        ])
        setInstitution(instRes.data)
        setServices(servRes.data || [])
      } catch (error) {
        console.error('Failed to fetch institution details:', error)
      } finally {
        setLoading(false)
      }
    }
    if (institutionId) fetchData()
  }, [institutionId])

  const waitingTickets = institutionId ? getWaitingTickets(institutionId) : []
  const waitMins = waitingTickets.length * 5
  const waitClass =
    waitMins < 20 ? 'wait-low' : waitMins < 40 ? 'wait-medium' : 'wait-high'

  useEffect(() => {
    if (
      currentTicket &&
      (currentTicket.institutionId === institutionId ||
        currentTicket.institutionId === institution?._id)
    ) {
      setShowTicketDialog(true)
    }
  }, [currentTicket, institutionId, institution?._id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin glow-primary-sm" />
      </div>
    )
  }

  if (!institution) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <X className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-xl font-semibold mb-2">Institucioni nuk u gjet</p>
          <Button variant="link" onClick={() => navigate('/institutions')}>
            Kthehu te Institucionet
          </Button>
        </div>
      </div>
    )
  }

  const handleGetTicket = async () => {
    if (!isAuthenticated) {
      toast.error('Ju lutemi kyçuni për të marrë biletë')
      navigate('/login')
      return
    }
    if (!selectedService) {
      toast.error('Ju lutemi zgjidhni një shërbim')
      return
    }
    if ((selectedDate && !selectedTime) || (!selectedDate && selectedTime)) {
      toast.error('Ju lutemi zgjidhni datën dhe orën së bashku')
      return
    }

    try {
      await getTicket(
        institutionId || (institution as any)._id!,
        selectedService,
        selectedPriority,
        user?.name || 'Qytetar',
        selectedDate || undefined,
        selectedTime || undefined,
      )
      setShowTicketDialog(true)
    } catch {
      // Error handled in context
    }
  }

  const handleDownloadQR = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `ticket-${currentTicket?.number}.png`
      link.href = url
      link.click()
    }
  }

  const handleCancelTicket = async () => {
    if (currentTicket) {
      await cancelTicket(currentTicket.id)
      setShowTicketDialog(false)
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-8 pb-6 px-5">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            className="mb-5 text-sm -ml-2"
            onClick={() => navigate('/institutions')}
          >
            <ChevronLeft className="w-4 h-4" />
            Kthehu mbrapsht
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                  Live Queue
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${waitClass}`}>
                  {waitMins} min pritje
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{institution.name}</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{institution.description}</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-success text-sm font-medium">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              {institution.workingHours?.open} - {institution.workingHours?.close}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-5">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Live Monitor */}
            <div className="surface-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">Monitorimi në Kohë Reale</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    icon: TicketIcon,
                    value: waitingTickets.length > 0 ? waitingTickets[0].number : '---',
                    label: 'Numri Aktual',
                    color: 'text-primary',
                    bg: 'bg-primary/15',
                  },
                  {
                    icon: Users,
                    value: waitingTickets.length,
                    label: 'Në Pritje',
                    color: 'text-success',
                    bg: 'bg-success/15',
                  },
                  {
                    icon: Clock,
                    value: waitMins,
                    label: 'Min. Pritje',
                    color: 'text-warning',
                    bg: 'bg-warning/15',
                  },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div
                      className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}
                    >
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                    <p className="text-[11px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking form */}
            <div className="surface-card rounded-2xl p-6 border-primary/25">
              <h2 className="font-semibold text-lg mb-1">{t('queue.getTicket')}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Zgjidhni shërbimin, orarin dhe prioritetin tuaj
              </p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('institution.selectService')} *
                  </Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-white/8">
                      <SelectValue placeholder="Zgjidhni shërbimin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem
                          key={service.id || service._id}
                          value={service.id || service._id!}
                        >
                          <div className="flex justify-between w-full gap-8">
                            <span>{service.name}</span>
                            <Badge variant="outline" className="opacity-50">
                              ~{service.estimatedTime} min
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      {services.length === 0 && (
                        <SelectItem value="none" disabled>
                          Nuk ka shërbime të disponueshme
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Data e Terminit
                    </Label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full h-12 rounded-xl border border-white/8 bg-muted/50 px-4 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ora e Terminit
                    </Label>
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full h-12 rounded-xl border border-white/8 bg-muted/50 px-4 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kategoria e Prioritetit
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'normal', label: t('priority.normal'), icon: UserRound },
                      { id: 'elderly', label: t('priority.elderly'), icon: Clock },
                      { id: 'emergency', label: t('priority.emergency'), icon: ShieldAlert },
                      { id: 'disability', label: t('priority.disability'), icon: Accessibility },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPriority(p.id as TicketPriority)}
                        className={`
                          p-4 rounded-xl border-2 transition-all text-center space-y-2
                          ${
                            selectedPriority === p.id
                              ? 'border-primary bg-primary/15 glow-primary-sm'
                              : 'border-white/8 hover:border-primary/30 bg-white/[0.02]'
                          }
                        `}
                      >
                        <div
                          className={`w-9 h-9 mx-auto rounded-lg flex items-center justify-center ${
                            selectedPriority === p.id
                              ? 'btn-gradient text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <p.icon className="w-4 h-4" />
                        </div>
                        <p
                          className={`text-xs font-medium ${
                            selectedPriority === p.id ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {p.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full text-base"
                  size="lg"
                  onClick={handleGetTicket}
                  disabled={!selectedService}
                >
                  Merr Numrin Digjital
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="surface-card rounded-2xl p-5">
              <h3 className="font-semibold mb-4 text-sm">Detajet e Institucionit</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      Adresa
                    </p>
                    <p className="text-sm font-medium">
                      {institution.location?.address}, {institution.location?.city}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      Orari i Punës
                    </p>
                    <p className="text-sm font-medium">
                      {institution.workingHours?.open} - {institution.workingHours?.close}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-card rounded-2xl p-5">
              <h3 className="font-semibold mb-4 text-sm">Të Gjitha Shërbimet</h3>
              <div className="space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id || service._id}
                    className="flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-colors text-sm"
                  >
                    <span className="font-medium">{service.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
                      ~{service.estimatedTime} min
                    </span>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nuk ka shërbime</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Ticket Dialog — FuelFlow style */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-primary/25 bg-[#12121c]">
          <div className="h-1.5 btn-gradient" />

          <DialogHeader className="pt-8 px-6">
            <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3 glow-success">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="text-center">
              Skanoni këtë kod QR kur të arrini në sportel.
            </DialogDescription>
          </DialogHeader>

          {currentTicket && (
            <div className="px-6 pb-8 space-y-5">
              <div className="text-center">
                <div className="inline-block px-10 py-5 btn-gradient rounded-2xl glow-primary">
                  <div className="text-5xl font-extrabold text-white tracking-tight">
                    {currentTicket.number}
                  </div>
                </div>
                <div className="mt-3">
                  <Badge className="bg-primary/15 text-primary border-primary/25">
                    {t(`priority.${currentTicket.priority}`)}
                  </Badge>
                  {currentTicket.scheduledAt && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Termini:{' '}
                      {new Date(currentTicket.scheduledAt).toLocaleDateString('sq-SQ', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      në{' '}
                      {new Date(currentTicket.scheduledAt).toLocaleTimeString('sq-SQ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white flex flex-col items-center">
                <QRCodeSVG value={currentTicket.qrCode} size={160} />
                <p className="text-xs text-gray-500 mt-3 font-medium">
                  {institution.name} · Slot #{currentTicket.number}
                </p>
              </div>

              <Button variant="outline" className="w-full h-11" onClick={handleDownloadQR}>
                <Download className="w-4 h-4" /> Shkarko si Foto
              </Button>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pozicioni aktual</span>
                  <span className="font-bold">#{currentTicket.positionInQueue}</span>
                </div>
                <Progress
                  value={Math.max(
                    10,
                    100 - (currentTicket.positionInQueue / (waitingTickets.length || 1)) * 100,
                  )}
                  className="h-2"
                />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pritja e përafërt</span>
                  <span className="font-bold text-warning">
                    ~{currentTicket.estimatedWaitTime} min
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="destructive" onClick={handleCancelTicket} className="flex-1 h-11">
                  <X className="w-4 h-4" /> Anulo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTicketDialog(false)}
                  className="flex-1 h-11"
                >
                  Mbyll
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QueuePage
