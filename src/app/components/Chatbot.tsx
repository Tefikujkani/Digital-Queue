import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  RotateCcw,
  MessageCircle,
  ExternalLink,
  Zap,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { streamChat, fetchChatSuggestions, type ChatMessage } from '../lib/chatApi'
import { Button } from './ui/button'
import { cn } from './ui/utils'

type UiMessage = ChatMessage & {
  id: string
  tools?: string[]
  streaming?: boolean
}

function extractLinks(text: string): string[] {
  const matches = text.match(/\/(?:queue\/[a-f0-9]+|institutions|appointments|login|register|dashboard\/citizen)/gi)
  return [...new Set(matches || [])]
}

function renderRichText(content: string) {
  const lines = content.split('\n')
  return lines.map((line, i) => {
    const withBold = line.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) => {
      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold text-foreground">
            {chunk.slice(2, -2)}
          </strong>
        )
      }
      const parts = chunk.split(/(\/(?:queue\/[a-f0-9]+|institutions|appointments|login|register|dashboard\/citizen))/gi)
      return parts.map((p, k) =>
        p.startsWith('/') ? (
          <Link
            key={`${j}-${k}`}
            to={p}
            className="text-primary underline underline-offset-2 hover:text-secondary inline-flex items-center gap-0.5"
          >
            {p}
            <ExternalLink className="w-3 h-3 opacity-70" />
          </Link>
        ) : (
          <span key={`${j}-${k}`}>{p}</span>
        ),
      )
    })

    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      return (
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed text-muted-foreground">
          {withBold}
        </li>
      )
    }
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      return (
        <p key={i} className="text-sm leading-relaxed text-muted-foreground pl-1">
          {withBold}
        </p>
      )
    }
    if (!line.trim()) return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-sm leading-relaxed text-muted-foreground">
        {withBold}
      </p>
    )
  })
}

const Chatbot: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const { t, language } = useLanguage()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const toolLabels: Record<string, string> = {
    search_institutions: t('chat.tool.search'),
    get_institution_details: t('chat.tool.details'),
    get_queue_status: t('chat.tool.queue'),
    get_my_tickets: t('chat.tool.tickets'),
    get_platform_guide: t('chat.tool.guide'),
    suggest_best_time: t('chat.tool.bestTime'),
  }

  const hideOnAuthPages = ['/login', '/register'].includes(location.pathname)
  const hideOnAdmin =
    location.pathname.startsWith('/dashboard/admin') ||
    location.pathname.startsWith('/dashboard/superadmin')

  useEffect(() => {
    if (!open) return
    fetchChatSuggestions(language).then(setSuggestions)
  }, [open, language])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTool, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  const resetChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setActiveTool(null)
    setBusy(false)
  }, [])

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || busy) return

      setError(null)
      setInput('')
      const userMsg: UiMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
      }
      const assistantId = `a-${Date.now()}`
      const history: ChatMessage[] = [...messages, userMsg].map(({ role, content }) => ({
        role,
        content,
      }))

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ])
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller
      let tools: string[] = []

      try {
        await streamChat({
          messages: history,
          language,
          signal: controller.signal,
          onEvent: (ev) => {
            if (ev.type === 'tool_start') {
              setActiveTool(ev.tool)
            }
            if (ev.type === 'tool_end') {
              tools = [...tools, ev.tool]
              setActiveTool(null)
            }
            if (ev.type === 'delta') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + ev.content } : m,
                ),
              )
            }
            if (ev.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: ev.content || m.content,
                        streaming: false,
                        tools: ev.toolsUsed || tools,
                      }
                    : m,
                ),
              )
            }
            if (ev.type === 'error') {
              setError(ev.message)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content || ev.message,
                        streaming: false,
                      }
                    : m,
                ),
              )
            }
          },
        })
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          setError(t('chat.error'))
        }
      } finally {
        setBusy(false)
        setActiveTool(null)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        )
      }
    },
    [busy, messages, language, t],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (hideOnAuthPages || hideOnAdmin) return null

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[min(100vw-1.5rem,420px)] h-[min(72vh,640px)] flex flex-col rounded-3xl overflow-hidden border border-primary/25 bg-[#0e0e18]/95 backdrop-blur-xl shadow-[0_25px_80px_-20px_rgba(127,65,255,0.55)]"
            role="dialog"
            aria-label={t('chat.title')}
          >
            <div className="relative px-4 py-3.5 border-b border-white/8 bg-gradient-to-r from-primary/25 via-secondary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl btn-gradient flex items-center justify-center glow-primary-sm">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent border-2 border-[#0e0e18]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm tracking-tight truncate">{t('chat.title')}</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-3 h-3" />
                      Grok
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {isAuthenticated
                      ? t('chat.greetingUser', { name: user?.name?.split(' ')[0] || '' })
                      : t('chat.subtitle')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={resetChat}
                    title={t('chat.reset')}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => setOpen(false)}
                    aria-label={t('common.close')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-foreground">{t('chat.welcomeTitle')}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t('chat.welcomeBody')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendMessage(s)}
                        className="text-left text-xs sm:text-[13px] px-3.5 py-2.5 rounded-2xl border border-primary/15 bg-primary/5 hover:bg-primary/12 hover:border-primary/30 transition-colors text-foreground/90"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const links = m.role === 'assistant' ? extractLinks(m.content) : []
                return (
                  <div
                    key={m.id}
                    className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted/80 border border-white/6 rounded-bl-md',
                      )}
                    >
                      {m.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {m.content ? renderRichText(m.content) : m.streaming ? (
                            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              {t('chat.thinking')}
                            </span>
                          ) : null}
                          {!!m.tools?.length && (
                            <div className="flex flex-wrap gap-1 pt-2">
                              {m.tools.map((tool) => (
                                <span
                                  key={tool}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium"
                                >
                                  {tool.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                          {links.length > 0 && !m.streaming && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {links.slice(0, 3).map((href) => (
                                <Link
                                  key={href}
                                  to={href}
                                  onClick={() => setOpen(false)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                                >
                                  {href.includes('queue') ? t('chat.openQueue') : href.replace('/', '')}
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-3.5 h-3.5 text-secondary" />
                      </div>
                    )}
                  </div>
                )
              })}

              {activeTool && (
                <div className="flex items-center gap-2 text-xs text-accent pl-9">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {toolLabels[activeTool] || activeTool}
                </div>
              )}

              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-white/8 bg-[#0c0c14]/90">
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2 focus-within:border-primary/40 transition-colors">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t('chat.placeholder')}
                  disabled={busy}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 max-h-28 py-1.5 px-1"
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={busy || !input.trim()}
                  onClick={() => sendMessage(input)}
                  className="h-9 w-9 rounded-xl btn-gradient shrink-0"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
                {t('chat.poweredBy')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={t('chat.title')}
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-5 right-4 sm:right-6 z-[60] h-14 w-14 rounded-2xl btn-gradient glow-primary flex items-center justify-center shadow-lg',
          open && 'ring-2 ring-accent/50',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}

export default Chatbot
