import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, Volume2, X, FileText, Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { postVoiceIntent, type VoiceGuide } from '../lib/voiceApi'
import {
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
} from '../lib/speech'
import { Button } from './ui/button'
import { cn } from './ui/utils'

type Props = {
  institutionId?: string
  serviceId?: string
  compact?: boolean
}

const VoiceAssistant: React.FC<Props> = ({ institutionId, serviceId, compact }) => {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [interim, setInterim] = useState('')
  const [heard, setHeard] = useState('')
  const [guide, setGuide] = useState<VoiceGuide | null>(null)
  const [error, setError] = useState('')
  const recRef = useRef<ReturnType<typeof getSpeechRecognition>>(null)
  const supported = isSpeechRecognitionSupported()

  useEffect(() => {
    return () => {
      recRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  const runIntent = useCallback(
    async (transcript: string) => {
      setBusy(true)
      setError('')
      try {
        const result = await postVoiceIntent({
          transcript,
          institutionId,
          serviceId,
          language,
        })
        setGuide(result)
        speakText(result.speak, language === 'en' ? 'en-US' : language === 'sr' ? 'sr-RS' : 'sq-AL')
      } catch {
        setError(t('voice.error'))
      } finally {
        setBusy(false)
      }
    },
    [institutionId, serviceId, language, t],
  )

  const startListen = () => {
    stopSpeaking()
    setError('')
    const rec = getSpeechRecognition(language)
    if (!rec) {
      setError(t('voice.unsupported'))
      return
    }
    recRef.current = rec
    rec.onresult = (event) => {
      let finalText = ''
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += chunk
        else live += chunk
      }
      setInterim(live)
      if (finalText.trim()) {
        setHeard(finalText.trim())
        setInterim('')
        runIntent(finalText.trim())
      }
    }
    rec.onerror = () => {
      setListening(false)
      setError(t('voice.micError'))
    }
    rec.onend = () => setListening(false)
    setListening(true)
    setOpen(true)
    rec.start()
  }

  const stopListen = () => {
    recRef.current?.stop()
    setListening(false)
  }

  const examples = [
    t('voice.example1'),
    t('voice.example2'),
    t('voice.example3'),
  ]

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] lg:bottom-24 right-3 sm:right-6 z-[61] w-[min(100vw-1.5rem,420px)] max-h-[min(62vh,680px)] overflow-y-auto rounded-xl border border-border bg-white shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-white">
              <div>
                <p className="text-sm font-semibold">{t('voice.title')}</p>
                <p className="text-[11px] text-white/75">{t('voice.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  stopListen()
                  stopSpeaking()
                }}
                className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <button
                type="button"
                onClick={listening ? stopListen : startListen}
                disabled={!supported || busy}
                className={cn(
                  'w-full h-24 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors',
                  listening
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted border-border text-primary hover:border-primary',
                )}
              >
                {busy ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : listening ? (
                  <Mic className="w-8 h-8" />
                ) : (
                  <MicOff className="w-7 h-7" />
                )}
                <span className="text-sm font-semibold">
                  {listening ? t('voice.listening') : busy ? t('voice.thinking') : t('voice.tapToSpeak')}
                </span>
              </button>

              {(interim || heard) && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{t('voice.youSaid')}: </span>
                  {interim || heard}
                </p>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {guide?.ok && (
                <div className="space-y-3">
                  {guide.service && (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">
                        {guide.institution?.name}
                      </p>
                      <p className="font-semibold text-primary">{guide.service.name}</p>
                    </div>
                  )}

                  {!!guide.documents?.length && (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">{t('voice.documents')}</p>
                      </div>
                      <ul className="space-y-1.5">
                        {guide.documents.map((doc) => (
                          <li key={doc} className="text-sm text-foreground pl-4 list-disc">
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {guide.when && (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">{t('voice.whenToGo')}</p>
                      </div>
                      <p className="text-sm">{guide.when.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('voice.waitNow', { n: guide.when.estimatedWaitMinutes })} ·{' '}
                        {t('voice.bestHour')}: {guide.when.bestWindow}
                      </p>
                    </div>
                  )}

                  {guide.institution?.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {guide.institution.address}
                      {guide.institution.city ? `, ${guide.institution.city}` : ''}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => guide.speak && speakText(guide.speak)}
                    >
                      <Volume2 className="w-4 h-4" />
                      {t('voice.repeat')}
                    </Button>
                    {guide.institution?.deepLink && (
                      <Button
                        size="sm"
                        onClick={() => navigate(guide.institution!.deepLink)}
                      >
                        {t('voice.goService')}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  {t('voice.trySaying')}
                </p>
                <div className="flex flex-col gap-1.5">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="text-left text-xs px-3 py-2 rounded-md bg-muted hover:bg-primary/8"
                      onClick={() => {
                        setHeard(ex)
                        setOpen(true)
                        runIntent(ex)
                      }}
                    >
                      “{ex}”
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={t('voice.title')}
        onClick={() => {
          if (open) {
            setOpen(false)
            stopListen()
            stopSpeaking()
          } else if (compact) {
            startListen()
          } else {
            setOpen(true)
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-5 right-[4.75rem] sm:right-24 z-[60] h-14 w-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-lg',
          listening && 'ring-4 ring-primary/30',
        )}
      >
        <Mic className="w-6 h-6" />
      </motion.button>
    </>
  )
}

export default VoiceAssistant
