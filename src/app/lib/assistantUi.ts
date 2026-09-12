import { useEffect, useState } from 'react'

export const AUTH_PATHS = ['/login', '/register', '/forgot-password']
export const ASSISTANT_EVENT = 'sq-assistant'

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.includes(pathname) || pathname.startsWith('/reset-password')
}

export function broadcastAssistant(kind: 'chat' | 'voice' | 'none') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ASSISTANT_EVENT, { detail: kind }))
}

export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const overlapped = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setInset(overlapped > 40 ? overlapped : 0)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}

export function useAssistantExclusive(
  self: 'chat' | 'voice',
  open: boolean,
  setOpen: (value: boolean) => void,
) {
  const [peerOpen, setPeerOpen] = useState(false)

  useEffect(() => {
    const onEvent = (event: Event) => {
      const kind = (event as CustomEvent<'chat' | 'voice' | 'none'>).detail
      if (kind === self) {
        setPeerOpen(false)
        return
      }
      if (kind === 'none') {
        setPeerOpen(false)
        return
      }
      setPeerOpen(true)
      if (open) setOpen(false)
    }

    window.addEventListener(ASSISTANT_EVENT, onEvent)
    return () => window.removeEventListener(ASSISTANT_EVENT, onEvent)
  }, [self, open, setOpen])

  useEffect(() => {
    if (open) broadcastAssistant(self)
  }, [open, self])

  return peerOpen
}
