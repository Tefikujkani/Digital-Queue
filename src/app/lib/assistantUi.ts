import { useEffect, useRef, useState } from 'react'

export const AUTH_PATHS = ['/login', '/register', '/forgot-password']
export const ASSISTANT_EVENT = 'sq-assistant'
export const OPEN_ASSISTANT_EVENT = 'sq-open-assistant'

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.includes(pathname) || pathname.startsWith('/reset-password')
}

export function broadcastAssistant(kind: 'chat' | 'voice' | 'none') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ASSISTANT_EVENT, { detail: kind }))
}

export function openAssistant(kind: 'chat' | 'voice') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: kind }))
}

export function useOpenAssistant(self: 'chat' | 'voice', setOpen: (value: boolean) => void) {
  useEffect(() => {
    const onEvent = (event: Event) => {
      if ((event as CustomEvent<'chat' | 'voice'>).detail === self) setOpen(true)
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, onEvent)
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onEvent)
  }, [self, setOpen])
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
  const skipCloseBroadcast = useRef(false)
  const wasOpen = useRef(false)

  useEffect(() => {
    const onEvent = (event: Event) => {
      const kind = (event as CustomEvent<'chat' | 'voice' | 'none'>).detail
      if (kind === self || kind === 'none') {
        setPeerOpen(false)
        return
      }
      setPeerOpen(true)
      if (open) {
        skipCloseBroadcast.current = true
        setOpen(false)
      }
    }

    window.addEventListener(ASSISTANT_EVENT, onEvent)
    return () => window.removeEventListener(ASSISTANT_EVENT, onEvent)
  }, [self, open, setOpen])

  useEffect(() => {
    if (open) {
      wasOpen.current = true
      broadcastAssistant(self)
      return
    }
    if (skipCloseBroadcast.current) {
      skipCloseBroadcast.current = false
      wasOpen.current = false
      return
    }
    if (wasOpen.current) {
      wasOpen.current = false
      broadcastAssistant('none')
    }
  }, [open, self])

  return peerOpen
}
