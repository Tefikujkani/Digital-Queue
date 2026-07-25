import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import api from '../lib/api'
import { toast } from 'sonner'
import { KeyRound, ArrowLeft } from 'lucide-react'

const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const email = useMemo(() => params.get('email') || '', [params])
  const token = useMemo(() => params.get('token') || '', [params])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Fjalëkalimet nuk përputhen')
      return
    }
    if (password.length < 8) {
      toast.error('Minimumi 8 karaktere')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, token, newPassword: password })
      toast.success('Fjalëkalimi u rivendos')
      navigate('/login')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Dështoi')
    } finally {
      setLoading(false)
    }
  }

  if (!email || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Link i pavlefshëm.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md surface-card rounded-3xl p-8 space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Kthehu te hyrja
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Rivendos fjalëkalimin</h1>
          <p className="text-sm text-muted-foreground mt-1">{email}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fjalëkalimi i ri</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Konfirmo</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12"
            />
          </div>
          <Button className="w-full h-12" disabled={loading}>
            <KeyRound className="w-4 h-4" />
            {loading ? 'Duke ruajtur…' : 'Ruaj fjalëkalimin'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
