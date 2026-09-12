import React, { useState } from 'react'
import { useLocation } from 'react-router'
import { Download, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { isStandaloneApp } from '../lib/pwaInstall'

const DISMISS_KEY = 'sq-install-banner-dismissed'

const InstallBanner: React.FC = () => {
  const { t } = useLanguage()
  const location = useLocation()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (location.pathname !== '/' || dismissed || isStandaloneApp()) return null

  return (
    <div className="lg:hidden px-4 pt-3">
      <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.07] px-3 py-2">
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('shkarko')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
            else window.location.href = '/#shkarko'
          }}
          className="flex-1 min-w-0 flex items-center gap-2 text-left text-sm font-semibold text-primary"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('pwa.shkarko')}</span>
        </button>
        <button
          type="button"
          aria-label={t('common.close')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-white"
          onClick={() => {
            setDismissed(true)
            try {
              sessionStorage.setItem(DISMISS_KEY, '1')
            } catch {
              /* ignore */
            }
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default InstallBanner
