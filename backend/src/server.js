import './config/loadEnv.js'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import connectDB from './config/db.js'

import authRoutes from './routes/authRoutes.js'
import institutionRoutes from './routes/institutionRoutes.js'
import ticketRoutes from './routes/ticketRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import favoriteRoutes from './routes/favoriteRoutes.js'
import citizenRoutes from './routes/citizenRoutes.js'
import telegramRoutes from './routes/telegramRoutes.js'
import viberRoutes from './routes/viberRoutes.js'
import whatsappRoutes from './routes/whatsappRoutes.js'
import NotificationService from './services/notificationService.js'
import { startAppointmentReminderJob } from './services/reminderJob.js'
import { startTelegramPoller, isTelegramConfigured } from './services/telegramService.js'
import { startViberWebhook, isViberConfigured } from './services/viberService.js'
import { isWhatsAppConfigured } from './services/whatsappService.js'
import { globalLimiter } from './middlewares/rateLimiters.js'
import { notFound, errorHandler } from './middlewares/errorHandler.js'
import User from './models/User.js'

const isProd = process.env.NODE_ENV === 'production'
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5178'

if (isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('❌ JWT_SECRET i dobët — ndalo startin në production')
    process.exit(1)
  }
  if (!process.env.CLIENT_URL) {
    console.error('❌ CLIENT_URL mungon në production')
    process.exit(1)
  }
}

const app = express()
let io = null
let server = null

app.set('trust proxy', 1)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      const allowed = [clientUrl, 'http://localhost:5173', 'http://localhost:5178'].filter(Boolean)
      if (!isProd || allowed.includes(origin)) return cb(null, true)
      return cb(new Error('CORS i bllokuar'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))
app.use(globalLimiter)

app.use((req, res, next) => {
  req.io = io
  req.notificationService = new NotificationService(io)
  next()
})

const createSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: isProd ? clientUrl : [clientUrl, 'http://localhost:5173', 'http://localhost:5178'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '')
      if (!token) {
        socket.data.guest = true
        return next()
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      if (!user) return next(new Error('Unauthorized'))
      socket.data.user = user
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    if (user) {
      socket.join(`user_${user._id}`)
      console.log(`⚡ ${user.email} connected:`, socket.id)
    } else {
      console.log('⚡ Guest connected:', socket.id)
    }

    socket.on('join_institution', (institutionId) => {
      if (!institutionId) return
      // Ekrani publik i radhës lejohet; dhoma user_ vetëm për veten
      socket.join(String(institutionId))
    })

    socket.on('join_user', (userId) => {
      if (!user || user._id.toString() !== String(userId)) return
      socket.join(`user_${userId}`)
    })

    socket.on('leave_institution', (institutionId) => {
      socket.leave(String(institutionId))
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
    })
  })
}

connectDB()

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'SmartQueue Kosova API',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  })
})

app.get('/ready', async (_req, res) => {
  const dbOk = mongoose.connection.readyState === 1
  if (!dbOk) return res.status(503).json({ ok: false, db: 'down' })
  res.json({ ok: true, db: 'up' })
})

app.use('/api/auth', authRoutes)
app.use('/api/institutions', institutionRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/citizen', citizenRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/viber', viberRoutes)
app.use('/api/whatsapp', whatsappRoutes)

app.get('/', (_req, res) => {
  res.json({
    name: 'SmartQueue Kosova API',
    version: '2.0.0',
    health: '/health',
    ready: '/ready',
  })
})

app.use(notFound)
app.use(errorHandler)

const DEFAULT_PORT = Number(process.env.PORT) || 5000
const MAX_PORT_RETRIES = 5

const startServer = (port, attempt = 0) => {
  server = http.createServer(app)
  createSocketServer(server)

  server
    .once('listening', () => {
      console.log(
        `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`,
      )
      startAppointmentReminderJob(io)
      if (isTelegramConfigured()) {
        startTelegramPoller().catch((err) => console.warn('Telegram poller:', err.message))
      } else {
        console.log('💡 Telegram OFF — vendos TELEGRAM_BOT_TOKEN për njoftime falas')
      }
      if (isViberConfigured()) {
        startViberWebhook().catch((err) => console.warn('Viber webhook:', err.message))
      } else {
        console.log('💡 Viber OFF — vendos VIBER_AUTH_TOKEN + VIBER_BOT_URI (partners.viber.com)')
      }
      if (isWhatsAppConfigured()) {
        console.log('📱 WhatsApp Cloud API ON — iOS & Android (Cilësimet → Lidhu me WhatsApp)')
      } else {
        console.log('💡 WhatsApp OFF — vendos WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta)')
      }
    })
    .once('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_RETRIES) {
        const nextPort = port + 1
        console.warn(`Port ${port} is in use, trying port ${nextPort}...`)
        startServer(nextPort, attempt + 1)
      } else {
        console.error('Failed to start server:', error)
        process.exit(1)
      }
    })
    .listen(port)
}

startServer(DEFAULT_PORT)
