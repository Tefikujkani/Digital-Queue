import React, { useEffect, useState } from 'react'
import { Download, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react'
import { Button } from './ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import {
  isStandaloneApp,
  promptInstallApp,
  subscribeInstallReady,
} from '../lib/pwaInstall'

const DownloadApp: React.FC = () => {
  const { t } = useLanguage()
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandaloneApp())
    if (window.location.hash === '#shkarko') {
      window.setTimeout(() => document.getElementById('shkarko')?.scrollIntoView(), 80)
    }
    return subscribeInstallReady(() => {
      setInstalled(isStandaloneApp())
    })
  }, [])

  const onDownload = async () => {
    if (installed) return
    if (await promptInstallApp()) return
    document.getElementById('shkarko-hapat')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <section id="shkarko" className="px-4 sm:px-5 py-10 sm:py-12 lg:py-16 bg-[#0c4f91]/[0.04] border-y border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white border border-border shadow-sm p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl btn-gradient flex items-center justify-center shrink-0">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                iOS · Android
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-primary">{t('pwa.title')}</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">{t('pwa.subtitle')}</p>
            </div>
            <Button
              size="lg"
              className="h-14 px-8 w-full md:w-auto shrink-0"
              onClick={onDownload}
              disabled={installed}
            >
              {installed ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              {installed ? t('pwa.installed') : t('pwa.shkarko')}
            </Button>
          </div>

          {!installed && (
            <div id="shkarko-hapat" className="grid sm:grid-cols-2 gap-4 mt-8">
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <p className="font-semibold text-primary mb-3">iPhone / iPad</p>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <Share className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {t('pwa.iosStep1')}
                  </li>
                  <li className="flex gap-3">
                    <PlusSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {t('pwa.iosStep2')}
                  </li>
                  <li className="flex gap-3">
                    <Download className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {t('pwa.iosStep3')}
                  </li>
                </ol>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <p className="font-semibold text-primary mb-3">Android</p>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li>1. {t('pwa.androidStep1')}</li>
                  <li>2. {t('pwa.androidStep2')}</li>
                  <li>3. {t('pwa.androidStep3')}</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default DownloadApp
