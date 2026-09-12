import React, { useEffect, useRef, useState } from 'react'
import { Clock, FileText, Loader2, Volume2 } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchVoiceBriefing, type VoiceGuide } from '../lib/voiceApi'
import { translateDocument } from '../i18n/translate'
import { onSpeakState, speakText, stopSpeaking } from '../lib/speech'
import { Button } from './ui/button'
import { toast } from 'sonner'

type Props = {
  institutionId?: string
  serviceId?: string
  serviceName?: string
  showChecklist?: boolean
  docsChecked?: Record<string, boolean>
  onDocsCheckedChange?: (next: Record<string, boolean>) => void
  onGuide?: (guide: VoiceGuide | null) => void
}

const ServiceVoicePanel: React.FC<Props> = ({
  institutionId,
  serviceId,
  serviceName,
  showChecklist,
  docsChecked,
  onDocsCheckedChange,
  onGuide,
}) => {
  const { t, language } = useLanguage()
  const [guide, setGuide] = useState<VoiceGuide | null>(null)
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const lang = language === 'en' ? 'en' : language === 'sr' ? 'sr' : 'sq'
  const onGuideRef = useRef(onGuide)
  onGuideRef.current = onGuide

  useEffect(() => onSpeakState(setSpeaking), [])

  useEffect(() => {
    if (!institutionId || !serviceId) {
      setGuide(null)
      onGuideRef.current?.(null)
      return
    }

    let cancelled = false
    const run = async () => {
      setBusy(true)
      try {
        const result = await fetchVoiceBriefing({
          institutionId,
          serviceId,
          service: serviceName,
          lang,
        })
        if (cancelled) return
        setGuide(result)
        onGuideRef.current?.(result)
        await speakText(
          result.speak,
          lang === 'en' ? 'en-US' : lang === 'sr' ? 'sr-RS' : 'sq-AL',
        )
      } catch {
        if (!cancelled) toast.error(t('voice.error'))
      } finally {
        if (!cancelled) setBusy(false)
      }
    }

    void run()
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [institutionId, serviceId, serviceName, lang, t])

  if (!serviceId) return null

  const documents = guide?.documents?.length ? guide.documents : []

  return (
    <div className="rounded-2xl border border-[#f5c400]/40 bg-[#0c4f91]/[0.04] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0c4f91]">{t('voice.serviceGuide')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('voice.autoHint')}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f5c400]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0c4f91]">
          <Volume2 className={`w-3 h-3 ${speaking ? 'animate-pulse' : ''}`} />
          {speaking ? t('voice.speakingNow') : t('voice.kosovoVoice')}
        </span>
      </div>

      {busy && !guide && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('voice.thinking')}
        </p>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0c4f91]" />
            <p className="text-sm font-semibold">{t('voice.documents')}</p>
          </div>
          {showChecklist ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <label key={doc} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!docsChecked?.[doc]}
                    onChange={(e) =>
                      onDocsCheckedChange?.({
                        ...(docsChecked || {}),
                        [doc]: e.target.checked,
                      })
                    }
                    className="rounded border-white/20"
                  />
                  <span>{translateDocument(doc, t)}</span>
                </label>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {documents.map((doc) => (
                <li key={doc} className="flex gap-2">
                  <span className="text-[#f5c400] mt-1.5">•</span>
                  <span>{translateDocument(doc, t)}</span>
                </li>
              ))}
            </ul>
          )}
          {showChecklist && (
            <p className="text-xs text-muted-foreground">{t('voice.confirmDocs')}</p>
          )}
        </div>
      )}

      {guide?.when && (
        <div className="rounded-xl bg-white/70 border border-[#0c4f91]/10 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0c4f91]" />
            <p className="text-sm font-semibold">{t('voice.whenToGo')}</p>
          </div>
          <p className="text-sm">{guide.when.label}</p>
          <p className="text-xs text-muted-foreground">
            {t('voice.waitNow', { n: guide.when.estimatedWaitMinutes })} · {t('voice.bestHour')}:{' '}
            {guide.when.bestWindow}
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-[#0c4f91]/20"
        disabled={busy || !guide?.speak}
        onClick={() => guide?.speak && speakText(guide.speak, lang === 'en' ? 'en-US' : 'sq-AL')}
      >
        <Volume2 className="w-4 h-4" />
        {t('voice.repeat')}
      </Button>
    </div>
  )
}

export default ServiceVoicePanel
