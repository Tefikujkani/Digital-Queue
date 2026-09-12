import React from 'react'
import { Download } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const InstallBanner: React.FC = () => {
  const { t } = useLanguage()

  return (
    <div className="lg:hidden px-4 pt-3">
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById('shkarko')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
          else window.location.href = '/#shkarko'
        }}
        className="w-full rounded-xl border border-primary/20 bg-primary text-white px-4 py-3 flex items-center justify-center gap-2 font-semibold text-sm"
      >
        <Download className="w-4 h-4" />
        {t('pwa.shkarko')}
      </button>
    </div>
  )
}

export default InstallBanner
