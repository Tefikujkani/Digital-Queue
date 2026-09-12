import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { MessageCircle, Mic } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { ASSISTANT_EVENT, isAuthPath, openAssistant } from '../lib/assistantUi'

const MobileAssistDock: React.FC = () => {
  const { t } = useLanguage()
  const location = useLocation()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onEvent = (event: Event) => {
      const kind = (event as CustomEvent<'chat' | 'voice' | 'none'>).detail
      setHidden(kind === 'chat' || kind === 'voice')
    }
    window.addEventListener(ASSISTANT_EVENT, onEvent)
    return () => window.removeEventListener(ASSISTANT_EVENT, onEvent)
  }, [])

  useEffect(() => {
    setHidden(false)
  }, [location.pathname])

  if (isAuthPath(location.pathname) || hidden) return null

  return (
    <div
      className="lg:hidden fixed left-3 right-3 z-[115]"
      style={{ bottom: 'calc(4.65rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openAssistant('voice')}
          className="h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
        >
          <Mic className="w-5 h-5" />
          {t('voice.dock')}
        </button>
        <button
          type="button"
          onClick={() => openAssistant('chat')}
          className="h-12 rounded-xl btn-gradient text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          {t('chat.dock')}
        </button>
      </div>
    </div>
  )
}

export default MobileAssistDock
