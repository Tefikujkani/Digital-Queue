import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'
import { User, Mail, Phone, Lock, ArrowLeft, Ticket } from 'lucide-react'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import type { GoogleSession } from '../lib/googleAuth'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register, loginWithGoogle } = useAuth()
  const { t } = useLanguage()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name || !email || !password) {
      toast.error(t('auth.fillRequired'))
      return
    }
    if (password.length < 8) {
      toast.error(t('auth.passwordMinLength'))
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

  const afterGoogle = async (session: GoogleSession) => {
    setLoading(true)
    try {
      const result = await loginWithGoogle(session)
      toast.success(t('auth.registerSuccess'))
      if (result.role === 'admin') navigate('/dashboard/admin', { replace: true })
      else navigate('/dashboard/citizen', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center px-4 py-4 sm:py-8 pb-10 relative z-20">
      <form
        className="w-full max-w-lg"
        onSubmit={handleRegister}
        noValidate
      >
        <div className="surface-card rounded-xl p-4 sm:p-8 md:p-10">
          <div className="text-center mb-5 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 btn-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">{t('auth.createAccount')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('auth.joinSubtitle')}</p>
          </div>

          <div className="space-y-3.5 sm:space-y-4">
            <GoogleAuthButton disabled={loading} onCredential={afterGoogle} />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('auth.orEmail')}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('auth.name')} *
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    name="name"
                    autoComplete="name"
                    autoCapitalize="words"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8 text-base"
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
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8 text-base"
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
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+383 XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('auth.password')} *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8 text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('auth.confirmPassword')} *
              </Label>
              <Input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl bg-muted/50 border-white/8 text-base"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base mt-1" disabled={loading}>
              {loading ? t('common.loading') : t('auth.register')}
            </Button>
          </div>

          <div className="mt-5 sm:mt-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t('auth.login')}
              </Link>
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4" /> {t('common.backHome')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default RegisterPage
