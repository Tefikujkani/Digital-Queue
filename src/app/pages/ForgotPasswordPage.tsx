import React, { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import api from '../lib/api'
import { toast } from 'sonner'
import { Mail, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const ForgotPasswordPage: React.FC = () => {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success(t('auth.checkInbox'))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-8.5rem)] flex items-center justify-center px-4 py-8 sm:px-5 sm:py-16">
      <div className="w-full max-w-md surface-card rounded-xl p-5 sm:p-8 space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> {t('auth.backToLogin')}
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-semibold">{t('auth.forgotPassword')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('auth.forgotSubtitle')}</p>
        </div>
        {sent ? (
          <p className="text-sm text-accent">{t('auth.checkInbox')}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="h-12"
              />
            </div>
            <Button className="w-full h-12" disabled={loading}>
              <Mail className="w-4 h-4" />
              {loading ? t('auth.sending') : t('auth.sendLink')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
