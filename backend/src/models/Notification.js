import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['ticket_issued', 'ticket_called', 'ticket_completed', 'ticket_cancelled', 'appointment_booked', 'appointment_reminder', 'system'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    ticketId: String,
    ticketNumber: String,
    institutionId: String,
    institutionName: String,
    counterId: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
  }
}, {
  timestamps: true,
});

// Auto-expire after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
