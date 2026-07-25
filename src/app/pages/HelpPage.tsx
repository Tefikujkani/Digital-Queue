import React from 'react'
import { Link, useNavigate } from 'react-router'
import { HelpCircle, MessageCircle, Ticket, Calendar, Bell, MapPin } from 'lucide-react'
import { Button } from '../components/ui/button'

const faqs = [
  {
    q: 'Si e marr një numër digjital?',
    a: 'Shko te Institucionet → zgjidh institucionin → zgjidh shërbimin → konfirmo dokumentet → Merr Numrin Digjital. Duhet të jesh i kyçur.',
  },
  {
    q: 'Çfarë është prioriteti (të moshuar, emergjencë…)?',
    a: 'Përdore vetëm nëse ke të drejtë. Prioriteti ndihmon radhën të jetë më e drejtë për rastet urgjente dhe personat me nevoja të veçanta.',
  },
  {
    q: 'Si rezervoj termin?',
    a: 'Nga Terminet zgjidh institucionin, shërbimin, datën dhe orën. Termini shfaqet si ticket me orar të planifikuar.',
  },
  {
    q: 'A funksionon në të gjithë Kosovën?',
    a: 'Po — filtro sipas qytetit (Prishtinë, Prizren, Pejë, Gjilan, etj.) ose hap faqen Qytetet.',
  },
  {
    q: 'Si i marr njoftimet?',
    a: 'Në aplikacion (zile), email dhe opsionalisht SMS. Kontrollo Cilësimet për kanalet që dëshiron.',
  },
  {
    q: 'Ku e shoh historikun e ticket-eve?',
    a: 'Në Panelin e Qytetarit. Mund të eksportosh historikun si CSV.',
  },
]

const HelpPage: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen pb-20">
      <div className="pt-12 px-5">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ndihma & FAQ</h1>
              <p className="text-muted-foreground text-sm">Udhëzues i shkurtër për qytetarët e Kosovës</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-10">
            {[
              { to: '/institutions', icon: Ticket, label: 'Merr numër' },
              { to: '/appointments', icon: Calendar, label: 'Termine' },
              { to: '/cities', icon: MapPin, label: 'Qytetet' },
            ].map((x) => (
              <Link
                key={x.to}
                to={x.to}
                className="surface-card rounded-2xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors"
              >
                <x.icon className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">{x.label}</span>
              </Link>
            ))}
          </div>

          <div className="space-y-3 mb-10">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="surface-card rounded-2xl px-5 py-4 group open:border-primary/30"
              >
                <summary className="font-semibold text-sm cursor-pointer list-none flex justify-between gap-3">
                  {f.q}
                  <span className="text-primary text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="rounded-3xl border border-accent/25 bg-accent/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="font-semibold">Asistenti SmartQueue</p>
                <p className="text-sm text-muted-foreground">
                  Hap chatbot-in poshtë djathtas për ndihmë live në shqip.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <Bell className="w-4 h-4" /> Cilësimet e njoftimeve
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
