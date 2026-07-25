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
  Radio,
} from 'lucide-react'

type ProviderInfo = { configured: boolean; note: string }

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [cities, setCities] = useState<{ name: string }[]>([])
  const [preferredCity, setPreferredCity] = useState('Prishtinë')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [prefs, setPrefs] = useState({
    inApp: true,
    email: true,
    sms: false,
    telegram: false,
  })
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({})
  const [providerOrder, setProviderOrder] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setPreferredCity(user?.preferredCity || 'Prishtinë')
    setTelegramChatId((user as any)?.telegramChatId || '')
    setPrefs({
      inApp: user?.notificationPrefs?.inApp !== false,
      email: user?.notificationPrefs?.email !== false,
      sms: user?.notificationPrefs?.sms === true,
      telegram: (user?.notificationPrefs as any)?.telegram === true,
    })
    api.get('/citizen/cities').then((r) => setCities(r.data?.cities || []))
    api.get('/citizen/sms-providers').then((r) => {
      setProviders(r.data?.providers || {})
      setProviderOrder(r.data?.order || [])
    })
  }, [isAuthenticated, user, navigate])

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/favorites/prefs', {
        preferredCity,
        telegramChatId,
        notificationPrefs: prefs,
      })
      await refreshUser({
        preferredCity: data.preferredCity,
        telegramChatId: data.telegramChatId,
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
                Njoftime SMS multi-provider + Telegram falas
              </p>
            </div>
          </div>

          <div className="space-y-5">
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
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">SMS (multi-provider)</p>
                    <p className="text-xs text-muted-foreground">
                      Infobip · Vonage · Twilio · Gateway · Textbelt
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.sms}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, sms: v }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Send className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Telegram (falas)</p>
                    <p className="text-xs text-muted-foreground">
                      Merri njoftime pa kosto SMS
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.telegram}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, telegram: v }))}
                />
              </div>

              {prefs.telegram && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Telegram Chat ID
                  </Label>
                  <Input
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="p.sh. 123456789"
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    1) Krijo bot te @BotFather → vendos <code>TELEGRAM_BOT_TOKEN</code> në backend
                    .env · 2) Nis bisedën me botin · 3) Merr Chat ID nga @userinfobot dhe ngjite
                    këtu.
                  </p>
                </div>
              )}
            </div>

            <div className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-accent" />
                <h2 className="font-semibold text-sm">SMS providers (status)</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Rendi: {providerOrder.join(' → ') || '—'}
              </p>
              <div className="space-y-2">
                {Object.entries(providers).map(([name, info]) => (
                  <div
                    key={name}
                    className="flex items-start justify-between gap-3 text-xs rounded-xl bg-white/[0.03] border border-white/6 px-3 py-2.5"
                  >
                    <div>
                      <p className="font-semibold capitalize text-foreground">{name}</p>
                      <p className="text-muted-foreground mt-0.5">{info.note}</p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full font-bold ${
                        info.configured
                          ? 'bg-accent/15 text-accent'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {info.configured ? 'ON' : 'OFF'}
                    </span>
                  </div>
                ))}
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
