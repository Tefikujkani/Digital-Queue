import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  Mic,
  MicOff,
  Volume2,
  X,
  FileText,
  Clock,
  MapPin,
  ArrowRight,
  Loader2,
  Send,
  AlertCircle,
} from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { postVoiceIntent, transcribeAudio, type VoiceGuide } from '../lib/voiceApi'
import {
  audioPeak,
  blobLooksSilent,
  canRecordAudio,
  createVoiceRecorder,
  type VoiceRecorder,
} from '../lib/audioRecord'
import {
  getSpeechRecognition,
  isBrowserSpeechReliable,
  speakText,
  stopSpeaking,
  unlockSpeechPlayback,
} from '../lib/speech'
import { isAuthPath, useAssistantExclusive, useKeyboardInset, useOpenAssistant } from '../lib/assistantUi'
import { launchVoiceAssistant } from '../lib/voiceLaunch'
import { isMicCaptureSupported, micDeniedGuideKey, requestMicrophone, stopMicStream } from '../lib/micPermission'
import { isLocalSttWarm } from '../lib/transcribeLocal'
import {
  playMicDenied,
  playMicGranted,
  playMicHeard,
  playMicStart,
  playMicStop,
  unlockMicAudio,
} from '../lib/micSounds'
import { Button } from './ui/button'
import { cn } from './ui/utils'

type Props = {
  institutionId?: string
  serviceId?: string
  compact?: boolean
}

type MicPhase = 'ready' | 'denied' | 'typeonly'

const VoiceAssistant: React.FC<Props> = ({ institutionId, serviceId }) => {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const keyboardInset = useKeyboardInset()
  const peerOpen = useAssistantExclusive('voice', open, setOpen)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [interim, setInterim] = useState('')
  const [heard, setHeard] = useState('')
  const [guide, setGuide] = useState<VoiceGuide | null>(null)
  const [error, setError] = useState('')
  const [micPhase, setMicPhase] = useState<MicPhase>('ready')
  const [preparingStt, setPreparingStt] = useState(false)
  const recRef = useRef<ReturnType<typeof getSpeechRecognition>>(null)
  const recorderRef = useRef<VoiceRecorder | null>(null)
  const typedLenRef = useRef(0)
  const startListenRef = useRef<(forceRecord?: boolean) => Promise<void>>(async () => {})
  const stopListenRef = useRef<() => Promise<void>>(async () => {})
  const skipAskRef = useRef(false)
  const speechOk = isBrowserSpeechReliable()
  const canRecord = canRecordAudio()
  const canCapture = isMicCaptureSupported()

  useEffect(() => {
    return () => {
      recRef.current?.stop()
      void recorderRef.current?.stop().catch(() => {})
      stopMicStream()
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (skipAskRef.current) {
      skipAskRef.current = false
      return
    }
    if (!canCapture && !speechOk) {
      setMicPhase('typeonly')
      return
    }
    setMicPhase((current) => (current === 'denied' ? 'denied' : 'ready'))
  }, [open, canCapture, speechOk])

  const prevPath = useRef(location.pathname)
  useEffect(() => {
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname
    setOpen(false)
    recRef.current?.stop()
    void recorderRef.current?.stop().catch(() => {})
    setListening(false)
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

  const submitTyped = useCallback(
    (text: string) => {
      const q = text.trim()
      if (!q || busy) return
      setHeard(q)
      setTyped('')
      typedLenRef.current = 0
      runIntent(q)
    },
    [busy, runIntent],
  )

  const beginRecognition = useCallback((langTry?: string) => {
    stopSpeaking()
    setError('')
    const rec = getSpeechRecognition(langTry || language)
    if (!rec) {
      void startListenRef.current(true)
      return
    }
    recRef.current = rec
    let gotFinal = false
    let ended = false
    let liveBest = ''
    const watchdog = window.setTimeout(() => {
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
    }, 10000)
    rec.onresult = (event) => {
      let finalText = ''
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += chunk
        else live += chunk
      }
      if (live.trim()) liveBest = live.trim()
      setInterim(live || finalText)
      const spoken = (finalText || liveBest).trim()
      if (finalText.trim() || (event.results[event.results.length - 1] as any)?.isFinal) {
        if (!spoken) return
        gotFinal = true
        window.clearTimeout(watchdog)
        playMicHeard()
        setHeard(spoken)
        setInterim('')
        try {
          rec.stop()
        } catch {
          /* already stopped */
        }
        runIntent(spoken)
      }
    }
    rec.onerror = (event: any) => {
      const code = String(event?.error || '')
      if (code === 'aborted') return
      window.clearTimeout(watchdog)
      if (code === 'no-speech') {
        setListening(false)
        setError(t('voice.noSpeech'))
        playMicStop()
        return
      }
      if (code === 'not-allowed') {
        setListening(false)
        playMicDenied()
        setMicPhase('denied')
        setError(t('voice.micError'))
        return
      }
      if (code === 'language-not-supported') {
        const current = String(langTry || language || 'sq')
        if (!current.startsWith('en')) {
          beginRecognition('en')
          return
        }
      }
      if (code === 'service-not-allowed' || code === 'network') {
        setListening(false)
        void startListenRef.current(true)
        return
      }
      setListening(false)
      playMicDenied()
      setError(t('voice.micError'))
    }
    rec.onend = () => {
      window.clearTimeout(watchdog)
      setListening(false)
      if (gotFinal || ended) return
      ended = true
      if (liveBest) {
        playMicHeard()
        setHeard(liveBest)
        runIntent(liveBest)
        return
      }
      setError((current) => current || t('voice.noSpeech'))
    }
    setListening(true)
    setOpen(true)
    playMicStart()
    try {
      rec.start()
    } catch {
      void startListenRef.current(true)
    }
  }, [language, runIntent, t])

  const finishRecording = useCallback(
    async (blob: Blob) => {
      if (blobLooksSilent(blob)) {
        setError(t('voice.noSpeech'))
        playMicDenied()
        return
      }
      const peak = await audioPeak(blob).catch(() => 1)
      if (peak > 0 && peak < 0.008) {
        setError(t('voice.noSpeech'))
        playMicDenied()
        return
      }
      setBusy(true)
      setError('')
      setInterim('')
      setPreparingStt(!speechOk && !isLocalSttWarm())
      try {
        const { transcript } = await transcribeAudio(blob, language)
        playMicHeard()
        setHeard(transcript)
        setPreparingStt(false)
        await runIntent(transcript)
      } catch {
        setError(t('voice.sttError'))
        playMicDenied()
        setBusy(false)
        setPreparingStt(false)
      }
    },
    [language, runIntent, speechOk, t],
  )

  const applyMicResult = useCallback(
    (result: Awaited<ReturnType<typeof requestMicrophone>>) => {
      if (!result.ok) {
        playMicDenied()
        setMicPhase(result.state === 'unsupported' ? 'typeonly' : 'denied')
        setError(t('voice.micError'))
        return false
      }
      playMicGranted()
      setMicPhase('ready')
      setError('')
      return true
    },
    [t],
  )

  useOpenAssistant('voice', setOpen, (opts) => {
    setError('')
    if (opts?.listen) {
      skipAskRef.current = true
      setMicPhase('ready')
      void startListenRef.current()
      return
    }
    setMicPhase((current) => (current === 'denied' ? current : 'ready'))
  })

  const grantMic = useCallback(async () => {
    unlockMicAudio()
    unlockSpeechPlayback()
    if (!canCapture) {
      setMicPhase('typeonly')
      setError(t('voice.unsupported'))
      return false
    }
    setAsking(true)
    const result = await requestMicrophone({ keep: true })
    setAsking(false)
    return applyMicResult(result)
  }, [applyMicResult, canCapture, t])

  const startListen = useCallback(async (forceRecord = false) => {
    if (recorderRef.current) return
    unlockMicAudio()
    setMicPhase('ready')
    // Do not call getUserMedia before SpeechRecognition — iPhone then hears nothing.
    if (isBrowserSpeechReliable() && !forceRecord) {
      beginRecognition()
      return
    }
    const ok = await grantMic()
    if (!ok) return
    if (!canRecord) {
      setError(t('voice.unsupported'))
      return
    }
    const result = await requestMicrophone({ keep: true })
    if (!result.ok || !result.stream) {
      playMicDenied()
      setMicPhase('denied')
      return
    }
    setError('')
    setHeard('')
    setInterim('')
    const recorder = createVoiceRecorder({
      maxMs: 12000,
      onAutoStop: () => {
        if (recorderRef.current === recorder) void stopListenRef.current()
      },
    })
    recorderRef.current = recorder
    try {
      await recorder.start(result.stream)
    } catch {
      setError(t('voice.unsupported'))
      return
    }
    setListening(true)
    setOpen(true)
    playMicStart()
  }, [beginRecognition, canRecord, grantMic, t])

  const stopListen = useCallback(async () => {
    recRef.current?.stop()
    const recorder = recorderRef.current
    recorderRef.current = null
    setListening(false)
    playMicStop()
    if (recorder) {
      try {
        const blob = await recorder.stop()
        await finishRecording(blob)
      } catch {
        setError(t('voice.sttError'))
      }
    }
  }, [finishRecording, t])

  startListenRef.current = startListen
  stopListenRef.current = stopListen

  const examples = [t('voice.example1'), t('voice.example2'), t('voice.example3')]

  if (isAuthPath(location.pathname)) return null

  const closeSheet = () => {
    recRef.current?.stop()
    void recorderRef.current?.stop().catch(() => {})
    recorderRef.current = null
    stopMicStream()
    setListening(false)
    setOpen(false)
    stopSpeaking()
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end justify-center lg:items-end lg:justify-end"
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#0c4f91]/35 lg:bg-black/20"
              aria-label={t('common.close')}
              onClick={closeSheet}
            />
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              role="dialog"
              aria-label={t('voice.title')}
              className="relative z-[1] w-full h-[100dvh] max-h-[100dvh] lg:h-auto lg:max-h-[min(78vh,720px)] lg:w-[420px] lg:mr-6 lg:mb-24 flex flex-col bg-white shadow-xl border-border lg:rounded-xl lg:border overflow-hidden"
              style={{ paddingBottom: keyboardInset }}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-primary text-white pt-[calc(0.75rem+env(safe-area-inset-top))] lg:pt-3 shrink-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t('voice.title')}</p>
                  <p className="text-[11px] text-white/75 truncate">{t('voice.subtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-11 h-11 rounded-md hover:bg-white/10 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {micPhase === 'denied' && (
                  <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                        <MicOff className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-destructive">{t('voice.deniedTitle')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t('voice.deniedBody')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line rounded-lg bg-white/80 border border-border px-3 py-2">
                      {t(micDeniedGuideKey())}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11"
                      disabled={asking}
                      onClick={() => void startListen()}
                    >
                      {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                      {t('voice.deniedRetry')}
                    </Button>
                  </div>
                )}

                {micPhase === 'typeonly' && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                    {t('voice.typeHint')}
                  </p>
                )}

                {micPhase !== 'denied' && (
                  <div className="flex flex-col items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={listening ? () => void stopListen() : () => void startListen()}
                      disabled={busy || asking}
                      aria-pressed={listening}
                      className={cn(
                        'relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 flex items-center justify-center transition-colors shadow-md',
                        listening
                          ? 'bg-primary text-white border-primary'
                          : 'bg-secondary text-secondary-foreground border-secondary hover:brightness-95',
                      )}
                    >
                      {listening && (
                        <>
                          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                          <span className="absolute -inset-3 rounded-full border-2 border-primary/25" />
                        </>
                      )}
                      <span className="relative z-[1]">
                        {busy || preparingStt ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-9 h-9" />}
                      </span>
                    </button>
                    <p className="text-sm font-semibold text-center">
                      {listening
                        ? t('voice.listening')
                        : preparingStt
                          ? t('voice.transcribing')
                          : busy
                            ? t('voice.thinking')
                            : t('voice.tapToSpeak')}
                    </p>
                    <p className="text-xs text-muted-foreground text-center max-w-[17rem]">
                      {listening ? t('voice.listeningHint') : t('voice.ready')}
                    </p>
                  </div>
                )}

                <form
                  className="flex items-end gap-2 rounded-xl border border-border bg-muted/40 p-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitTyped(typed)
                  }}
                >
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={t('voice.typePlaceholder')}
                    enterKeyHint="send"
                    className="flex-1 min-w-0 h-12 px-3 rounded-lg bg-white border border-border text-base outline-none"
                  />
                  <Button type="submit" size="icon" className="h-12 w-12 shrink-0" disabled={busy || !typed.trim()}>
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
                          {t('voice.waitNow', { n: guide.when.estimatedWaitMinutes })} · {t('voice.bestHour')}:{' '}
                          {guide.when.bestWindow}
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
                        className="text-left text-xs px-3 py-2.5 rounded-md bg-muted hover:bg-primary/8 min-h-11"
                        onClick={() => {
                          unlockSpeechPlayback()
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
          </motion.div>
        )}
      </AnimatePresence>

      {!open && !peerOpen && (
        <motion.button
          type="button"
          aria-label={t('voice.title')}
          onClick={() => launchVoiceAssistant()}
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
