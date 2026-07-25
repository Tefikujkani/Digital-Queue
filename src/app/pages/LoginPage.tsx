import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Lock, LogIn, Ticket } from 'lucide-react'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Ju lutemi mbushni të gjitha fushat')
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

      toast.success('Mirësevini përsëri!')
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center p-5 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="surface-card rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 btn-gradient rounded-2xl flex items-center justify-center mx-auto mb-5 glow-primary animate-pulse-glow">
              <Ticket className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">SmartQueue</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('auth.login')}</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="emri@shembull.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/50 border-white/8"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            <Button className="w-full h-12 text-base" onClick={handleLogin} disabled={loading}>
              {loading ? (
                t('common.loading')
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> {t('auth.login')}
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.dontHaveAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t('auth.register')}
              </Link>
            </p>
            <Button
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4" />
              Kthehu në Ballina
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
