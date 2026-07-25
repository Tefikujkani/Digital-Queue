import mongoose from 'mongoose'

const ticketSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    number: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'completed', 'cancelled'],
      default: 'waiting',
    },
    priority: {
      type: String,
      enum: ['normal', 'elderly', 'emergency', 'disability'],
      default: 'normal',
    },
    counterId: {
      type: String, // Can be ID or string like 'counter-1'
    },
    estimatedWaitTime: {
      type: Number,
      default: 0,
    },
    qrCode: {
      type: String,
    },
    scheduledAt: Date,
    remindersSent: {
      reminder24h: { type: Boolean, default: false },
      reminder2h: { type: Boolean, default: false },
    },
    calledAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  },
)

const Ticket = mongoose.model('Ticket', ticketSchema)
export default Ticket
