import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail, ticketIssuedEmail, ticketCalledEmail, ticketCompletedEmail } from './emailService.js';
import { sendSMS } from './smsService.js';

/**
 * Central notification service — handles in-app, email, SMS
 */
class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Krijon njoftim dhe e dërgon me të gjitha kanalet
   */
  async notify(userId, type, title, message, data = {}, channels = {}) {
    const inApp = channels.inApp !== false; // default true
    const email = channels.email || false;
    const sms = channels.sms || false;

    // 1. Ruaj njoftimin në bazë
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      channels: { inApp, email, sms },
    });

    // 2. Real-time via Socket.io
    if (inApp && this.io) {
      this.io.to(`user_${userId}`).emit('notification', {
        id: notification._id,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: notification.createdAt,
      });
    }

    // 3. Email
    if (email) {
      try {
        const user = await User.findById(userId);
        if (user?.email) {
          let emailContent;
          switch (type) {
            case 'ticket_issued':
              emailContent = ticketIssuedEmail(user.name, data.ticketNumber, data.institutionName, data.scheduledAt, data.serviceName);
              break;
            case 'ticket_called':
              emailContent = ticketCalledEmail(user.name, data.ticketNumber, data.counterId);
              break;
            case 'ticket_completed':
              emailContent = ticketCompletedEmail(user.name, data.ticketNumber);
              break;
            default:
              emailContent = { subject: title, html: `<p>${message}</p>` };
          }
          await sendEmail(user.email, emailContent.subject, emailContent.html);
        }
      } catch (err) {
        console.error('Email notification failed:', err.message);
      }
    }

    // 4. SMS
    if (sms) {
      try {
        const user = await User.findById(userId);
        if (user?.phone) {
          await sendSMS(user.phone, message);
        }
      } catch (err) {
        console.error('SMS notification failed:', err.message);
      }
    }

    return notification;
  }

  // Shorthand: Bileta e re u lëshua
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
      { inApp: true, email: true, sms: true }
    );
  }

  // Shorthand: Bileta u thirr
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
      { inApp: true, email: true, sms: true }
    );
  }

  // Shorthand: Shërbimi u përfundua
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
      { inApp: true, email: true }
    );
  }
}

export default NotificationService;
