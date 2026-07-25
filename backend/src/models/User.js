import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['citizen', 'admin', 'superadmin'],
    default: 'citizen'
  },
  phone: String,
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  }],
  preferredCity: {
    type: String,
    default: 'Prishtinë'
  },
  telegramChatId: {
    type: String,
    default: ''
  },
  telegramLinkCode: {
    type: String,
    select: false
  },
  telegramLinkExpires: {
    type: Date,
    select: false
  },
  viberId: {
    type: String,
    default: ''
  },
  viberLinkCode: {
    type: String,
    select: false
  },
  viberLinkExpires: {
    type: Date,
    select: false
  },
  notificationPrefs: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    telegram: { type: Boolean, default: false },
    viber: { type: Boolean, default: false }
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
