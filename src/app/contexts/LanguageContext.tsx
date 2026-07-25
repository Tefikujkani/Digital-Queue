import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { Language } from '../types'
import { languageLocales, translations } from '../i18n/translations'
import { toast } from 'sonner'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  languageLabel: string
  locale: string
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const languageLabels: Record<Language, string> = {
  sq: 'SQ',
  en: 'EN',
  sr: 'SR',
}

const htmlLang: Record<Language, string> = {
  sq: 'sq',
  en: 'en',
  sr: 'sr',
}

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem('smartqueue_language') || localStorage.getItem('language')
    if (stored === 'sq' || stored === 'en' || stored === 'sr') return stored
  } catch {
    /* ignore */
  }
  return 'sq'
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template,
  )
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage)

  const setLanguage = useCallback((lang: Language) => {
    if (lang !== 'sq' && lang !== 'en' && lang !== 'sr') return
    setLanguageState(lang)
    try {
      localStorage.setItem('smartqueue_language', lang)
      localStorage.setItem('language', lang) // legacy key
    } catch {
      /* ignore */
    }
    const dict = translations[lang]
    toast.success(dict['lang.changed'] || 'Language changed')
  }, [])

  useEffect(() => {
    document.documentElement.lang = htmlLang[language]
    document.documentElement.setAttribute('data-language', language)
  }, [language])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const raw =
        translations[language][key] ||
        translations.en[key] ||
        translations.sq[key] ||
        key
      return interpolate(raw, vars)
    },
    [language],
  )

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languageLabel: languageLabels[language],
      locale: languageLocales[language],
      t,
    }),
    [language, setLanguage, t],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
