import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  Building2,
  Calendar,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
  Settings,
  HelpCircle,
  X,
  Download,
  Mic,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { isAuthPath, openAssistant } from '../lib/assistantUi'
import { launchVoiceAssistant } from '../lib/voiceLaunch'
import type { Language } from '../types'

const languages: { code: Language; label: string; native: string }[] = [
  { code: 'sq', label: 'Shq', native: 'Shqip' },
  { code: 'en', label: 'Eng', native: 'English' },
  { code: 'sr', label: 'Srb', native: 'Srpski' },
]

const MobileTabBar: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()
  const { isAuthenticated, logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const dashboardPath =
    user?.role === 'superadmin'
      ? '/dashboard/superadmin'
      : user?.role === 'admin'
        ? '/dashboard/admin'
        : '/dashboard/citizen'

  const accountPath = isAuthenticated ? dashboardPath : '/login'
  const accountActive =
    location.pathname.startsWith('/dashboard') || location.pathname === '/login'

  if (isAuthPath(location.pathname)) return null

  const tabs = [
    { to: '/', icon: Home, label: t('nav.tab.home'), active: location.pathname === '/' },
    {
      to: '/institutions',
      icon: Building2,
      label: t('nav.tab.institutions'),
      active: location.pathname.startsWith('/institutions') || location.pathname.startsWith('/queue'),
    },
    {
      to: '/appointments',
      icon: Calendar,
      label: t('nav.tab.appointments'),
      active: location.pathname.startsWith('/appointments'),
    },
    {
      to: accountPath,
      icon: isAuthenticated ? LayoutDashboard : LogIn,
      label: isAuthenticated ? t('nav.tab.dashboard') : t('nav.tab.login'),
      active: accountActive,
    },
  ]

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[120]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t('common.close')}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[min(88dvh,640px)] overflow-y-auto rounded-t-2xl bg-white border-t border-border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-base">{t('nav.more')}</p>
              <button
                type="button"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
                onClick={() => setMoreOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`h-11 rounded-lg text-sm font-semibold ${
                    language === lang.code
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {lang.native}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                className="flex w-full items-center gap-3 h-12 px-3 rounded-lg hover:bg-muted text-left"
                onClick={() => {
                  launchVoiceAssistant()
                  setMoreOpen(false)
                }}
              >
                <Mic className="w-5 h-5 text-primary" />
                {t('voice.title')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 h-12 px-3 rounded-lg hover:bg-muted text-left"
                onClick={() => {
                  setMoreOpen(false)
                  openAssistant('chat')
                }}
              >
                <MessageCircle className="w-5 h-5 text-primary" />
                {t('chat.title')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 h-12 px-3 rounded-lg hover:bg-muted text-left"
                onClick={() => {
                  setMoreOpen(false)
                  const el = document.getElementById('shkarko')
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                  else navigate('/#shkarko')
                }}
              >
                <Download className="w-5 h-5 text-primary" />
                {t('pwa.shkarko')}
              </button>
              <Link
                to="/cities"
                className="flex items-center gap-3 h-12 px-3 rounded-lg hover:bg-muted"
                onClick={() => setMoreOpen(false)}
              >
                <MapPin className="w-5 h-5 text-primary" />
                {t('nav.cities')}
              </Link>
              <Link
                to="/help"
                className="flex items-center gap-3 h-12 px-3 rounded-lg hover:bg-muted"
                onClick={() => setMoreOpen(false)}
              >
                <HelpCircle className="w-5 h-5 text-primary" />
                {t('nav.help')}
              </Link>
              {isAuthenticated && (
                <Link
                  to="/settings"
                  className="flex items-center gap-3 h-12 px-3 rounded-lg hover:bg-muted"
                  onClick={() => setMoreOpen(false)}
                >
                  <Settings className="w-5 h-5 text-primary" />
                  {t('nav.settings')}
                </Link>
              )}
              {isAuthenticated ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 h-12 px-3 rounded-lg text-destructive hover:bg-destructive/8"
                  onClick={() => {
                    setMoreOpen(false)
                    logout()
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  {t('nav.logout')}
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 h-12 px-3 rounded-lg bg-primary text-white mt-2"
                  onClick={() => {
                    setMoreOpen(false)
                    navigate('/register')
                  }}
                >
                  {t('nav.register')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-white/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-[3.75rem]">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={`min-w-0 flex flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold ${
                tab.active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-5 h-5 shrink-0" />
              <span className="leading-tight text-center truncate w-full">{tab.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`min-w-0 flex flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold ${
              moreOpen ||
              ['/cities', '/help', '/settings', '/privacy', '/terms'].includes(location.pathname)
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" />
            <span className="leading-tight text-center truncate w-full">{t('nav.tab.more')}</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default MobileTabBar
