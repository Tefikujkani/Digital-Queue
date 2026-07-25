import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { sendEmail, ticketIssuedEmail, ticketCalledEmail, ticketCompletedEmail } from './emailService.js'
import { sendSMS } from './smsService.js'

/**
 * Central notification service — respects user.notificationPrefs
 */
class NotificationService {
  constructor(io) {
    this.io = io
  }

  async notify(userId, type, title, message, data = {}, channels = {}) {
    const user = await User.findById(userId)
    const prefs = user?.notificationPrefs || {
      inApp: true,
      email: true,
      sms: false,
    }

    const inApp = channels.inApp !== false && prefs.inApp !== false
    const email = Boolean(channels.email) && prefs.email !== false
    const sms = Boolean(channels.sms) && prefs.sms === true

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      channels: { inApp, email, sms },
    })

    if (inApp && this.io) {
      this.io.to(`user_${userId}`).emit('notification', {
        id: notification._id,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: notification.createdAt,
      })
    }

    if (email && user?.email) {
      try {
        let emailContent
        switch (type) {
          case 'ticket_issued':
            emailContent = ticketIssuedEmail(
              user.name,
              data.ticketNumber,
              data.institutionName,
              data.scheduledAt,
              data.serviceName,
            )
            break
          case 'ticket_called':
            emailContent = ticketCalledEmail(user.name, data.ticketNumber, data.counterId)
            break
          case 'ticket_completed':
            emailContent = ticketCompletedEmail(user.name, data.ticketNumber)
            break
          default:
            emailContent = { subject: title, html: `<p>${message}</p>` }
        }
        await sendEmail(user.email, emailContent.subject, emailContent.html)
      } catch (err) {
        console.error('Email notification failed:', err.message)
      }
    }

    if (sms && user?.phone) {
      try {
        await sendSMS(user.phone, message)
      } catch (err) {
        console.error('SMS notification failed:', err.message)
      }
    }

    return notification
  }

  async ticketIssued(userId, ticket, institutionName, serviceName) {
    return this.notify(
      userId,
      'ticket_issued',
      'Biletë e Re',
      `Bileta ${ticket.number} u lëshua për ${institutionName}.`,
      {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.number,
        institutionId: ticket.institutionId.toString(),
        institutionName,
        serviceName,
        scheduledAt: ticket.scheduledAt,
      },
      { inApp: true, email: true, sms: true },
    )
  }

  async ticketCalled(userId, ticket, institutionName) {
    return this.notify(
      userId,
      'ticket_called',
      'Radha Juaj!',
      `Numri ${ticket.number} u thirr te sporteli ${ticket.counterId}.`,
      {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.number,
        institutionId: ticket.institutionId.toString(),
        institutionName,
        counterId: ticket.counterId,
      },
      { inApp: true, email: true, sms: true },
    )
  }

  async ticketCompleted(userId, ticket) {
    return this.notify(
      userId,
      'ticket_completed',
      'Shërbimi Përfundoi',
      `Bileta ${ticket.number} u përfundua me sukses.`,
      {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.number,
      },
      { inApp: true, email: true },
    )
  }
}

export default NotificationService
