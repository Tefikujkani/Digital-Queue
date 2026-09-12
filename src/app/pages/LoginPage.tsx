import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Lock, LogIn, Ticket } from 'lucide-react'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import type { GoogleSession } from '../lib/googleAuth'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, loginWithGoogle } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !password) {
      toast.error(t('auth.fillAllFields'))
      return
    }

    setLoading(true)
    try {
      const user = await login(email, password)

      if (user.role === 'admin') {
        navigate('/dashboard/admin')
      } else if (user.role === 'superadmin') {
        navigate('/institutions')
      } else {
        navigate('/dashboard/citizen')
      }

      toast.success(t('auth.welcomeBack'))
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const afterGoogle = async (session: GoogleSession) => {
    setLoading(true)
    try {
      const signedIn = await loginWithGoogle(session)
      toast.success(t('auth.welcomeBack'))
      if (signedIn.role === 'admin') navigate('/dashboard/admin', { replace: true })
      else if (signedIn.role === 'superadmin') navigate('/institutions', { replace: true })
      else navigate('/dashboard/citizen', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center px-4 py-4 sm:py-8 pb-10 relative z-20">
      <form className="w-full max-w-md" onSubmit={handleLogin} noValidate>
        <div className="surface-card rounded-xl p-4 sm:p-8 md:p-10">
          <div className="text-center mb-5 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 btn-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">SmartQueue</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('auth.login')}</p>
          </div>

          <div className="space-y-4">
            <GoogleAuthButton disabled={loading} onCredential={afterGoogle} />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('auth.orEmail')}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('auth.email')}
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
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('auth.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8 text-base"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                t('common.loading')
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> {t('auth.login')}
                </>
              )}
            </Button>
          </div>

          <div className="mt-5 sm:mt-6 space-y-3 text-center">
            <p className="text-sm">
              <Link to="/forgot-password" className="text-primary font-medium hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              {t('auth.dontHaveAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t('auth.register')}
              </Link>
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.backHome')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
