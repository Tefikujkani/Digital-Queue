import React from 'react'
import { Outlet, Link } from 'react-router'
import Navigation from '../components/Navigation'
import MobileTabBar from '../components/MobileTabBar'
import InstallBanner from '../components/InstallBanner'
import Chatbot from '../components/Chatbot'
import VoiceAssistant from '../components/VoiceAssistant'
import { Toaster } from '../components/ui/sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { Ticket } from 'lucide-react'

const RootLayout: React.FC = () => {
  const { t, language } = useLanguage()

  return (
    <div
      className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative overflow-x-hidden"
      data-lang={language}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg"
      >
        {t('a11y.skipContent')}
      </a>
      <div className="relative z-10">
        <Navigation />
        <main
          id="main-content"
          className="pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-[108px] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0"
          key={`page-${language}`}
        >
          <InstallBanner />
          <Outlet />
        </main>
        <MobileTabBar />
        <Toaster position="top-right" expand={true} richColors theme="light" />
        <Chatbot key={`chat-${language}`} />
        <VoiceAssistant key={`voice-${language}`} />

        <footer className="hidden lg:block bg-primary text-white py-16 mt-8 relative">
          <div className="container mx-auto max-w-6xl px-5">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <h3 className="font-semibold text-xl tracking-tight text-white">SmartQueue</h3>
                </div>
                <p className="text-white/75 text-sm leading-relaxed">
                  {t('footer.tagline')}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-5 text-white">{t('footer.explore')}</h4>
                <ul className="space-y-3 text-sm text-white/75">
                  <li>
                    <Link to="/" className="hover:text-secondary transition-colors">
                      {t('nav.home')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/cities" className="hover:text-secondary transition-colors">
                      {t('footer.cities')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/institutions" className="hover:text-secondary transition-colors">
                      {t('nav.institutions')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/appointments" className="hover:text-secondary transition-colors">
                      {t('nav.appointments')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-secondary transition-colors">
                      {t('nav.login')}
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-5 text-white">{t('footer.categories')}</h4>
                <ul className="space-y-3 text-sm text-white/75">
                  <li>{t('institution.filter.municipality')}</li>
                  <li>{t('institution.filter.hospital')}</li>
                  <li>{t('institution.filter.bank')}</li>
                  <li>{t('institution.filter.post')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-5 text-white">{t('footer.support')}</h4>
                <ul className="space-y-4 text-sm text-white/75">
                  <li className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">
                      Email
                    </span>
                    <a href="mailto:info@smartqueue.gov" className="text-white font-medium">
                      info@smartqueue.gov
                    </a>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">
                      {t('auth.phone')}
                    </span>
                    <span className="text-white font-medium">+383 38 123 456</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/15 mt-14 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/70">
              <p>&copy; 2026 SmartQueue {t('brand.region')}. {t('footer.rights')}</p>
              <div className="flex gap-6">
                <Link to="/help" className="hover:text-secondary transition-colors">
                  {t('footer.help')}
                </Link>
                <Link to="/privacy" className="hover:text-secondary transition-colors">
                  {t('footer.privacy')}
                </Link>
                <Link to="/terms" className="hover:text-secondary transition-colors">
                  {t('footer.terms')}
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
