import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Language } from '../types'
import { languageLocales, translations } from '../i18n/translations'

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

function getStoredLanguage(): Language {
  const stored = localStorage.getItem('language')
  if (stored === 'sq' || stored === 'en' || stored === 'sr') return stored
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
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

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

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languageLabel: languageLabels[language],
        locale: languageLocales[language],
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
