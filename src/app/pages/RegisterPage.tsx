import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'
import { User, Mail, Phone, Lock, ArrowLeft, Ticket } from 'lucide-react'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { t } = useLanguage()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!name || !email || !password) {
      toast.error(t('auth.fillRequired'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const result = await register(name, email, password, 'citizen', phone, '')
      if (result.role === 'admin') {
        navigate('/dashboard/admin')
      } else {
        navigate('/dashboard/citizen')
      }
      toast.success(t('auth.registerSuccess'))
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center p-5 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="surface-card rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 btn-gradient rounded-2xl flex items-center justify-center mx-auto mb-5 glow-primary">
              <Ticket className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{t('auth.createAccount')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('auth.joinSubtitle')}</p>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('auth.name')} *
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('auth.email')} *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('auth.phone')}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="+383 XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('auth.password')} *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('auth.confirmPassword')} *
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 border-white/8"
                />
              </div>
            </div>

            <Button className="w-full h-12 text-base mt-2" onClick={handleRegister} disabled={loading}>
              {loading ? t('common.loading') : t('auth.register')}
            </Button>
          </div>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t('auth.login')}
              </Link>
            </p>
            <Button
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4" /> {t('common.backHome')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
