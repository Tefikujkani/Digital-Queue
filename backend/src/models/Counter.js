import mongoose from 'mongoose';

const counterSchema = mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  name: String, // e.g. "Sporteli 1", "Arka A"
  status: {
    type: String,
    enum: ['active', 'inactive', 'break'],
    default: 'inactive'
  },
  currentTicketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
