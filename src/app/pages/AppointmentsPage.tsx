import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Calendar } from '../components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useQueue } from '../contexts/QueueContext'
import {
  Calendar as CalendarIcon,
  Clock,
  Info,
  X,
  Loader2,
  Smartphone,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Institution, Service } from '../types'
import api from '../lib/api'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'

const FALLBACK_TIMES = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
]

type SlotInfo = {
  time: string
  available?: number
  past?: boolean
  open?: boolean
}

const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t, locale } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const { getTicket, tickets, cancelTicket } = useQueue()

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notifySms, setNotifySms] = useState(false)
  const [phone, setPhone] = useState(user?.phone || '')

  useEffect(() => {
    if (user?.phone) setPhone(user.phone)
  }, [user?.phone])

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await api.get('/institutions')
        setInstitutions(response.data)
      } catch (error) {
        console.error('Failed to fetch institutions:', error)
      }
    }
    fetchInstitutions()
  }, [])

  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedInstitution) {
        setServices([])
        setSelectedService('')
        return
      }
      try {
        const response = await api.get(`/institutions/${selectedInstitution}/services`)
        setServices(response.data)
        setSelectedService('')
        setSelectedTime('')
      } catch (error) {
        console.error('Failed to fetch services:', error)
      }
    }
    fetchServices()
  }, [selectedInstitution])

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedInstitution || !selectedDate) {
        setSlots([])
        return
      }
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      setSlotsLoading(true)
      try {
        const { data } = await api.get('/tickets/slots', {
          params: {
            institutionId: selectedInstitution,
            serviceId: selectedService || undefined,
            date: dateStr,
          },
        })
        setSlots(Array.isArray(data?.slots) ? data.slots : [])
      } catch {
        setSlots(FALLBACK_TIMES.map((time) => ({ time, open: true, available: 8 })))
      } finally {
        setSlotsLoading(false)
      }
    }
    loadSlots()
  }, [selectedInstitution, selectedService, selectedDate])

  const visibleSlots = useMemo(() => {
    const list: SlotInfo[] = slots.length
      ? slots
      : FALLBACK_TIMES.map((time) => ({ time, open: true, available: 8, past: false }))
    return list.filter((s) => s.open !== false && !s.past)
  }, [slots])

  useEffect(() => {
    if (selectedTime && !visibleSlots.some((s) => s.time === selectedTime)) {
      setSelectedTime('')
    }
  }, [visibleSlots, selectedTime])

  const handleBook = async () => {
    if (!isAuthenticated) {
      toast.error(t('appointment.loginRequired'))
      navigate('/login')
      return
    }

    if (!selectedInstitution || !selectedService || !selectedDate || !selectedTime) {
      toast.error(t('appointment.fillAll'))
      return
    }

    if (notifySms && !phone.trim()) {
      toast.error('Shkruaj numrin e telefonit për SMS, ose çaktivizo SMS')
      return
    }

    setBookingLoading(true)
    try {
      // Lokal YYYY-MM-DD — JO toISOString (zhvendos datën në Kosovë / UTC+2)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      await getTicket(
        selectedInstitution,
        selectedService,
        'normal',
        user?.name || t('auth.citizen'),
        dateStr,
        selectedTime,
        { notifySms, phone: phone.trim() || undefined },
      )
      navigate(`/queue/${selectedInstitution}`)
    } catch (error: any) {
      // Error toast already shown by QueueContext.getTicket with API message
      console.error('Booking failed:', error)
    } finally {
      setBookingLoading(false)
    }
  }

  const userId = user?.id || (user as any)?._id
  const upcomingAppointments = tickets.filter(
    (tk) =>
      Boolean(tk.scheduledAt) &&
      ['waiting', 'checked_in', 'called'].includes(tk.status) &&
      (!userId || tk.userId === userId),
  )

  const pastAppointments = tickets.filter(
    (tk) =>
      Boolean(tk.scheduledAt) &&
      ['completed', 'cancelled'].includes(tk.status) &&
      (!userId || tk.userId === userId),
  )

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[100px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/5 blur-[100px] -z-10 rounded-full" />

      <div className="pt-10 pb-8 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="space-y-3">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                {t('appointment.systemBadge')}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('nav.appointments')}</h1>
              <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
                {t('appointment.pageSubtitle')}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-8"
          >
            <Card className="glass border-white/5 overflow-hidden rounded-[2.5rem] shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-white/[0.02] p-8">
                <CardTitle className="text-2xl font-black">{t('appointment.book')}</CardTitle>
                <CardDescription className="text-lg">{t('appointment.fillDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t('institution.selectInstitution')} *
                      </Label>
                      <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                        <SelectTrigger className="h-14 rounded-2xl glass border-white/10 text-lg font-bold">
                          <SelectValue placeholder={t('institution.selectInstitution')} />
                        </SelectTrigger>
                        <SelectContent className="glass border-white/10">
                          {institutions.map((inst) => (
                            <SelectItem
                              key={inst.id || (inst as any)._id}
                              value={inst.id || (inst as any)._id}
                              className="font-bold py-3"
                            >
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {t('institution.selectService')} *
                      </Label>
                      <Select
                        value={selectedService}
                        onValueChange={setSelectedService}
                        disabled={!selectedInstitution}
                      >
                        <SelectTrigger className="h-14 rounded-2xl glass border-white/10 text-lg font-bold">
                          <SelectValue placeholder={t('institution.selectService')} />
                        </SelectTrigger>
                        <SelectContent className="glass border-white/10">
                          {services.map((service) => (
                            <SelectItem
                              key={service.id || (service as any)._id}
                              value={service.id || (service as any)._id}
                              className="font-bold py-3"
                            >
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t('appointment.selectDate')} *
                    </Label>
                    <div className="glass rounded-2xl p-2 border-white/5">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                        className="rounded-xl border-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t('appointment.availableTime')} *
                  </Label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Duke ngarkuar oraret…
                    </div>
                  ) : visibleSlots.length === 0 ? (
                    <p className="text-sm text-amber-300/90">
                      Nuk ka orare të lira për këtë ditë. Zgjidh datë tjetër.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {visibleSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          type="button"
                          variant={selectedTime === slot.time ? 'default' : 'outline'}
                          className={`rounded-xl h-12 font-semibold ${
                            selectedTime === slot.time
                              ? 'glow-primary-sm'
                              : 'bg-muted/40 border-white/8 text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Smartphone className="w-5 h-5 text-sky-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">{t('appointment.notifyTitle')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user?.telegramChatId
                            ? t('appointment.notifyLinked')
                            : t('appointment.notifyHint')}
                        </p>
                      </div>
                    </div>
                    <Switch checked={notifySms} onCheckedChange={setNotifySms} />
                  </div>
                  {user?.telegramChatId && (
                    <p className="text-[11px] text-sky-300/90 flex items-center gap-1.5">
                      ✓ {t('appointment.telegramActive')}
                    </p>
                  )}
                  {notifySms && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        {t('appointment.phoneSms')}
                      </Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="044 xxx xxx"
                        className="h-12 rounded-xl"
                      />
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> Email konfirmimi shkon gjithmonë te {user?.email}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-primary/20"
                  onClick={handleBook}
                  disabled={bookingLoading || !selectedService || !selectedTime}
                >
                  {bookingLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
                  {t('appointment.bookAction')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <div className="space-y-8">
            <Card className="glass border-white/5 overflow-hidden rounded-[2.5rem]">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xl font-bold">{t('appointment.myAppointments')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 glass p-1 rounded-xl mb-6">
                    <TabsTrigger value="upcoming" className="rounded-lg font-bold">
                      {t('appointment.upcoming')}
                    </TabsTrigger>
                    <TabsTrigger value="past" className="rounded-lg font-bold">
                      {t('appointment.past')}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="upcoming" className="space-y-4 mt-0">
                    {upcomingAppointments.length === 0 ? (
                      <div className="text-center py-12 opacity-20">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-bold">{t('appointment.none')}</p>
                      </div>
                    ) : (
                      upcomingAppointments.map((appointment) => (
                        <div
                          key={appointment.id || (appointment as any)._id}
                          className="p-5 glass border-white/5 rounded-2xl space-y-4 hover:bg-white/5 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-black text-foreground group-hover:text-primary transition-colors">
                              {institutions.find(
                                (i) => (i.id || (i as any)._id) === appointment.institutionId,
                              )?.name || t('common.institution')}
                            </p>
                            <Badge
                              className={`${
                                appointment.status === 'called'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-primary/10 text-primary'
                              } border-0 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest`}
                            >
                              {t(`status.${appointment.status}`)}
                            </Badge>
                          </div>
                          <p className="text-sm font-bold text-muted-foreground">{appointment.number}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div className="flex items-center gap-4 text-xs font-bold">
                              <div className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                                {appointment.scheduledAt
                                  ? new Date(appointment.scheduledAt).toLocaleString(locale, {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : new Date(appointment.createdAt).toLocaleDateString(locale)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                {appointment.number}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-rose-500/20 hover:text-rose-500"
                              onClick={() =>
                                cancelTicket(appointment.id || (appointment as any)._id)
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="past" className="mt-0 space-y-4">
                    {pastAppointments.length === 0 ? (
                      <div className="text-center py-12 opacity-20">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-bold">{t('appointment.historyEmpty')}</p>
                      </div>
                    ) : (
                      pastAppointments.map((appointment) => (
                        <div
                          key={appointment.id || (appointment as any)._id}
                          className="p-4 glass border-white/5 rounded-2xl text-sm"
                        >
                          <p className="font-bold">{appointment.number}</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {appointment.scheduledAt
                              ? new Date(appointment.scheduledAt).toLocaleString(locale)
                              : t(`status.${appointment.status}`)}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="glass border-white/5 rounded-[2rem] bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  {t('appointment.infoTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {[t('appointment.tip1'), t('appointment.tip2'), t('appointment.tip3')].map(
                  (tip, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppointmentsPage
