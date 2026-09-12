import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, Volume2, X, FileText, Clock, MapPin, ArrowRight, Loader2, Send } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { postVoiceIntent, type VoiceGuide } from '../lib/voiceApi'
import {
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
} from '../lib/speech'
import { isAuthPath, useAssistantExclusive, useKeyboardInset, useOpenAssistant } from '../lib/assistantUi'
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
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const keyboardInset = useKeyboardInset()
  const peerOpen = useAssistantExclusive('voice', open, setOpen)
  useOpenAssistant('voice', setOpen)
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

  useEffect(() => {
    setOpen(false)
    stopListen()
    stopSpeaking()
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

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

  if (isAuthPath(location.pathname)) return null

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-0 z-[130] lg:inset-auto lg:bottom-24 lg:right-6 lg:w-[420px] lg:max-h-[min(72vh,680px)] flex flex-col bg-white shadow-xl border-border lg:rounded-xl lg:border overflow-hidden"
            style={{ paddingBottom: keyboardInset }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-primary text-white pt-[calc(0.75rem+env(safe-area-inset-top))] lg:pt-3 shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t('voice.title')}</p>
                <p className="text-[11px] text-white/75 truncate">{t('voice.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  stopListen()
                  stopSpeaking()
                }}
                className="w-10 h-10 rounded-md hover:bg-white/10 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {supported ? (
                <button
                  type="button"
                  onClick={listening ? stopListen : startListen}
                  disabled={busy}
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
              ) : (
                <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  {t('voice.typeHint')}
                </p>
              )}

              <form
                className="flex items-end gap-2 rounded-xl border border-border bg-muted/40 p-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const q = typed.trim()
                  if (!q || busy) return
                  setHeard(q)
                  setTyped('')
                  runIntent(q)
                }}
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={t('voice.typePlaceholder')}
                  enterKeyHint="send"
                  className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-white border border-border text-base outline-none"
                />
                <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !typed.trim()}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>

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

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => guide.speak && speakText(guide.speak)}
                    >
                      <Volume2 className="w-4 h-4" />
                      {t('voice.repeat')}
                    </Button>
                    {guide.institution?.deepLink && (
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setOpen(false)
                          navigate(guide.institution!.deepLink)
                        }}
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

      {!open && !peerOpen && (
        <motion.button
          type="button"
          aria-label={t('voice.title')}
          onClick={() => {
            if (compact) startListen()
            else setOpen(true)
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'hidden lg:flex fixed bottom-5 right-24 z-[60] h-14 w-14 rounded-full bg-secondary text-secondary-foreground items-center justify-center shadow-lg',
            listening && 'ring-4 ring-primary/30',
          )}
        >
          <Mic className="w-6 h-6" />
        </motion.button>
      )}
    </>
  )
}

export default VoiceAssistant
