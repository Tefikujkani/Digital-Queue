import React from 'react'
import { Outlet, Link } from 'react-router'
import Navigation from '../components/Navigation'
import Chatbot from '../components/Chatbot'
import { Toaster } from '../components/ui/sonner'
import { Ticket } from 'lucide-react'

const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="ambient-orb w-[500px] h-[500px] bg-primary/20 -top-40 left-1/2 -translate-x-1/2 animate-pulse-slow" />
        <div className="ambient-orb w-[300px] h-[300px] bg-secondary/15 top-[40%] -right-20" />
        <div className="ambient-orb w-[250px] h-[250px] bg-accent/8 bottom-20 -left-16" />
      </div>

      <div className="relative z-10">
        <Navigation />
        <main className="pt-[72px]">
          <Outlet />
        </main>
        <Toaster position="top-right" expand={true} richColors theme="dark" />
        <Chatbot />
        {/* Command palette triggered from Navigation / ⌘K */}

        <footer className="border-t border-white/6 py-16 mt-8 relative">
          <div className="container mx-auto max-w-6xl px-5">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 btn-gradient rounded-xl flex items-center justify-center glow-primary-sm">
                    <Ticket className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-xl tracking-tight">SmartQueue</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Platforma digjitale për menaxhimin inteligjent të radhëve dhe termineve në Kosovë.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-5 text-white/90">Eksploro</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    <Link to="/" className="hover:text-primary transition-colors">
                      Ballina
                    </Link>
                  </li>
                  <li>
                    <Link to="/cities" className="hover:text-primary transition-colors">
                      Qytetet
                    </Link>
                  </li>
                  <li>
                    <Link to="/institutions" className="hover:text-primary transition-colors">
                      Institucionet
                    </Link>
                  </li>
                  <li>
                    <Link to="/appointments" className="hover:text-primary transition-colors">
                      Terminet
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-primary transition-colors">
                      Hyrja
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-5 text-white/90">Kategoritë</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Shërbimet Komunale</li>
                  <li>Shëndetësia (QMF)</li>
                  <li>Financa & Banka</li>
                  <li>Posta & Telekomi</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-5 text-white/90">Mbështetja</h4>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                      Email
                    </span>
                    <a href="mailto:info@smartqueue.gov" className="text-foreground font-medium">
                      info@smartqueue.gov
                    </a>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                      Telefon
                    </span>
                    <span className="text-foreground font-medium">+383 38 123 456</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/6 mt-14 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
              <p>&copy; 2026 SmartQueue Kosova. Të gjitha të drejtat e rezervuara.</p>
              <div className="flex gap-6">
                <Link to="/help" className="hover:text-primary transition-colors">
                  Ndihma
                </Link>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privatësia
                </Link>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Kushtet e Përdorimit
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default RootLayout
