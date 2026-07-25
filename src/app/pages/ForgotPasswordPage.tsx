import React, { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import api from '../lib/api'
import { toast } from 'sonner'
import { Mail, ArrowLeft } from 'lucide-react'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success('Nëse email ekziston, u dërgua linku')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Dështoi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md surface-card rounded-3xl p-8 space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Kthehu te hyrja
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Harruat fjalëkalimin?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Shkruaj emailin dhe do të marrësh link rivendosjeje.
          </p>
        </div>
        {sent ? (
          <p className="text-sm text-accent">
            Kontrollo inbox-in (dhe spam). Linku vlen 1 orë.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="emri@email.com"
                className="h-12"
              />
            </div>
            <Button className="w-full h-12" disabled={loading}>
              <Mail className="w-4 h-4" />
              {loading ? 'Duke dërguar…' : 'Dërgo linkun'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
