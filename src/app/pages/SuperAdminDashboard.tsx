import React, { useState, useEffect } from 'react'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import api from '../lib/api'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  Search,
  Activity,
  MapPin,
  Power,
  ShieldCheck,
  Shield,
  User as UserIcon,
} from 'lucide-react'

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'institutions' | 'users'>('institutions')
  
  const [institutions, setInstitutions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [instRes, userRes] = await Promise.all([
        api.get('/institutions/all'),
        api.get('/auth/users')
      ])
      setInstitutions(instRes.data)
      setUsers(userRes.data)
    } catch (error) {
      toast.error(t('superadmin.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  const toggleInstitutionStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/institutions/${id}/status`, { isActive: !currentStatus })
      setInstitutions(prev => 
        prev.map(inst => inst._id === id ? { ...inst, isActive: !currentStatus } : inst)
      )
      toast.success(t('superadmin.statusChanged'))
    } catch (error) {
      toast.error(t('superadmin.statusFailed'))
    }
  }

  const filteredInstitutions = institutions.filter(i => 
    i.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (user?.role !== 'superadmin') {
    return <div className="min-h-screen pt-10 flex justify-center">{t('superadmin.noAccess')}</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-10 pb-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Badge className="bg-primary/10 text-primary border-primary/20 mb-3">
                <ShieldCheck className="w-3 h-3 mr-1 inline" />
                {t('superadmin.badge')}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold">{t('superadmin.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('superadmin.subtitle')}</p>
            </div>
            
            <div className="flex bg-muted p-1 rounded-xl w-full md:w-auto">
              <Button 
                variant={activeTab === 'institutions' ? 'default' : 'ghost'} 
                className={`flex-1 md:w-40 rounded-lg ${activeTab === 'institutions' ? 'shadow-sm' : ''}`}
                onClick={() => setActiveTab('institutions')}
              >
                <Building2 className="w-4 h-4 mr-2" /> {t('nav.institutions')}
              </Button>
              <Button 
                variant={activeTab === 'users' ? 'default' : 'ghost'} 
                className={`flex-1 md:w-40 rounded-lg ${activeTab === 'users' ? 'shadow-sm' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users className="w-4 h-4 mr-2" /> {t('superadmin.users')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder={t('common.search') + '...'} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-card border-border max-w-md"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'institutions' && filteredInstitutions.map(inst => (
              <Card key={inst._id} className="border-border rounded-2xl overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center p-4 gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${inst.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg">{inst.name}</h3>
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" /> {inst.location?.city}
                      <span className="mx-2">•</span>
                      <Activity className="w-4 h-4" /> {t('superadmin.servicesCount', { n: inst.services?.length || 0 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={inst.isActive ? "wait-low" : "wait-high"}>
                      {inst.isActive ? t('superadmin.active') : t('superadmin.inactive')}
                    </Badge>
                    <Button 
                      variant={inst.isActive ? 'destructive' : 'default'} 
                      size="sm"
                      className="rounded-lg"
                      onClick={() => toggleInstitutionStatus(inst._id, inst.isActive)}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      {inst.isActive ? t('superadmin.deactivate') : t('superadmin.activate')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {activeTab === 'users' && filteredUsers.map(u => (
              <Card key={u._id} className="border-border rounded-2xl overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center p-4 gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    u.role === 'superadmin' ? 'bg-warning/15 text-warning' :
                    u.role === 'admin' ? 'bg-primary/15 text-primary' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {u.role === 'superadmin' ? <ShieldCheck className="w-6 h-6" /> : 
                     u.role === 'admin' ? <Shield className="w-6 h-6" /> : 
                     <UserIcon className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg">{u.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                  </div>

                  <div>
                    <Badge variant="outline" className="uppercase text-xs tracking-wider">
                      {u.role}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}

            {(activeTab === 'institutions' && filteredInstitutions.length === 0) || 
             (activeTab === 'users' && filteredUsers.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard
