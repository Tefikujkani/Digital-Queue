import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Ticket, TicketPriority } from '../types'
import api from '../lib/api'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'
import { translate } from '../i18n/translate'

const SOCKET_CANDIDATES = [
  (import.meta as any).env?.VITE_SOCKET_URL as string | undefined,
  'http://localhost:5000',
  'http://localhost:5001',
].filter(Boolean) as string[]

const createSocketConnection = () => {
  let currentIndex = 0
  let socket = io(SOCKET_CANDIDATES[currentIndex], {
    transports: ['websocket'],
    reconnection: false,
    autoConnect: false,
  })

  const connect = () => {
    socket.connect()
  }

  socket.on('connect_error', () => {
    if (currentIndex < SOCKET_CANDIDATES.length - 1) {
      currentIndex += 1
      socket.close()
      socket = io(SOCKET_CANDIDATES[currentIndex], {
        transports: ['websocket'],
        reconnection: false,
        autoConnect: false,
      })
      connect()
    }
  })

  connect()
  return socket
}

interface QueueContextType {
  tickets: Ticket[]
  currentTicket: Ticket | null
  getTicket: (
    institutionId: string,
    serviceId: string,
    priority: TicketPriority,
    userName: string,
    scheduledDate?: string,
    scheduledTime?: string,
    options?: { notifySms?: boolean; phone?: string },
  ) => Promise<Ticket>
  cancelTicket: (ticketId: string) => Promise<void>
  callNextTicket: (institutionId: string, counterId: string) => Promise<void>
  completeTicket: (ticketId: string) => Promise<void>
  getQueuePosition: (ticketId: string) => number
  getWaitingTickets: (institutionId: string) => Ticket[]
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

// Helper to normalize MongoDB objects
const normalize = (item: any) => {
  if (!item) return item
  return {
    ...item,
    id: item.id || item._id,
  }
}

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  // Initialize Socket.io
  useEffect(() => {
    const newSocket = createSocketConnection()
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to Socket.io')
    })

    newSocket.on('ticket_updated', (updatedTicket: any) => {
      const normalized = normalize(updatedTicket)
      setTickets((prev) =>
        prev.map((t) =>
          t.id === normalized.id || (t as any)._id === normalized.id ? normalized : t,
        ),
      )

      const savedUserStr = localStorage.getItem('smartqueue_current_user')
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr)
        if (normalized.userId === savedUser.id || normalized.userId === savedUser._id) {
          setCurrentTicket(normalized)
          if (normalized.status === 'called') {
            toast.info(
              translate('toast.ticketCalled', {
                number: normalized.number,
                counter: normalized.counterId || '-',
              }),
              { duration: 10000 },
            )
          }
        }
      }
    })

    newSocket.on('new_ticket', (newTicket: any) => {
      setTickets((prev) => [...prev, normalize(newTicket)])
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  // Fetch initial tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets')
        const normalizedTickets = response.data.map(normalize)
        setTickets(normalizedTickets)
      } catch (error) {
        console.error('Failed to fetch tickets:', error)
      }
    }
    fetchTickets()
  }, [])

  const getTicket = useCallback(
    async (
      institutionId: string,
      serviceId: string,
      priority: TicketPriority,
      userName: string,
      scheduledDate?: string,
      scheduledTime?: string,
      options?: { notifySms?: boolean; phone?: string },
    ): Promise<Ticket> => {
      try {
        const response = await api.post('/tickets', {
          institutionId,
          serviceId,
          priority,
          userName,
          scheduledDate,
          scheduledTime,
          notifySms: options?.notifySms,
          phone: options?.phone,
        })
        const newTicket = normalize(response.data)
        setTickets((prev) => [...prev, newTicket])
        setCurrentTicket(newTicket)

        const isAppointment = Boolean(scheduledDate && scheduledTime)
        toast.success(
          isAppointment
            ? `${translate('appointment.bookSuccess')} · ${newTicket.number}`
            : translate('toast.ticketSuccess', { number: newTicket.number }),
          {
            description: isAppointment
              ? options?.notifySms !== false
                ? 'SMS + email u dërguan (ose email backup nëse SMS dështon)'
                : 'Email / njoftim në app u dërgua'
              : translate('toast.ticketPosition', {
                  position: newTicket.positionInQueue || translate('status.waiting'),
                }),
          },
        )

        return newTicket
      } catch (error: any) {
        toast.error(translate('toast.ticketFailed'))
        throw error
      }
    },
    [],
  )

  const cancelTicket = useCallback(
    async (ticketId: string) => {
      try {
        await api.put(`/tickets/${ticketId}/status`, { status: 'cancelled' })
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId || (t as any)._id === ticketId ? { ...t, status: 'cancelled' } : t,
          ),
        )
        if (currentTicket?.id === ticketId || (currentTicket as any)?._id === ticketId) {
          setCurrentTicket(null)
        }
      } catch (error) {
        toast.error(translate('toast.cancelFailed'))
      }
    },
    [currentTicket],
  )

  const callNextTicket = useCallback(async (institutionId: string, counterId: string) => {
    try {
      const response = await api.post(`/tickets/call-next`, { institutionId, counterId })
      const nextTicket = normalize(response.data)

      setTickets((prev) =>
        prev.map((t) =>
          t.id === nextTicket.id || (t as any)._id === nextTicket.id ? nextTicket : t,
        ),
      )
      toast.success(translate('toast.callNext', { number: nextTicket.number }))
    } catch (error: any) {
      const message = error.response?.data?.message || translate('toast.callNextFailed')
      toast.info(message)
    }
  }, [])

  const completeTicket = useCallback(async (ticketId: string) => {
    try {
      await api.put(`/tickets/${ticketId}/status`, { status: 'completed' })
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId || (t as any)._id === ticketId ? { ...t, status: 'completed' } : t,
        ),
      )
      toast.success(translate('toast.serviceCompleted'))
    } catch (error) {
      toast.error(translate('toast.completeFailed'))
    }
  }, [])

  const getQueuePosition = useCallback(
    (ticketId: string): number => {
      const ticket = tickets.find((t) => t.id === ticketId || (t as any)._id === ticketId)
      if (!ticket || ticket.status !== 'waiting') return 0

      const waitingTickets = tickets
        .filter((t) => t.institutionId === ticket.institutionId && t.status === 'waiting')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      return waitingTickets.findIndex((t) => t.id === ticketId || (t as any)._id === ticketId) + 1
    },
    [tickets],
  )

  const getWaitingTickets = useCallback(
    (institutionId: string): Ticket[] => {
      return tickets.filter((t) => t.institutionId === institutionId && t.status === 'waiting')
    },
    [tickets],
  )

  return (
    <QueueContext.Provider
      value={{
        tickets,
        currentTicket,
        getTicket,
        cancelTicket,
        callNextTicket,
        completeTicket,
        getQueuePosition,
        getWaitingTickets,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}

export const useQueue = () => {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider')
  }
  return context
}
