import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { toast } from 'sonner'
import {
  Settings,
  Bell,
  MapPin,
  Mail,
  MessageSquare,
  Smartphone,
  Save,
  ArrowLeft,
  Send,
  CheckCircle2,
  ExternalLink,
  Unplug,
  Loader2,
} from 'lucide-react'

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [cities, setCities] = useState<{ name: string }[]>([])
  const [preferredCity, setPreferredCity] = useState('Prishtinë')
  const [prefs, setPrefs] = useState({
    inApp: true,
    email: true,
    sms: false,
    telegram: false,
  })
  const [tgStatus, setTgStatus] = useState<{
    configured: boolean
    botUsername: string | null
    note?: string
  }>({ configured: false, botUsername: null })
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [saving, setSaving] = useState(false)

  const linked = Boolean(user?.telegramChatId)

  const loadTelegram = () =>
    api.get('/telegram/status').then((r) => setTgStatus(r.data || { configured: false }))

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setPreferredCity(user?.preferredCity || 'Prishtinë')
    setPrefs({
      inApp: user?.notificationPrefs?.inApp !== false,
      email: user?.notificationPrefs?.email !== false,
      sms: user?.notificationPrefs?.sms === true,
      telegram: user?.notificationPrefs?.telegram === true || Boolean(user?.telegramChatId),
    })
    api.get('/citizen/cities').then((r) => setCities(r.data?.cities || []))
    loadTelegram()
  }, [isAuthenticated, user, navigate])

  const linkTelegram = async () => {
    setLinking(true)
    try {
      const { data } = await api.post('/telegram/link')
      if (!data.ok) {
        toast.error(data.message || 'Lidhja dështoi')
        return
      }
      toast.success('Hape Telegram dhe shtyp Start')
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
      toast.error(err?.response?.data?.message || 'Lidhja dështoi')
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
      toast.success('Telegram u shkëput')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Shkëputja dështoi')
    } finally {
      setUnlinking(false)
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
      toast.success('Cilësimet u ruajtën')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Ruajtja dështoi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 px-5">
        <div className="container mx-auto max-w-2xl">
          <Button variant="ghost" className="-ml-2 mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Kthehu
          </Button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl btn-gradient flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Cilësimet</h1>
              <p className="text-sm text-muted-foreground">
                Njoftime falas me Telegram — kanali kryesor
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* TELEGRAM — hero channel */}
            <div className="surface-card rounded-2xl p-5 space-y-4 border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                <h2 className="font-semibold">Telegram (rekomanduar)</h2>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                  Falas
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kanali më i mirë për SmartQueue: falas, i menjëhershëm, pa kredi SMS. Merr
                konfirmime termini, kujtesa dhe thirrjen e radhës direkt në Telegram.
              </p>

              {linked ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 text-sm text-accent">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>
                      I lidhur
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
                    Shkëput
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!tgStatus.configured && (
                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      Admin: krijo bot te @BotFather → vendos{' '}
                      <code className="text-amber-200">TELEGRAM_BOT_TOKEN</code> në backend/.env →
                      rinis serverin.
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
                    Lidhu me Telegram
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Hapët Telegram → shtyp <strong>Start</strong> → lidhja bëhet automatikisht
                  </p>
                </div>
              )}
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Qyteti i preferuar</h2>
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
                <h2 className="font-semibold">Kanalet e njoftimeve</h2>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Në aplikacion</p>
                    <p className="text-xs text-muted-foreground">Zile live</p>
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
                    <p className="text-sm font-medium">Email</p>
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
                    <p className="text-sm font-medium">Telegram</p>
                    <p className="text-xs text-muted-foreground">
                      {linked ? 'Aktiv · i lidhur' : 'Lidhe më sipër'}
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
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">SMS (opsional)</p>
                    <p className="text-xs text-muted-foreground">Backup nëse ke kredi provider</p>
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
                Llogaria
              </Label>
              <Input value={user?.name || ''} disabled className="h-11" />
              <Input value={user?.email || ''} disabled className="h-11" />
            </div>

            <Button className="w-full h-12" onClick={save} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Duke ruajtur…' : 'Ruaj cilësimet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
