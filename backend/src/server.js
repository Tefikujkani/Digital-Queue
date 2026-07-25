import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import connectDB from './config/db.js'

// Route imports
import authRoutes from './routes/authRoutes.js'
import institutionRoutes from './routes/institutionRoutes.js'
import ticketRoutes from './routes/ticketRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import favoriteRoutes from './routes/favoriteRoutes.js'
import citizenRoutes from './routes/citizenRoutes.js'
import NotificationService from './services/notificationService.js'

const app = express()
let io = null
let server = null

// Attach io to request object for use in controllers
app.use((req, res, next) => {
  req.io = io
  req.notificationService = new NotificationService(io)
  next()
})

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const createSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('⚡ Client connected:', socket.id)

    socket.on('join_institution', (institutionId) => {
      socket.join(institutionId)
      console.log(`👤 User ${socket.id} joined institution: ${institutionId}`)
    })

    socket.on('leave_institution', (institutionId) => {
      socket.leave(institutionId)
      console.log(`👤 User ${socket.id} left institution: ${institutionId}`)
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
    })
  })
}

// Database connection
connectDB()

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/institutions', institutionRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/citizen', citizenRoutes)

app.get('/', (req, res) => {
  res.send('SmartQueue Kosova API - Advanced Backend Running')
})

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
