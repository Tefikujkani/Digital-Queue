import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Institution from './src/models/Institution.js';
import { issueTicket } from './src/controllers/ticketController.js';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ role: 'citizen' }) || await User.findOne();
  const inst = await Institution.findOne();
  const req = {
    user,
    body: {
      institutionId: inst._id.toString(),
      serviceId: inst.services[0]?._id?.toString() || 'fake-service',
      priority: 'normal',
      userName: user.name
    },
    io: { to: () => ({ emit: () => {} }) },
    notificationService: { ticketIssued: async () => {} }
  };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => console.log('Response:', data)
  };

  await issueTicket(req, res);
  process.exit(0);
}
run();
