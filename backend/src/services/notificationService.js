import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { sendEmail, ticketIssuedEmail, ticketCalledEmail, ticketCompletedEmail } from './emailService.js'
import { sendSMS } from './smsService.js'
import {
  buildAppointmentSms,
  sendAppointmentSMS,
  formatAppointmentLocal,
} from './appointmentNotify.js'

/**
 * Central notification service — respects user.notificationPrefs
 * Appointments force SMS cascade (Twilio → gateway → Textbelt → email)
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

    const forceSms = channels.forceSms === true
    const inApp = channels.inApp !== false && prefs.inApp !== false
    const email = Boolean(channels.email) && prefs.email !== false
    const wantsTelegram =
      Boolean(user?.telegramChatId) && prefs.telegram !== false
    const wantsViber = Boolean(user?.viberId) && prefs.viber !== false
    // Transactional appointment SMS can override prefs when forceSms + phone
    const sms =
      (Boolean(channels.sms) && prefs.sms === true) ||
      (forceSms && Boolean(user?.phone || data.phoneOverride))
    const smartDelivery =
      type.startsWith('appointment_') &&
      (sms || wantsTelegram || wantsViber || forceSms)

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      channels: { inApp, email, sms: sms || wantsTelegram || wantsViber },
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
          case 'appointment_booked':
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
          case 'appointment_reminder':
            emailContent = {
              subject: title,
              html: `<div style="font-family:sans-serif;padding:24px"><h2>${title}</h2><p>${message}</p></div>`,
            }
            break
          default:
            emailContent = { subject: title, html: `<p>${message}</p>` }
        }
        await sendEmail(user.email, emailContent.subject, emailContent.html)
      } catch (err) {
        console.error('Email notification failed:', err.message)
      }
    }

    if (smartDelivery) {
      const phone = data.phoneOverride || user?.phone
      try {
        const delivery = await sendAppointmentSMS({
          phone: sms ? phone : undefined,
          email: user?.email,
          telegramChatId: wantsTelegram ? user.telegramChatId : undefined,
          viberId: wantsViber ? user.viberId : undefined,
          body: message,
          subject: `📱 ${title}`,
        })
        notification.delivery = delivery
        await notification.save()
      } catch (err) {
        console.error('Smart delivery failed:', err.message)
      }
    } else if (sms) {
      const phone = data.phoneOverride || user?.phone
      try {
        if (phone) await sendSMS(phone, message)
      } catch (err) {
        console.error('SMS notification failed:', err.message)
      }
    }

    // Messenger falas për thirrjen e radhës (pa SMS)
    if (!smartDelivery && type === 'ticket_called') {
      try {
        const { sendViaTelegram, sendViaViber } = await import('./smsService.js')
        if (wantsTelegram) await sendViaTelegram(user.telegramChatId, message)
        if (wantsViber) await sendViaViber(user.viberId, message)
      } catch (err) {
        console.error('Messenger notify failed:', err.message)
      }
    }

    return notification
  }

  async ticketIssued(userId, ticket, institutionName, serviceName) {
    // Nëse ka termin (scheduledAt) → rruga e specializuar e SMS
    if (ticket.scheduledAt) {
      return this.appointmentBooked(userId, ticket, institutionName, serviceName)
    }

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

  /**
   * Kur qytetari rezervon termin — SMS + email + in-app (falas me cascade)
   */
  async appointmentBooked(userId, ticket, institutionName, serviceName, opts = {}) {
    const smsBody = buildAppointmentSms({
      ticketNumber: ticket.number,
      institutionName,
      serviceName,
      scheduledAt: ticket.scheduledAt,
      kind: 'confirm',
    })
    const { dateStr, timeStr } = formatAppointmentLocal(ticket.scheduledAt)

    // Opsional: ruaj telefonin nëse u dërgua nga forma e rezervimit
    if (opts.phone) {
      const user = await User.findById(userId)
      if (user && !user.phone) {
        user.phone = opts.phone
        user.notificationPrefs = {
          ...(user.notificationPrefs || {}),
          sms: true,
          email: true,
          inApp: true,
        }
        await user.save()
      } else if (user && opts.enableSms) {
        user.notificationPrefs = {
          ...(user.notificationPrefs || {}),
          sms: true,
        }
        await user.save()
      }
    }

    return this.notify(
      userId,
      'appointment_booked',
      'Termini u konfirmua',
      smsBody,
      {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.number,
        institutionId: ticket.institutionId.toString(),
        institutionName,
        serviceName,
        scheduledAt: ticket.scheduledAt,
        dateStr,
        timeStr,
        phoneOverride: opts.phone,
      },
      { inApp: true, email: true, sms: true, forceSms: opts.notifySms !== false },
    )
  }

  async appointmentReminder(userId, ticket, institutionName, serviceName) {
    const smsBody = buildAppointmentSms({
      ticketNumber: ticket.number,
      institutionName,
      serviceName,
      scheduledAt: ticket.scheduledAt,
      kind: 'reminder',
    })
    return this.notify(
      userId,
      'appointment_reminder',
      'Kujtesë termini',
      smsBody,
      {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.number,
        institutionId: ticket.institutionId.toString(),
        institutionName,
        serviceName,
        scheduledAt: ticket.scheduledAt,
      },
      { inApp: true, email: true, sms: true, forceSms: true },
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
      { inApp: true, email: true, sms: true, forceSms: true },
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
