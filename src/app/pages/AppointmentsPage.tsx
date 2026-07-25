import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueue } from '../contexts/QueueContext';
import { Calendar as CalendarIcon, Clock, MapPin, Check, ChevronRight, Zap, Info, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Institution, Service } from '../types';
import api from '../lib/api';

const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { getTicket, tickets } = useQueue();
  
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fetch institutions
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await api.get('/institutions');
        setInstitutions(response.data);
      } catch (error) {
        console.error('Failed to fetch institutions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutions();
  }, []);

  // Fetch services when institution changes
  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedInstitution) {
        setServices([]);
        return;
      }
      try {
        const response = await api.get(`/institutions/${selectedInstitution}/services`);
        setServices(response.data);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      }
    };
    fetchServices();
  }, [selectedInstitution]);

  const handleBook = async () => {
    if (!isAuthenticated) {
      toast.error('Ju lutemi kyçuni për të rezervuar termin');
      navigate('/login');
      return;
    }

    if (!selectedInstitution || !selectedService || !selectedDate || !selectedTime) {
      toast.error('Ju lutemi plotësoni të gjitha fushat e detyrueshme');
      return;
    }

    setBookingLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await getTicket(
        selectedInstitution,
        selectedService,
        'normal',
        user?.name || 'Qytetar',
        dateStr,
        selectedTime
      );
      toast.success('Termini u rezervua me sukses!');
      navigate(`/queue/${selectedInstitution}`);
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setBookingLoading(false);
    }
  };

  const upcomingAppointments = tickets.filter(t => 
    t.status === 'waiting' && t.userId === (user?.id || (user as any)?._id)
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[100px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/5 blur-[100px] -z-10 rounded-full" />

      <div className="pt-10 pb-8 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="space-y-3">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                Sistemi i Termineve
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('nav.appointments')}</h1>
              <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
                Rezervoni terminin tuaj paraprakisht për të evituar pritjet e gjata.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
            <Card className="glass border-white/5 overflow-hidden rounded-[2.5rem] shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-white/[0.02] p-8">
                <CardTitle className="text-2xl font-black">{t('appointment.book')}</CardTitle>
                <CardDescription className="text-lg">Plotësoni detajet e rezervimit</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{t('institution.selectInstitution')} *</Label>
                      <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                        <SelectTrigger className="h-14 rounded-2xl glass border-white/10 text-lg font-bold">
                          <SelectValue placeholder="Zgjidhni institucionin" />
                        </SelectTrigger>
                        <SelectContent className="glass border-white/10">
                          {institutions.map(inst => (
                            <SelectItem key={inst.id || (inst as any)._id} value={inst.id || (inst as any)._id} className="font-bold py-3">
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{t('institution.selectService')} *</Label>
                      <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedInstitution}>
                        <SelectTrigger className="h-14 rounded-2xl glass border-white/10 text-lg font-bold">
                          <SelectValue placeholder="Zgjidhni shërbimin" />
                        </SelectTrigger>
                        <SelectContent className="glass border-white/10">
                          {services.map(service => (
                            <SelectItem key={service.id || (service as any)._id} value={service.id || (service as any)._id} className="font-bold py-3">
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Zgjidhni Datën *</Label>
                    <div className="glass rounded-2xl p-2 border-white/5">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-xl border-0" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Koha e Disponueshme *</Label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30'].map(time => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        className={`rounded-xl h-12 font-semibold ${
                          selectedTime === time
                            ? 'glow-primary-sm'
                            : 'bg-muted/40 border-white/8 text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button 
                  className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-primary/20" 
                  onClick={handleBook}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
                  Rezervo Terminin
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <div className="space-y-8">
            <Card className="glass border-white/5 overflow-hidden rounded-[2.5rem]">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xl font-bold">Terminet e Mia</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 glass p-1 rounded-xl mb-6">
                    <TabsTrigger value="upcoming" className="rounded-lg font-bold">Të Ardhshme</TabsTrigger>
                    <TabsTrigger value="past" className="rounded-lg font-bold">Të Kaluara</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upcoming" className="space-y-4 mt-0">
                    {upcomingAppointments.length === 0 ? (
                      <div className="text-center py-12 opacity-20">
                         <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                         <p className="font-bold">Nuk keni termine</p>
                      </div>
                    ) : (
                      upcomingAppointments.map(appointment => (
                        <div key={appointment.id || (appointment as any)._id} className="p-5 glass border-white/5 rounded-2xl space-y-4 hover:bg-white/5 transition-all group">
                          <div className="flex items-center justify-between">
                            <p className="font-black text-foreground group-hover:text-primary transition-colors">
                              {institutions.find(i => (i.id || (i as any)._id) === appointment.institutionId)?.name || 'Institucioni'}
                            </p>
                            <Badge className={`${appointment.status === 'called' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'} border-0 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest`}>
                              {appointment.status === 'called' ? 'Thirrur' : 'Në Pritje'}
                            </Badge>
                          </div>
                          <p className="text-sm font-bold text-muted-foreground">
                            {services.find(s => (s.id || (s as any)._id) === appointment.serviceId)?.name || 'Shërbimi'}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                             <div className="flex items-center gap-4 text-xs font-bold">
                               <div className="flex items-center gap-1.5">
                                 <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                                 {new Date(appointment.createdAt).toLocaleDateString()}
                               </div>
                               <div className="flex items-center gap-1.5">
                                 <Clock className="w-3.5 h-3.5 text-amber-500" />
                                 {appointment.number}
                               </div>
                             </div>
                             <Button 
                               size="icon" 
                               variant="ghost" 
                               className="h-8 w-8 rounded-lg hover:bg-rose-500/20 hover:text-rose-500"
                               onClick={() => useQueue().cancelTicket(appointment.id || (appointment as any)._id)}
                             >
                                <X className="w-4 h-4" />
                             </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="past" className="mt-0">
                    <div className="text-center py-12 opacity-20">
                         <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                         <p className="font-bold">Historiku bosh</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="glass border-white/5 rounded-[2rem] bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                   <Info className="w-5 h-5 text-primary" />
                   Informacione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {[
                  'Mbërrini 10 minuta para kohës së caktuar.',
                  'Sigurohuni që keni ID-në me vete.',
                  'Anuloni të paktën 24 orë përpara.'
                ].map((tip, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;
