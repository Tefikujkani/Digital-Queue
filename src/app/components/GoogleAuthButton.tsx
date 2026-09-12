import React, { useState } from 'react'
import { Button } from './ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'
import { getGoogleClientId, preloadGoogleAuth, requestGoogleSession, type GoogleSession } from '../lib/googleAuth'

function GoogleMark() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.86-.07-1.7-.22-2.5H12v4.74h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.87l-3.88-3c-1.08.74-2.47 1.18-4.07 1.18-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.35A7.2 7.2 0 0 1 4.89 12c0-.82.14-1.61.38-2.35V6.55H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.45l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.14 15.23 0 12 0 7.31 0 3.23 2.69 1.27 6.55l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

type Props = {
  disabled?: boolean
  onCredential: (session: GoogleSession) => Promise<void>
}

export function GoogleAuthButton({ disabled, onCredential }: Props) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)

  React.useEffect(() => {
    preloadGoogleAuth()
  }, [])

  const handleClick = () => {
    if (busy || disabled) return
    if (!getGoogleClientId()) {
      toast.error(t('auth.googleNotConfigured'))
      return
    }

    setBusy(true)
    requestGoogleSession()
      .then((session) => onCredential(session))
      .catch((error: any) => {
        const code = String(error?.message || '')
        if (code === 'CANCELLED' || code === 'NO_CRED') {
          toast.error(t('auth.googleCancelled'))
        } else if (code === 'NO_CLIENT' || code === 'NO_GIS' || code === 'Google script') {
          toast.error(t('auth.googleNotConfigured'))
        }
      })
      .finally(() => setBusy(false))
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12 text-base bg-white border-border text-foreground hover:bg-muted/60"
      disabled={disabled || busy}
      onClick={handleClick}
    >
      <GoogleMark />
      {busy ? t('common.loading') : t('auth.continueGoogle')}
    </Button>
  )
}
