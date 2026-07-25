import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useNotifications } from '../contexts/NotificationContext'
import type { Language } from '../types'
import CommandPalette from './CommandPalette'
import {
  Menu,
  X,
  LayoutDashboard,
  Building2,
  Calendar,
  LogOut,
  Globe,
  Bell,
  Ticket,
  Check,
  ChevronDown,
  MapPin,
  Settings,
  HelpCircle,
} from 'lucide-react'

const languages: { code: Language; label: string; native: string }[] = [
  { code: 'sq', label: 'SQ', native: 'Shqip' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'sr', label: 'SR', native: 'Srpski' },
]

const Navigation: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { t, language, setLanguage, locale } = useLanguage()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)

  const currentLang = languages.find((l) => l.code === language) || languages[0]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = [
    { name: t('nav.institutions'), path: '/institutions', icon: Building2 },
    { name: 'Qytetet', path: '/cities', icon: MapPin },
    { name: t('nav.appointments'), path: '/appointments', icon: Calendar },
  ]

  const dashboardPath =
    user?.role === 'superadmin'
      ? '/dashboard/superadmin'
      : user?.role === 'admin'
        ? '/dashboard/admin'
        : '/dashboard/citizen'

  return (
    <div className="fixed top-0 left-0 w-full z-[100]">
      <nav
        className={`
          transition-all duration-500 border-b
          ${
            scrolled
              ? 'glass border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
              : 'bg-transparent border-transparent'
          }
        `}
      >
        <div className="container mx-auto max-w-6xl px-5 flex justify-between items-center h-[72px]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl btn-gradient flex items-center justify-center glow-primary-sm group-hover:glow-primary transition-all duration-300">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none tracking-tight">SmartQueue</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mt-0.5">
                Kosova
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-300
                  ${
                    location.pathname === link.path
                      ? 'text-white bg-primary/20 border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }
                `}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            ))}

            <div className="h-5 w-px bg-white/10 mx-3" />
            <CommandPalette />
            <div className="h-5 w-px bg-white/10 mx-3" />

            <div className="relative" ref={langMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 px-3"
                onClick={() => {
                  setShowLangMenu((open) => !open)
                  setShowNotifications(false)
                }}
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wide">{currentLang.label}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
              {showLangMenu && (
                <div className="absolute top-full right-0 mt-2 w-44 glass rounded-xl z-[300] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                        language === lang.code
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                      onClick={() => {
                        setLanguage(lang.code)
                        setShowLangMenu(false)
                        setIsOpen(false)
                      }}
                    >
                      <span className="w-4 flex justify-center">
                        {language === lang.code ? <Check className="w-3.5 h-3.5 text-primary" /> : null}
                      </span>
                      <span className="font-medium">{lang.native}</span>
                      <span className="ml-auto text-[10px] font-bold tracking-wide opacity-60">
                        {lang.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl relative"
                    onClick={() => {
                      setShowNotifications(!showNotifications)
                      setShowLangMenu(false)
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full glow-primary-sm" />
                    )}
                  </Button>
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-3 w-80 glass rounded-2xl z-[300] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                      <div className="p-4 border-b border-white/8 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">{t('nav.notifications')}</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:underline"
                          >
                            {t('nav.markAllRead')}
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground text-sm">
                            {t('nav.noNotifications')}
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif._id}
                              className={`p-3 rounded-xl mb-1 cursor-pointer transition-colors ${
                                notif.read
                                  ? 'hover:bg-white/5'
                                  : 'bg-primary/10 hover:bg-primary/15'
                              }`}
                              onClick={() => {
                                if (!notif.read) markAsRead(notif._id)
                                setShowNotifications(false)
                                if (notif.type === 'ticket_issued') navigate('/dashboard/citizen')
                              }}
                            >
                              <p className="text-sm font-semibold">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-2">
                                {new Date(notif.createdAt).toLocaleTimeString(locale, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Button size="sm" className="ml-1" onClick={() => navigate(dashboardPath)}>
                  <LayoutDashboard className="w-4 h-4" />
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => navigate('/settings')}
                  title="Cilësimet"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => navigate('/help')}
                  title="Ndihma"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  {t('auth.login')}
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  {t('auth.register')}
                </Button>
              </div>
            )}
          </div>

          <button
            className="md:hidden w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass border-b border-primary/20 p-5 z-[200] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 text-base font-medium text-muted-foreground hover:text-primary transition-colors py-3 px-3 rounded-xl hover:bg-white/5"
                onClick={() => setIsOpen(false)}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-white/8 my-3" />
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {t('nav.language')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code)
                      setIsOpen(false)
                    }}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      language === lang.code
                        ? 'bg-primary/20 text-white border border-primary/40'
                        : 'bg-white/5 text-muted-foreground border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-white/8 my-3" />
            {isAuthenticated ? (
              <>
                <Link
                  to={dashboardPath}
                  className="flex items-center gap-3 text-base font-medium py-3 px-3"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  {t('nav.dashboard')}
                </Link>
                <Button className="w-full h-12 mt-2" variant="destructive" onClick={logout}>
                  <LogOut className="w-4 h-4" /> {t('nav.logout')}
                </Button>
              </>
            ) : (
              <div className="grid gap-3 pt-2">
                <Button className="h-12" variant="outline" onClick={() => navigate('/login')}>
                  {t('auth.login')}
                </Button>
                <Button className="h-12" onClick={() => navigate('/register')}>
                  {t('auth.register')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Navigation
