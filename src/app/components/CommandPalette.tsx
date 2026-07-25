import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command'
import api from '../lib/api'
import {
  Building2,
  MapPin,
  Calendar,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Search,
} from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

type Inst = { _id: string; name: string; location?: { city?: string }; type?: string }

const CommandPalette: React.FC = () => {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [institutions, setInstitutions] = useState<Inst[]>([])
  const [cities, setCities] = useState<{ name: string; count: number }[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    Promise.all([api.get('/institutions'), api.get('/citizen/cities')])
      .then(([i, c]) => {
        setInstitutions(i.data || [])
        setCities(c.data?.cities || [])
      })
      .catch(() => {})
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        aria-label={t('cmd.placeholder')}
      >
        <Search className="w-3.5 h-3.5" />
        {t('cmd.placeholder')}
        <kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('cmd.placeholder')}
        description={t('cmd.placeholder')}
      >
        <CommandInput placeholder={t('cmd.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('cities.empty')}</CommandEmpty>
          <CommandGroup heading={t('cmd.pages')}>
            <CommandItem onSelect={() => go('/institutions')}>
              <Building2 /> {t('nav.institutions')}
            </CommandItem>
            <CommandItem onSelect={() => go('/cities')}>
              <MapPin /> {t('nav.cities')}
            </CommandItem>
            <CommandItem onSelect={() => go('/appointments')}>
              <Calendar /> {t('nav.appointments')}
            </CommandItem>
            <CommandItem onSelect={() => go('/dashboard/citizen')}>
              <LayoutDashboard /> {t('nav.dashboard')}
            </CommandItem>
            <CommandItem onSelect={() => go('/settings')}>
              <Settings /> {t('nav.settings')}
            </CommandItem>
            <CommandItem onSelect={() => go('/help')}>
              <HelpCircle /> {t('nav.help')}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t('nav.cities')}>
            {cities.slice(0, 10).map((c) => (
              <CommandItem
                key={c.name}
                value={`qytet ${c.name}`}
                onSelect={() => go(`/institutions?city=${encodeURIComponent(c.name)}`)}
              >
                <MapPin /> {c.name}
                <span className="ml-auto text-xs text-muted-foreground">{c.count}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t('cmd.institutions')}>
            {institutions.slice(0, 25).map((i) => (
              <CommandItem
                key={i._id}
                value={`${i.name} ${i.location?.city || ''}`}
                onSelect={() => go(`/queue/${i._id}`)}
              >
                <Building2 />
                <span className="truncate">{i.name}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {i.location?.city}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

export default CommandPalette
