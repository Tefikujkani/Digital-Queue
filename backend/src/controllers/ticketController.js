import Ticket from '../models/Ticket.js'
import Institution from '../models/Institution.js'
// @desc    Issue a new ticket
// @route   POST /api/tickets
// @access  Private
export const issueTicket = async (req, res) => {
  try {
    const { institutionId, serviceId, priority, userName, scheduledDate, scheduledTime } = req.body

    let scheduledAt
    if (scheduledDate && scheduledTime) {
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
      if (Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ message: 'Data ose ora e terminit nuk eshte valide' })
      }
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const ticketCount = await Ticket.countDocuments({
      institutionId,
      createdAt: { $gte: startOfDay },
    })

    const prefix =
      priority === 'emergency'
        ? 'E'
        : priority === 'elderly'
          ? 'S'
          : priority === 'disability'
            ? 'D'
            : 'N'
    const ticketNumber = `${prefix}-${(ticketCount + 1).toString().padStart(3, '0')}`

    const ticket = await Ticket.create({
      userId: req.user._id,
      userName: userName || req.user.name,
      institutionId,
      serviceId,
      number: ticketNumber,
      priority: priority || 'normal',
      qrCode: `SQK-${ticketNumber}-${Date.now()}`,
      estimatedWaitTime: ticketCount * 5 + 5, // Simple estimation
      scheduledAt,
    })

    const institution = await Institution.findById(institutionId).lean()

    // Dispatch global notification (in-app + email + sms) via NotificationService
    if (institution) {
      const serviceObj = institution.services.find(s => s._id.toString() === serviceId);
      const serviceName = serviceObj ? serviceObj.name : 'Shërbim i Përgjithshëm';

      await req.notificationService.ticketIssued(
        req.user._id,
        ticket,
        institution.name,
        serviceName
      );
    }

    // Notify institution room for dashboard
    req.io.to(institutionId.toString()).emit('new_ticket', ticket)

    res.status(201).json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Call next ticket
// @route   POST /api/tickets/call-next
// @access  Private/Admin
export const callNextTicket = async (req, res) => {
  try {
    const { institutionId, counterId } = req.body

    // Find next ticket: Priority order (Emergency > Elderly/Disability > Normal)
    const priorityOrder = { emergency: 0, elderly: 1, disability: 2, normal: 3 }

    // In Mongoose we can't easily sort by a custom map in find(),
    // so we'll fetch waiting tickets and sort in memory or use a complex aggregation.
    // For simplicity, we'll use a specific sort.
    const nextTicket = await Ticket.findOne({
      institutionId,
      status: 'waiting',
    }).sort({
      // We can add a numeric priority field to the model for better sorting,
      // but here we'll just sort by priority string (E < N) or just createdAt.
      priority: 1,
      createdAt: 1,
    })

    if (!nextTicket) {
      return res.status(404).json({ message: 'Nuk ka qytetarë në pritje' })
    }

    nextTicket.status = 'called'
    nextTicket.counterId = counterId
    nextTicket.calledAt = new Date()
    await nextTicket.save()

    // Notify everyone via basic socket
    req.io.emit('ticket_updated', nextTicket)

    // Advanced Notification (Email, SMS, In-App)
    const institution = await Institution.findById(institutionId).lean()
    await req.notificationService.ticketCalled(
      nextTicket.userId,
      nextTicket,
      institution ? institution.name : 'Institucioni'
    );

    res.json(nextTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update ticket status (Complete/Cancel)
// @route   PUT /api/tickets/:id/status
// @access  Private
export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body
    const ticket = await Ticket.findById(req.params.id)

    if (!ticket) {
      return res.status(404).json({ message: 'Bileta nuk u gjet' })
    }

    ticket.status = status
    if (status === 'completed') {
      ticket.completedAt = new Date()
    }

    await ticket.save()

    // Notify everyone
    req.io.emit('ticket_updated', ticket)

    // Trigger Notification if completed
    if (status === 'completed') {
      await req.notificationService.ticketCompleted(ticket.userId, ticket);
    }

    res.json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all tickets (with filters)
// @route   GET /api/tickets
// @access  Public
export const getTickets = async (req, res) => {
  try {
    const { institutionId } = req.query
    const filter = institutionId ? { institutionId } : {}

    const tickets = await Ticket.find(filter).sort({ createdAt: 1 })
    res.json(tickets)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

import { simulateBulkSMS } from '../services/smsSimulator.js'

// @desc    Simulate SMS sending for testing
// @route   POST /api/tickets/simulate-sms
// @access  Public
export const simulateSMSNotification = async (req, res) => {
  try {
    const { appointments } = req.body

    if (!appointments || !Array.isArray(appointments)) {
      // Shembull default nëse nuk dërgohen të dhëna
      const defaultAppointments = [
        {
          name: 'Filan Fisteku',
          phone: '+38344111222',
          institution: 'Komuna e Prishtinës',
          date: '15 Maj 2026',
          time: '09:00',
        },
        {
          name: 'Agon Krasniqi',
          phone: '+38349888777',
          institution: 'QKUK',
          date: '16 Maj 2026',
          time: '14:30',
        },
        {
          name: 'Venera Loxha',
          phone: '+38345555444',
          institution: 'ATK',
          date: '17 Maj 2026',
          time: '11:15',
        },
      ]
      const results = simulateBulkSMS(defaultAppointments)
      return res.json({
        message: 'Simulimi u krye me sukses për listën default.',
        results,
      })
    }

    const results = simulateBulkSMS(appointments)
    res.json({
      message: `Simulimi u krye me sukses për ${appointments.length} përdorues.`,
      results,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
