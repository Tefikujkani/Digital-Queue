import mongoose from 'mongoose'

const ticketSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
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
      enum: ['waiting', 'called', 'completed', 'cancelled', 'checked_in'],
      default: 'waiting',
      index: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'elderly', 'emergency', 'disability'],
      default: 'normal',
    },
    priorityRank: {
      type: Number,
      default: 3,
      index: true,
    },
    counterId: {
      type: String,
    },
    estimatedWaitTime: {
      type: Number,
      default: 0,
    },
    qrCode: {
      type: String,
      index: true,
    },
    scheduledAt: Date,
    checkedInAt: Date,
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

ticketSchema.index({ institutionId: 1, status: 1, priorityRank: 1, createdAt: 1 })

const Ticket = mongoose.model('Ticket', ticketSchema)
export default Ticket
