import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useNotifications } from '../contexts/NotificationContext'
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
} from 'lucide-react'

const Navigation: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: t('nav.institutions'), path: '/institutions', icon: Building2 },
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

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setLanguage(language === 'sq' ? 'en' : 'sq')}
            >
              <Globe className="w-4 h-4" />
            </Button>

            {isAuthenticated ? (
              <>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl relative"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full glow-primary-sm" />
                    )}
                  </Button>
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-3 w-80 glass rounded-2xl z-[300] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                      <div className="p-4 border-b border-white/8 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">Njoftimet</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:underline"
                          >
                            Lexo të gjitha
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground text-sm">
                            Nuk keni asnjë njoftim
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
                                {new Date(notif.createdAt).toLocaleTimeString('sq-SQ', {
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
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.logout')}
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
                  <LogOut className="w-4 h-4" /> {t('auth.logout')}
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
