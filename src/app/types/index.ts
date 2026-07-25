// Type definitions for SmartQueue Kosova

export type UserRole = 'citizen' | 'admin' | 'superadmin'

export type Language = 'sq' | 'en' | 'sr'

export type TicketStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled'

export type TicketPriority = 'normal' | 'elderly' | 'emergency' | 'disability'

export type InstitutionType =
  | 'municipality'
  | 'hospital'
  | 'atk'
  | 'bank'
  | 'university'
  | 'post'
  | 'student_center'

export interface User {
  id: string
  _id?: string
  name: string
  email: string
  phone?: string
  role: UserRole
  institutionId?: string
  favorites?: string[]
  preferredCity?: string
  notificationPrefs?: {
    inApp?: boolean
    email?: boolean
    sms?: boolean
    telegram?: boolean
    viber?: boolean
    whatsapp?: boolean
  }
  telegramChatId?: string
  viberId?: string
  whatsappPhone?: string
  createdAt: Date
}

export interface Institution {
  id: string
  _id?: string
  name: string
  type: InstitutionType | string
  description?: string
  address?: string
  city?: string
  location?: {
    address: string
    city: string
    lat: number
    lng: number
  }
  workingHours: {
    open: string
    close: string
  }
  services: Service[]
  counters?: Counter[]
  logo?: string
  isActive: boolean
  ratingAvg?: number
  ratingCount?: number
}

export interface Service {
  id: string
  _id?: string
  name: string
  description: string
  estimatedTime: number // in minutes
  institutionId?: string
  requiredDocuments?: string[]
}

export interface Counter {
  id: string
  _id?: string
  number: number
  name: string
  institutionId: string
  serviceIds: string[]
  isActive: boolean
  currentTicket?: string
  operatorName?: string
}

export interface Ticket {
  id: string
  _id?: string
  number: string
  userId: string
  userName: string
  institutionId: string
  serviceId: string
  status: TicketStatus
  priority: TicketPriority
  counterId?: string
  qrCode: string
  estimatedWaitTime: number // in minutes
  scheduledAt?: string | Date
  positionInQueue: number
  createdAt: Date
  calledAt?: Date
  completedAt?: Date
}

export interface Appointment {
  id: string
  _id?: string
  userId: string
  userName: string
  institutionId: string
  serviceId: string
  date: Date
  time: string
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  createdAt: Date
}

export interface Notification {
  id: string
  _id?: string
  userId: string
  type: 'queue' | 'appointment' | 'system'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

export interface Analytics {
  institutionId: string
  date: Date
  totalVisitors: number
  averageWaitTime: number
  completedTickets: number
  cancelledTickets: number
  peakHours: { hour: number; count: number }[]
  counterEfficiency: { counterId: string; efficiency: number }[]
}

export interface QueueState {
  institutionId: string
  totalWaiting: number
  currentNumber: string
  estimatedTime: number
  activeCounters: number
}
