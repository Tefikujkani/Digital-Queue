import Ticket from '../models/Ticket.js'
import Institution from '../models/Institution.js'
import { nextTicketSequence, priorityRank } from '../utils/ticketNumbering.js'
import crypto from 'crypto'

const MAX_SLOT_BOOKINGS = Number(process.env.MAX_SLOT_BOOKINGS || 8)

function assertAdminInstitution(user, institutionId) {
  if (user.role === 'superadmin') return true
  if (user.role === 'admin' && user.institutionId?.toString() === institutionId?.toString()) {
    return true
  }
  return false
}

function withinWorkingHours(institution, date) {
  const open = institution?.workingHours?.open || '08:00'
  const close = institution?.workingHours?.close || '16:00'
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  const mins = date.getHours() * 60 + date.getMinutes()
  const openM = oh * 60 + (om || 0)
  const closeM = ch * 60 + (cm || 0)
  return mins >= openM && mins < closeM
}

function publicTicketView(t) {
  return {
    _id: t._id,
    number: t.number,
    status: t.status,
    priority: t.priority,
    priorityRank: t.priorityRank,
    counterId: t.counterId,
    estimatedWaitTime: t.estimatedWaitTime,
    scheduledAt: t.scheduledAt,
    calledAt: t.calledAt,
    createdAt: t.createdAt,
    institutionId: t.institutionId,
    serviceId: t.serviceId,
  }
}

// @desc    Issue a new ticket
export const issueTicket = async (req, res) => {
  try {
    const {
      institutionId,
      serviceId,
      priority,
      userName,
      scheduledDate,
      scheduledTime,
      notifySms,
      phone,
    } = req.body

    if (!institutionId || !serviceId) {
      return res.status(400).json({ message: 'Institucioni dhe shërbimi janë të detyrueshëm' })
    }

    const institution = await Institution.findById(institutionId)
    if (!institution || !institution.isActive) {
      return res.status(404).json({ message: 'Institucioni nuk u gjet ose është joaktiv' })
    }

    let scheduledAt
    if (scheduledDate && scheduledTime) {
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
      if (Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ message: 'Data ose ora e terminit nuk është valide' })
      }
      if (scheduledAt.getTime() < Date.now() - 60_000) {
        return res.status(400).json({ message: 'Termini nuk mund të jetë në të kaluarën' })
      }
      if (!withinWorkingHours(institution, scheduledAt)) {
        return res.status(400).json({
          message: `Jashtë orarit të punës (${institution.workingHours?.open || '08:00'}–${institution.workingHours?.close || '16:00'})`,
        })
      }
      const slotStart = new Date(scheduledAt)
      slotStart.setMinutes(0, 0, 0)
      const slotEnd = new Date(slotStart)
      slotEnd.setHours(slotEnd.getHours() + 1)
      const booked = await Ticket.countDocuments({
        institutionId,
        serviceId,
        scheduledAt: { $gte: slotStart, $lt: slotEnd },
        status: { $nin: ['cancelled'] },
      })
      if (booked >= MAX_SLOT_BOOKINGS) {
        return res.status(409).json({
          message: 'Ky orar është i plotë. Zgjidh një orë tjetër.',
          slotCapacity: MAX_SLOT_BOOKINGS,
          booked,
        })
      }
    }

    const seq = await nextTicketSequence(institutionId)
    const prio = priority || 'normal'
    const prefix =
      prio === 'emergency' ? 'E' : prio === 'elderly' ? 'S' : prio === 'disability' ? 'D' : 'N'
    const ticketNumber = `${prefix}-${seq.toString().padStart(3, '0')}`
    const qrSecret = crypto.randomBytes(8).toString('hex')
    const qrCode = `SQK:${institutionId}:${ticketNumber}:${qrSecret}`

    const waitingAhead = await Ticket.countDocuments({
      institutionId,
      status: 'waiting',
    })

    const ticket = await Ticket.create({
      userId: req.user._id,
      userName: (userName || req.user.name || 'Qytetar').slice(0, 80),
      institutionId,
      serviceId,
      number: ticketNumber,
      priority: prio,
      priorityRank: priorityRank(prio),
      qrCode,
      estimatedWaitTime: waitingAhead * 5 + 5,
      scheduledAt,
    })

    const serviceObj = institution.services.find(
      (s) => s._id?.toString() === serviceId || s.id === serviceId,
    )
    const serviceName = serviceObj ? serviceObj.name : 'Shërbim i Përgjithshëm'

    if (scheduledAt) {
      const delivery = await req.notificationService.appointmentBooked(
        req.user._id,
        ticket,
        institution.name,
        serviceName,
        {
          notifySms: notifySms !== false,
          phone: phone || req.user.phone,
          enableSms: notifySms !== false,
        },
      )
      req.io?.to(institutionId.toString()).emit('new_ticket', publicTicketView(ticket))
      return res.status(201).json({
        ...ticket.toObject(),
        notification: {
          type: 'appointment',
          smsRequested: notifySms !== false,
          delivery: delivery?.delivery || null,
        },
      })
    }

    await req.notificationService.ticketIssued(
      req.user._id,
      ticket,
      institution.name,
      serviceName,
    )

    req.io?.to(institutionId.toString()).emit('new_ticket', publicTicketView(ticket))
    res.status(201).json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const callNextTicket = async (req, res) => {
  try {
    const { institutionId, counterId } = req.body
    if (!institutionId) {
      return res.status(400).json({ message: 'institutionId është i detyrueshëm' })
    }
    if (!assertAdminInstitution(req.user, institutionId)) {
      return res.status(403).json({ message: 'Nuk ke qasje në këtë institucion' })
    }

    const nextTicket = await Ticket.findOne({
      institutionId,
      status: { $in: ['waiting', 'checked_in'] },
    }).sort({ priorityRank: 1, createdAt: 1 })

    if (!nextTicket) {
      return res.status(404).json({ message: 'Nuk ka qytetarë në pritje' })
    }

    nextTicket.status = 'called'
    nextTicket.counterId = counterId
    nextTicket.calledAt = new Date()
    await nextTicket.save()

    req.io?.to(institutionId.toString()).emit('ticket_updated', publicTicketView(nextTicket))
    req.io?.to(`user_${nextTicket.userId}`).emit('ticket_updated', nextTicket)

    const institution = await Institution.findById(institutionId).lean()
    await req.notificationService.ticketCalled(
      nextTicket.userId,
      nextTicket,
      institution ? institution.name : 'Institucioni',
    )

    res.json(nextTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body
    const allowed = ['waiting', 'called', 'completed', 'cancelled', 'checked_in']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Status i pavlefshëm' })
    }

    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) {
      return res.status(404).json({ message: 'Bileta nuk u gjet' })
    }

    const isOwner = ticket.userId.toString() === req.user._id.toString()
    const isStaff = assertAdminInstitution(req.user, ticket.institutionId)

    if (status === 'cancelled') {
      if (!isOwner && !isStaff) {
        return res.status(403).json({ message: 'Nuk mund ta anulosh këtë biletë' })
      }
      if (isOwner && !['waiting', 'checked_in'].includes(ticket.status)) {
        return res.status(400).json({ message: 'Bileta nuk mund të anulohet në këtë status' })
      }
    } else if (['completed', 'called', 'checked_in', 'waiting'].includes(status)) {
      if (!isStaff) {
        return res.status(403).json({ message: 'Vetëm stafi i institucionit mund ta ndryshojë' })
      }
    }

    ticket.status = status
    if (status === 'completed') ticket.completedAt = new Date()
    if (status === 'checked_in') ticket.checkedInAt = new Date()
    await ticket.save()

    req.io?.to(ticket.institutionId.toString()).emit('ticket_updated', publicTicketView(ticket))

    if (status === 'completed') {
      await req.notificationService.ticketCompleted(ticket.userId, ticket)
    }

    res.json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/** Lista: admin=full, citizen mine, publik=anonim me institutionId */
export const getTickets = async (req, res) => {
  try {
    const { institutionId, mine } = req.query
    const filter = {}
    if (institutionId) filter.institutionId = institutionId

    let user = req.user || null
    const authHeader = req.headers.authorization
    if (!user && authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = (await import('jsonwebtoken')).default
        const User = (await import('../models/User.js')).default
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
        user = await User.findById(decoded.id).select('-password')
      } catch {
        /* public */
      }
    }

    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      if (user.role === 'admin' && user.institutionId) {
        filter.institutionId = user.institutionId
      }
      const tickets = await Ticket.find(filter).sort({ priorityRank: 1, createdAt: 1 })
      return res.json(tickets)
    }

    if (user && (mine === '1' || !institutionId)) {
      const tickets = await Ticket.find({ userId: user._id }).sort({ createdAt: -1 })
      return res.json(tickets)
    }

    if (!institutionId) {
      return res.status(400).json({ message: 'institutionId është i detyrueshëm për listën publike' })
    }

    filter.status = { $in: ['waiting', 'called', 'checked_in'] }
    const tickets = await Ticket.find(filter)
      .select(
        'number status priority priorityRank counterId estimatedWaitTime scheduledAt calledAt createdAt institutionId serviceId',
      )
      .sort({ priorityRank: 1, createdAt: 1 })
    res.json(tickets)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/** Check-in me QR — stafi skanon kodin */
export const checkInTicket = async (req, res) => {
  try {
    const { qrCode, institutionId } = req.body
    if (!qrCode) return res.status(400).json({ message: 'qrCode mungon' })

    const ticket = await Ticket.findOne({ qrCode: String(qrCode).trim() })
    if (!ticket) return res.status(404).json({ message: 'QR i pavlefshëm' })

    const instId = institutionId || ticket.institutionId
    if (!assertAdminInstitution(req.user, instId)) {
      return res.status(403).json({ message: 'Nuk ke qasje në këtë institucion' })
    }
    if (ticket.institutionId.toString() !== instId.toString()) {
      return res.status(400).json({ message: 'Bileta nuk i përket këtij institucioni' })
    }
    if (['completed', 'cancelled'].includes(ticket.status)) {
      return res.status(400).json({ message: `Bileta është ${ticket.status}` })
    }

    ticket.status = 'checked_in'
    ticket.checkedInAt = new Date()
    await ticket.save()

    req.io?.to(ticket.institutionId.toString()).emit('ticket_updated', publicTicketView(ticket))
    res.json({ message: 'Check-in u krye', ticket })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/** Disponueshmëria e orareve për termin */
export const getSlotAvailability = async (req, res) => {
  try {
    const { institutionId, serviceId, date } = req.query
    if (!institutionId || !date) {
      return res.status(400).json({ message: 'institutionId dhe date janë të detyrueshme' })
    }
    const institution = await Institution.findById(institutionId).lean()
    if (!institution) return res.status(404).json({ message: 'Institucioni nuk u gjet' })

    const open = institution.workingHours?.open || '08:00'
    const close = institution.workingHours?.close || '16:00'
    const [oh] = open.split(':').map(Number)
    const [ch] = close.split(':').map(Number)

    const slots = []
    for (let h = oh; h < ch; h++) {
      for (const m of [0, 30]) {
        if (h === ch - 1 && m === 30 && ch === h + 1) break
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const slotStart = new Date(`${date}T${time}`)
        if (Number.isNaN(slotStart.getTime())) continue
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
        const q = {
          institutionId,
          scheduledAt: { $gte: slotStart, $lt: slotEnd },
          status: { $nin: ['cancelled'] },
        }
        if (serviceId) q.serviceId = serviceId
        const booked = await Ticket.countDocuments(q)
        slots.push({
          time,
          booked,
          capacity: MAX_SLOT_BOOKINGS,
          available: Math.max(0, MAX_SLOT_BOOKINGS - booked),
        })
      }
    }
    res.json({ date, slots, capacity: MAX_SLOT_BOOKINGS })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
