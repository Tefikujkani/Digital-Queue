import {
  chatWithGrok,
  getSuggestedPrompts,
  getChatStatus,
  isGrokConfigured,
} from '../services/grokService.js'

export const getSuggestions = (_req, res) => {
  res.json({
    suggestions: getSuggestedPrompts(),
    assistant: {
      name: 'Asistenti SmartQueue',
      poweredBy: isGrokConfigured() ? 'Grok · xAI' : 'SmartQueue Live · shqip',
      mode: isGrokConfigured() ? 'grok' : 'local',
    },
  })
}

export const getStatus = (_req, res) => {
  res.json(getChatStatus())
}

export const chat = async (req, res) => {
  const { messages, stream = true } = req.body || {}
  const language = 'sq'

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Duhet të dërgoni mesazhe' })
  }

  const last = messages[messages.length - 1]
  if (!last?.content || typeof last.content !== 'string') {
    return res.status(400).json({ message: 'Mesazhi i fundit duhet të ketë përmbajtje' })
  }

  if (String(last.content).trim().length > 2000) {
    return res.status(400).json({ message: 'Mesazhi është shumë i gjatë (max 2000 karaktere)' })
  }

  const useStream = stream !== false

  if (useStream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    const send = (payload) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`)
      }
    }

    try {
      send({ type: 'start', mode: isGrokConfigured() ? 'grok' : 'local' })
      await chatWithGrok({
        messages,
        language,
        user: req.user || null,
        onEvent: send,
      })
      res.write('data: [DONE]\n\n')
      res.end()
    } catch (err) {
      console.error('Chat stream error:', err.message)
      send({
        type: 'error',
        message: 'Na vjen keq, asistenti pati një problem. Provo përsëri.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      })
      res.write('data: [DONE]\n\n')
      res.end()
    }
    return
  }

  try {
    const events = []
    const result = await chatWithGrok({
      messages,
      language,
      user: req.user || null,
      onEvent: (e) => events.push(e),
    })
    res.json({
      reply: result.content,
      toolsUsed: result.toolsUsed,
      model: result.model,
      events,
    })
  } catch (err) {
    console.error('Chat error:', err.message)
    res.status(err.status || 500).json({
      message: 'Asistenti dështoi. Provo përsëri.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: err.code,
    })
  }
}
