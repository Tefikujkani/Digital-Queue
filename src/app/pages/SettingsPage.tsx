import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import api from '../lib/api'
import { toast } from 'sonner'
import {
  Settings,
  Bell,
  MapPin,
  Mail,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Save,
  ArrowLeft,
  Send,
  CheckCircle2,
  ExternalLink,
  Unplug,
  Loader2,
  KeyRound,
  Trash2,
} from 'lucide-react'

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [cities, setCities] = useState<{ name: string }[]>([])
  const [preferredCity, setPreferredCity] = useState('Prishtinë')
  const [prefs, setPrefs] = useState({
    inApp: true,
    email: true,
    sms: false,
    telegram: false,
    viber: false,
    whatsapp: false,
  })
  const [tgStatus, setTgStatus] = useState<{
    configured: boolean
    botUsername: string | null
    note?: string
  }>({ configured: false, botUsername: null })
  const [vbStatus, setVbStatus] = useState<{
    configured: boolean
    botUri: string | null
    webhook?: boolean
  }>({ configured: false, botUri: null })
  const [waStatus, setWaStatus] = useState<{
    configured: boolean
    autoSend?: boolean
    sessionReady?: boolean
    sessionStatus?: string
    qr?: string
    pairingCode?: string
    hasBusinessNumber?: boolean
    greenConfigured?: boolean
    greenAuthorized?: boolean
    signupUrl?: string
    note?: string
  }>({ configured: false })
  const [sessionQr, setSessionQr] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [startingSession, setStartingSession] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkingViber, setLinkingViber] = useState(false)
  const [linkingWa, setLinkingWa] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [unlinkingViber, setUnlinkingViber] = useState(false)
  const [unlinkingWa, setUnlinkingWa] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const [channels, setChannels] = useState<
    Record<string, { configured: boolean; label: string; note: string }>
  >({})

  const linked = Boolean(user?.telegramChatId)
  const viberLinked = Boolean(user?.viberId)
  const waLinked = Boolean(user?.whatsappPhone)

  const loadMessengerStatus = () => {
    api.get('/telegram/status').then((r) => setTgStatus(r.data || { configured: false }))
    api.get('/viber/status').then((r) => setVbStatus(r.data || { configured: false }))
    api.get('/whatsapp/status').then((r) => setWaStatus(r.data || { configured: false }))
    api.get('/citizen/notify-channels').then((r) => setChannels(r.data || {}))
  }

  useEffect(() => {
    if (waStatus.sessionReady) return undefined
    const tick = setInterval(async () => {
      try {
        const { data } = await api.get('/whatsapp/session')
        if (data.qr) setSessionQr(data.qr)
        if (data.pairingCode) setSessionCode(data.pairingCode)
        if (data.ready) {
          setSessionQr('')
          setSessionCode('')
          setStartingSession(false)
          loadMessengerStatus()
          toast.success(t('settings.waAutoOn'))
        }
      } catch {
        /* keep polling */
      }
    }, 2000)
    return () => clearInterval(tick)
  }, [waStatus.sessionReady, t])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setPreferredCity(user?.preferredCity || 'Prishtinë')
    setWaPhone(user?.whatsappPhone || user?.phone || '')
    setPrefs({
      inApp: user?.notificationPrefs?.inApp !== false,
      email: user?.notificationPrefs?.email !== false,
      sms: user?.notificationPrefs?.sms === true,
      telegram: user?.notificationPrefs?.telegram === true || Boolean(user?.telegramChatId),
      viber: user?.notificationPrefs?.viber === true || Boolean(user?.viberId),
      whatsapp: user?.notificationPrefs?.whatsapp === true || Boolean(user?.whatsappPhone),
    })
    api.get('/citizen/cities').then((r) => setCities(r.data?.cities || []))
    loadMessengerStatus()
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    if (!isAuthenticated || waStatus.sessionReady) return
    api.post('/whatsapp/session/start').then((r) => {
      if (r.data?.qr) setSessionQr(r.data.qr)
      if (r.data?.ready) loadMessengerStatus()
    }).catch(() => {})
  }, [isAuthenticated, waStatus.sessionReady])

  const linkTelegram = async () => {
    setLinking(true)
    try {
      const { data } = await api.post('/telegram/link')
      if (!data.ok) {
        toast.error(data.message || t('settings.linkFailed'))
        return
      }
      toast.success(t('settings.openTelegram'))
      window.open(data.deepLink, '_blank', 'noopener,noreferrer')
      // Poll derisa të lidhet
      let tries = 0
      const poll = setInterval(async () => {
        tries += 1
        try {
          await refreshUser()
        } catch {
          /* ignore */
        }
        if (tries > 40) clearInterval(poll)
      }, 2500)
      setTimeout(() => clearInterval(poll), 120000)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.linkFailed'))
    } finally {
      setLinking(false)
    }
  }

  const unlinkTg = async () => {
    setUnlinking(true)
    try {
      await api.post('/telegram/unlink')
      await refreshUser({ telegramChatId: '', notificationPrefs: { ...prefs, telegram: false } } as any)
      setPrefs((p) => ({ ...p, telegram: false }))
      toast.success(t('settings.unlinked'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.linkFailed'))
    } finally {
      setUnlinking(false)
    }
  }

  const linkViber = async () => {
    setLinkingViber(true)
    try {
      const { data } = await api.post('/viber/link')
      if (!data.ok) {
        toast.error(data.message || t('settings.viberLinkFailed'))
        return
      }
      if (data.needsWebhook) {
        toast.message(t('settings.viberWebhookHint'))
      }
      toast.success(t('settings.openViber'))
      window.open(data.deepLink || data.webLink, '_blank', 'noopener,noreferrer')
      let tries = 0
      const poll = setInterval(async () => {
        tries += 1
        try {
          await refreshUser()
        } catch {
          /* ignore */
        }
        if (tries > 40) clearInterval(poll)
      }, 2500)
      setTimeout(() => clearInterval(poll), 120000)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.viberLinkFailed'))
    } finally {
      setLinkingViber(false)
    }
  }

  const unlinkVb = async () => {
    setUnlinkingViber(true)
    try {
      await api.post('/viber/unlink')
      await refreshUser({ viberId: '', notificationPrefs: { ...prefs, viber: false } } as any)
      setPrefs((p) => ({ ...p, viber: false }))
      toast.success(t('settings.viberUnlinked'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.viberLinkFailed'))
    } finally {
      setUnlinkingViber(false)
    }
  }

  const connectWhatsAppAuto = async () => {
    setStartingSession(true)
    try {
      if (!waLinked && waPhone.trim()) await saveWaPhone()
      const { data } = await api.post('/whatsapp/session/start', { phone: waPhone })
      if (data.qr) setSessionQr(data.qr)
      if (data.pairingCode) setSessionCode(data.pairingCode)
      if (data.ready) {
        setStartingSession(false)
        loadMessengerStatus()
        toast.success(t('settings.waAutoOn'))
      }
    } catch (err: any) {
      setStartingSession(false)
      toast.error(err?.response?.data?.message || t('settings.waLinkFailed'))
    }
  }

  const testWhatsApp = async () => {
    try {
      const { data } = await api.post('/whatsapp/test', { phone: waPhone })
      if (data.sent) toast.success(t('settings.waAutoOn'))
      else toast.error(data.message || t('settings.waNeedLink'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.waNeedLink'))
    }
  }

  const saveWaPhone = async () => {
    setLinkingWa(true)
    try {
      const { data } = await api.post('/whatsapp/phone', { phone: waPhone })
      if (!data.ok) {
        toast.error(data.message || t('settings.waLinkFailed'))
        return
      }
      await refreshUser({
        whatsappPhone: data.phone,
        notificationPrefs: { ...prefs, whatsapp: true },
      } as any)
      setPrefs((p) => ({ ...p, whatsapp: true }))
      toast.success(t('settings.waSaved'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.waLinkFailed'))
    } finally {
      setLinkingWa(false)
    }
  }

  const unlinkWa = async () => {
    setUnlinkingWa(true)
    try {
      await api.post('/whatsapp/unlink')
      await refreshUser({ whatsappPhone: '', notificationPrefs: { ...prefs, whatsapp: false } } as any)
      setPrefs((p) => ({ ...p, whatsapp: false }))
      toast.success(t('settings.waUnlinked'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.waLinkFailed'))
    } finally {
      setUnlinkingWa(false)
    }
  }

  const changePw = async () => {
    setPwLoading(true)
    try {
      await api.put('/auth/password', { currentPassword, newPassword })
      toast.success(t('settings.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.passwordFailed'))
    } finally {
      setPwLoading(false)
    }
  }

  const deleteMe = async () => {
    if (!deletePassword || !confirm(t('settings.deleteConfirm'))) return
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } })
      toast.success(t('settings.deleted'))
      localStorage.clear()
      window.location.href = '/'
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.deleteFailed'))
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/favorites/prefs', {
        preferredCity,
        notificationPrefs: prefs,
      })
      await refreshUser({
        preferredCity: data.preferredCity,
        notificationPrefs: data.notificationPrefs,
      } as any)
      toast.success(t('settings.saved'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('settings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="pt-6 sm:pt-10 px-4 sm:px-5">
        <div className="container mx-auto max-w-2xl">
          <Button variant="ghost" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </Button>
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg btn-gradient flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold">{t('settings.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* TELEGRAM — hero channel */}
            <div className="surface-card rounded-2xl p-5 space-y-4 border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                <h2 className="font-semibold">{t('settings.telegramTitle')}</h2>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                  {t('settings.free')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.telegramBody')}
              </p>

              {linked ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 text-sm text-accent">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      {t('settings.linked')}
                      {tgStatus.botUsername ? (
                        <>
                          {' '}
                          me <strong>@{tgStatus.botUsername}</strong>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={unlinkTg}
                    disabled={unlinking}
                    className="border-white/15"
                  >
                    {unlinking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unplug className="w-4 h-4" />
                    )}
                    {t('settings.unlink')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!tgStatus.configured && (
                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      {t('settings.adminBotHint')}
                    </p>
                  )}
                  <Button
                    className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white"
                    onClick={linkTelegram}
                    disabled={linking || !tgStatus.configured}
                  >
                    {linking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    {t('settings.linkTelegram')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {t('settings.linkHint')}
                  </p>
                </div>
              )}
            </div>

            {/* VIBER */}
            <div className="surface-card rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                <h2 className="font-semibold">{t('settings.viberTitle')}</h2>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                  {t('settings.free')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.viberBody')}
              </p>

              {viberLinked ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 text-sm text-accent">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      {t('settings.linked')}
                      {vbStatus.botUri ? (
                        <>
                          {' '}
                          · <strong>{vbStatus.botUri}</strong>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={unlinkVb}
                    disabled={unlinkingViber}
                    className="border-white/15"
                  >
                    {unlinkingViber ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unplug className="w-4 h-4" />
                    )}
                    {t('settings.unlink')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!vbStatus.configured && (
                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      {t('settings.viberAdminHint')}
                    </p>
                  )}
                  <Button
                    className="w-full h-12"
                    onClick={linkViber}
                    disabled={linkingViber || !vbStatus.configured}
                  >
                    {linkingViber ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    {t('settings.linkViber')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {t('settings.viberLinkHint')}
                  </p>
                </div>
              )}
            </div>

            {/* WHATSAPP — iOS + Android */}
            <div className="surface-card rounded-2xl p-5 space-y-4 border border-emerald-200">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <h2 className="font-semibold">{t('settings.waTitle')}</h2>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                  {t('settings.iosAndroid')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.waBody')}</p>

              <Input
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="044 / 048 xxx xxx"
                className="h-12"
                inputMode="tel"
              />
              {!waLinked && (
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={saveWaPhone}
                  disabled={linkingWa || !waPhone.trim()}
                >
                  {linkingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('settings.waSavePhone')}
                </Button>
              )}

              {waStatus.sessionReady || waStatus.autoSend ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {t('settings.waAutoOn')}
                    {user?.whatsappPhone ? ` · +${String(user.whatsappPhone).replace(/^\+/, '')}` : ''}
                  </p>
                  <Button
                    className="w-full h-11 bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                    onClick={testWhatsApp}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('settings.waTest')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                    onClick={connectWhatsAppAuto}
                    disabled={startingSession}
                  >
                    {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    {t('settings.waConnect')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">{t('settings.waScan')}</p>
                  {sessionQr && (
                    <img src={sessionQr} alt="WhatsApp QR" className="mx-auto w-56 h-56 rounded-lg bg-white p-2 border" />
                  )}
                  {sessionCode && (
                    <div className="rounded-xl bg-white border border-emerald-200 p-4 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">{t('settings.waPair')}</p>
                      <p className="text-3xl font-black tracking-[0.18em] text-[#128C7E]">
                        {`${sessionCode.slice(0, 4)}-${sessionCode.slice(4)}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Free SMS status */}
            <div className="surface-card rounded-2xl p-5 space-y-3 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h2 className="font-semibold">{t('settings.freeSmsTitle')}</h2>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.freeSmsBody')}</p>
              <div className="space-y-2">
                {['textbee', 'textbelt'].map((key) => {
                  const info = channels[key]
                  if (!info) return null
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 text-xs rounded-xl bg-white/[0.03] border border-white/6 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{info.label}</p>
                        <p className="text-muted-foreground mt-0.5">{info.note}</p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full font-bold ${
                          info.configured
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {info.configured ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t('settings.textbeeSetup')}
              </p>
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{t('settings.preferredCity')}</h2>
              </div>
              <select
                value={preferredCity}
                onChange={(e) => setPreferredCity(e.target.value)}
                className="w-full h-12 rounded-xl bg-muted/50 border border-white/8 px-3 text-sm"
              >
                {cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {!cities.find((c) => c.name === preferredCity) && (
                  <option value={preferredCity}>{preferredCity}</option>
                )}
              </select>
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{t('settings.channels')}</h2>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.inApp')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.inAppHint')}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.inApp}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, inApp: v }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.email')}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.email}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, email: v }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Send className="w-4 h-4 text-sky-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.telegram')}</p>
                    <p className="text-xs text-muted-foreground">
                      {linked ? t('settings.telegramOn') : t('settings.telegramOff')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.telegram}
                  disabled={!linked}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, telegram: v }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.viber')}</p>
                    <p className="text-xs text-muted-foreground">
                      {viberLinked ? t('settings.viberOn') : t('settings.viberOff')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.viber}
                  disabled={!viberLinked}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, viber: v }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-4 h-4 text-emerald-300 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.whatsapp')}</p>
                    <p className="text-xs text-muted-foreground">
                      {waLinked ? t('settings.waOn') : t('settings.waOff')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.whatsapp}
                  disabled={!waLinked}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, whatsapp: v }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.smsOptional')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.smsHint')}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.sms}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, sms: v }))}
                />
              </div>
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('settings.account')}
              </Label>
              <Input value={user?.name || ''} disabled className="h-11" />
              <Input value={user?.email || ''} disabled className="h-11" />
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{t('settings.changePassword')}</h2>
              </div>
              <Input
                type="password"
                placeholder={t('settings.currentPassword')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11"
              />
              <Input
                type="password"
                placeholder={t('settings.newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={changePw}
                disabled={pwLoading || !currentPassword || newPassword.length < 8}
              >
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {t('settings.savePassword')}
              </Button>
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-3 border border-destructive/30">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                <h2 className="font-semibold text-destructive">{t('settings.deleteAccount')}</h2>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.deleteHint')}</p>
              <Input
                type="password"
                placeholder={t('settings.confirmPassword')}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="h-11"
              />
              <Button variant="destructive" className="w-full" onClick={deleteMe}>
                <Trash2 className="w-4 h-4" /> {t('settings.deleteForever')}
              </Button>
            </div>

            <Button className="w-full h-12" onClick={save} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? t('settings.saving') : t('settings.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
