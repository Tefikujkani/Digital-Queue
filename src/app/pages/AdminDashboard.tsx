import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueue } from '../contexts/QueueContext';
import api from '../lib/api';
import type { Institution, Counter } from '../types';
import {
  Users,
  Clock,
  TrendingUp,
  Activity,
  Phone,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Zap,
  QrCode,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../components/ui/input';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { tickets, callNextTicket, completeTicket, getWaitingTickets } = useQueue();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrInput, setQrInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const instId = user?.institutionId || (user as any)?._id || (user as any)?.id;

  useEffect(() => {
    const fetchData = async () => {
      if (!instId) { setLoading(false); return; }
      try {
        const [instRes, countRes, analRes] = await Promise.all([
          api.get(`/institutions/${instId}`).catch(() => ({ data: null })),
          api.get(`/institutions/${instId}/counters`).catch(() => ({ data: [] })),
          api.get(`/institutions/${instId}/analytics`).catch(() => ({ data: null }))
        ]);
        setInstitution(instRes.data);
        setCounters(countRes.data || []);
        setAnalytics(analRes.data);
        if (countRes.data && countRes.data.length > 0) {
          const firstCounter = countRes.data[0];
          setSelectedCounter(firstCounter.id || firstCounter._id || '');
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [instId]);

  const institutionTickets = tickets.filter(t =>
    t.institutionId === instId ||
    t.institutionId === institution?.id ||
    t.institutionId === (institution as any)?._id
  );

  const waitingTickets = instId ? getWaitingTickets(instId) : [];

  const todayTickets = institutionTickets.filter(t => {
    const today = new Date().toDateString();
    return new Date(t.createdAt).toDateString() === today;
  });

  const avgWaitTime = todayTickets.length > 0
    ? Math.round(todayTickets.reduce((sum, t) => sum + (t.estimatedWaitTime || 0), 0) / todayTickets.length)
    : 0;

  const activeCounters = counters.filter(c => c.isActive).length;

  const handleCallNext = async () => {
    if (instId && selectedCounter) {
      await callNextTicket(instId, selectedCounter);
    }
  };

  const handleCompleteService = async () => {
    const servingTicket = institutionTickets.find(
      t => (t.counterId === selectedCounter || (t as any).counterId === selectedCounter) && t.status === 'called'
    );
    if (servingTicket) {
      await completeTicket(servingTicket.id || (servingTicket as any)._id!);
    }
  };

  const handleCheckIn = async () => {
    if (!qrInput.trim() || !instId) return;
    setCheckingIn(true);
    try {
      const { data } = await api.post('/tickets/check-in', {
        qrCode: qrInput.trim(),
        institutionId: instId,
      });
      toast.success(`${t('admin.checkInOk')} · ${data.ticket?.number || ''}`);
      setQrInput('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('admin.checkInFailed'));
    } finally {
      setCheckingIn(false);
    }
  };

  const peakHoursData = {
    labels: analytics?.peakHoursData?.length > 0
      ? analytics.peakHoursData.map((d: any) => `${d.hour}:00`)
      : ['08:00', '10:00', '12:00', '14:00', '16:00'],
    datasets: [{
      label: t('dashboard.visitors'),
      data: analytics?.peakHoursData?.length > 0
        ? analytics.peakHoursData.map((d: any) => d.count)
        : [0, 0, 0, 0, 0],
      borderColor: '#6c5ce7',
      backgroundColor: 'rgba(108, 92, 231, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const serviceData = {
    labels: institution?.services?.length ? institution.services.map(s => s.name) : [t('queue.noServices')],
    datasets: [{
      data: institution?.services?.length ? institution.services.map(() => 0) : [0],
      backgroundColor: ['#6c5ce7', '#a29bfe', '#00cec9', '#fdcb6e', '#74b9ff'],
      borderWidth: 0,
    }],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8 rounded-2xl">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('admin.accessDenied')}</h2>
          <p className="text-muted-foreground mb-6">{t('admin.unauthorized')}</p>
          <Button className="rounded-xl" onClick={() => window.location.href = '/'}>{t('common.backHome')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="pt-10 pb-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
                <LayoutDashboard className="w-4 h-4" />
                {t('nav.admin')}
              </div>
              <h1 className="text-3xl font-bold">
                {institution?.name || 'SmartQueue'} <span className="text-primary">{t('admin.monitor')}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 wait-low rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              {t('admin.systemLive')}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-6 pb-20">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('dashboard.activeCounters'), value: activeCounters, icon: Activity, color: 'text-primary' },
            { label: t('dashboard.waitingTickets'), value: waitingTickets.length, icon: Users, color: 'text-amber-600' },
            { label: t('dashboard.todayVisitors'), value: todayTickets.length, icon: TrendingUp, color: 'text-emerald-600' },
            { label: t('dashboard.avgWaitTime'), value: `${avgWaitTime} min`, icon: Clock, color: 'text-blue-600' },
          ].map((stat, i) => (
            <Card key={i} className="border border-border rounded-2xl">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Counter Control */}
          <Card className="border border-primary/20 rounded-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-semibold">{t('admin.counterManagement')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t('admin.selectCounter')}</label>
                <Select value={selectedCounter} onValueChange={setSelectedCounter}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder={t('admin.selectCounterPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {counters.map(counter => (
                      <SelectItem key={counter.id || (counter as any)._id} value={counter.id || (counter as any)._id}>
                        {counter.name || `Sporteli ${counter.number}`}
                      </SelectItem>
                    ))}
                    {counters.length === 0 && <SelectItem value="none" disabled>{t('admin.noCounters')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-6 bg-muted rounded-2xl text-center">
                <p className="text-xs font-medium text-primary mb-1">{t('admin.nextInQueue')}</p>
                <div className="text-5xl font-bold">
                  {waitingTickets.length > 0 ? waitingTickets[0].number : '---'}
                </div>
              </div>

              <div className="grid gap-3">
                <Button className="h-14 rounded-xl text-base" onClick={handleCallNext} disabled={waitingTickets.length === 0 || !selectedCounter}>
                  <Phone className="w-5 h-5 mr-2" /> {t('dashboard.callNext')}
                </Button>
                <Button className="h-12 rounded-xl" variant="outline" onClick={handleCompleteService} disabled={!selectedCounter}>
                  <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" /> {t('dashboard.completeService')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Check-in */}
          <Card className="border border-sky-500/25 rounded-2xl lg:col-span-3">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-400" /> {t('admin.checkInTitle')}
              </CardTitle>
              <CardDescription>
                {t('admin.checkInDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 flex flex-col sm:flex-row gap-3">
              <Input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="SQK:… ose ngjit kodin QR"
                className="h-12 rounded-xl flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              />
              <Button className="h-12 rounded-xl px-6" onClick={handleCheckIn} disabled={checkingIn || !qrInput.trim()}>
                {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                {t('admin.checkIn')}
              </Button>
            </CardContent>
          </Card>

          {/* Waiting List */}
          <Card className="lg:col-span-2 border border-border rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <CardTitle className="text-lg font-semibold">{t('admin.waitingList')}</CardTitle>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {waitingTickets.length} {t('admin.citizensCount')}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {waitingTickets.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>{t('admin.queueEmpty')}</p>
                  </div>
                ) : (
                  waitingTickets.map((ticket, index) => (
                    <div key={ticket.id || (ticket as any)._id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm font-bold">{index + 1}</div>
                        <div>
                          <p className="font-semibold text-lg">{ticket.number}</p>
                          <p className="text-sm text-muted-foreground">{ticket.userName || t('auth.citizen')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={ticket.priority === 'normal' ? 'outline' : 'default'} className={ticket.priority !== 'normal' ? 'bg-rose-100 text-rose-700 border-rose-200' : ''}>
                          {t(`priority.${ticket.priority}`)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />{ticket.estimatedWaitTime} min
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border border-border rounded-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold">{t('dashboard.peakHours')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              <Line data={peakHoursData} options={{ responsive: true, maintainAspectRatio: false }} />
            </CardContent>
          </Card>
          <Card className="border border-border rounded-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold">{t('admin.topServices')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex items-center justify-center h-[300px]">
              <div className="w-[200px]"><Doughnut data={serviceData} /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
