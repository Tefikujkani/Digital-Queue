import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useNotifications } from '../contexts/NotificationContext'
import type { Language } from '../types'
import CommandPalette from './CommandPalette'
import {
  LayoutDashboard,
  Building2,
  Calendar,
  LogOut,
  Bell,
  Ticket,
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
  const [showNotifications, setShowNotifications] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: t('nav.institutions'), path: '/institutions', icon: Building2 },
    { name: t('nav.cities'), path: '/cities', icon: MapPin },
    { name: t('nav.appointments'), path: '/appointments', icon: Calendar },
  ]

  const dashboardPath =
    user?.role === 'superadmin'
      ? '/dashboard/superadmin'
      : user?.role === 'admin'
        ? '/dashboard/admin'
        : '/dashboard/citizen'

  return (
    <div className="fixed top-0 left-0 w-full z-[100] pt-[env(safe-area-inset-top)] bg-white">
      <div className="hidden lg:flex h-9 bg-secondary text-secondary-foreground text-xs">
        <div className="container mx-auto max-w-7xl px-5 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 font-semibold">
            <Link to="/help" className="hover:underline">
              {t('footer.help')}
            </Link>
            <Link to="/privacy" className="hidden sm:inline hover:underline">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="hidden sm:inline hover:underline">
              {t('footer.terms')}
            </Link>
          </div>
          <div className="flex items-center gap-3 font-bold tracking-wide">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={language === lang.code ? 'underline underline-offset-2' : 'opacity-70 hover:opacity-100'}
              >
                {lang.label === 'SQ' ? 'Shq' : lang.label === 'EN' ? 'Eng' : 'Srb'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav
        className={`bg-white border-b border-border ${
          scrolled ? 'shadow-[0_4px_18px_rgba(12,45,82,0.08)]' : ''
        }`}
      >
        <div className="container mx-auto max-w-7xl px-4 lg:px-5 flex justify-between items-center h-14 lg:h-[72px] gap-3 lg:gap-6">
          <Link to="/" className="flex items-center gap-2.5 lg:gap-3 group shrink-0">
            <div className="relative w-9 h-9 lg:w-10 lg:h-10 rounded-full btn-gradient flex items-center justify-center">
              <Ticket className="w-4 h-4 lg:w-5 lg:h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base lg:text-lg leading-none tracking-normal text-primary">SmartQueue</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary-foreground/70 mt-1 hidden sm:block">
                {t('brand.region')}
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  flex items-center gap-2 text-sm font-medium tracking-normal px-4 py-2.5 rounded-lg transition-colors
                  ${
                    location.pathname === link.path
                      ? 'text-primary bg-primary/8'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted'
                  }
                `}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3 ml-auto">
            <CommandPalette />

            {isAuthenticated ? (
              <>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl relative"
                    onClick={() => {
                      setShowNotifications(!showNotifications)
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-3 w-80 glass rounded-xl z-[300] overflow-hidden shadow-lg">
                      <div className="p-4 border-b border-border flex justify-between items-center">
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
                                  ? 'hover:bg-muted'
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
                <Button size="sm" className="ml-1 px-4" onClick={() => navigate(dashboardPath)}>
                  <LayoutDashboard className="w-4 h-4" />
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hidden xl:inline-flex"
                  onClick={() => navigate('/settings')}
                  title={t('nav.settings')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hidden xl:inline-flex"
                  onClick={() => navigate('/help')}
                  title={t('nav.help')}
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive px-3"
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

          {isAuthenticated && (
            <div className="lg:hidden relative">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-[min(100vw-2rem,20rem)] glass rounded-xl z-[300] overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{t('nav.notifications')}</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-primary">
                        {t('nav.markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        {t('nav.noNotifications')}
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`p-3 rounded-xl mb-1 ${
                            notif.read ? '' : 'bg-primary/10'
                          }`}
                          onClick={() => {
                            if (!notif.read) markAsRead(notif._id)
                            setShowNotifications(false)
                            if (notif.type === 'ticket_issued') navigate('/dashboard/citizen')
                          }}
                        >
                          <p className="text-sm font-semibold">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}

export default Navigation
