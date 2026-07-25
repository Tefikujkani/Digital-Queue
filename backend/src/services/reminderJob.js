import Ticket from '../models/Ticket.js'
import Institution from '../models/Institution.js'
import NotificationService from './notificationService.js'

/**
 * Dërgon kujtesa SMS/email për terminet:
 * - ~24 orë para
 * - ~2 orë para
 * Falas (email + cascade SMS).
 */
export function startAppointmentReminderJob(io) {
  const notificationService = new NotificationService(io)
  const TICK_MS = 5 * 60 * 1000 // çdo 5 minuta

  const run = async () => {
    try {
      const now = Date.now()
      const windows = [
        { key: 'reminder24h', min: 23 * 60 * 60 * 1000, max: 25 * 60 * 60 * 1000 },
        { key: 'reminder2h', min: 1.5 * 60 * 60 * 1000, max: 2.5 * 60 * 60 * 1000 },
      ]

      for (const w of windows) {
        const from = new Date(now + w.min)
        const to = new Date(now + w.max)

        const tickets = await Ticket.find({
          status: 'waiting',
          scheduledAt: { $gte: from, $lte: to },
          [`remindersSent.${w.key}`]: { $ne: true },
        }).limit(50)

        for (const ticket of tickets) {
          const institution = await Institution.findById(ticket.institutionId).lean()
          const service = institution?.services?.find(
            (s) => s._id?.toString() === ticket.serviceId || s.id === ticket.serviceId,
          )
          await notificationService.appointmentReminder(
            ticket.userId,
            ticket,
            institution?.name || 'Institucioni',
            service?.name || 'Shërbim',
          )
          ticket.remindersSent = {
            ...(ticket.remindersSent || {}),
            [w.key]: true,
          }
          await ticket.save()
          console.log(`⏰ Reminder ${w.key} → ticket ${ticket.number}`)
        }
      }
    } catch (err) {
      console.error('Reminder job error:', err.message)
    }
  }

  // delay first run a bit after boot
  setTimeout(run, 15_000)
  setInterval(run, TICK_MS)
  console.log('⏰ Appointment reminder job started (24h + 2h, every 5 min)')
}
