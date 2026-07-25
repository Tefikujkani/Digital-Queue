import mongoose from 'mongoose';

const institutionSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['municipality', 'hospital', 'bank', 'university', 'post', 'ministry', 'utility', 'court', 'embassy', 'other']
  },
  location: {
    address: String,
    city: String,
    lat: Number,
    lng: Number
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  services: [{
    name: String,
    description: String,
    estimatedTime: Number, // in minutes
    requiredDocuments: [String],
  }],
  workingHours: {
    open: String,
    close: String
  },
  logo: String,
  isActive: {
    type: Boolean,
    default: true
  },
  ratingAvg: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Institution = mongoose.model('Institution', institutionSchema);
export default Institution;
