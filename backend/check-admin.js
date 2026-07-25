import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'admin@smartqueue.com' });
  if (user) {
    console.log('Superadmin found:', user.email, 'Role:', user.role);
    const match = await bcrypt.compare('admin123', user.password);
    console.log('Password match:', match);
  } else {
    console.log('Superadmin NOT found');
    const allUsers = await User.find({}).limit(5);
    console.log('Other users:', allUsers.map(u => ({ email: u.email, role: u.role })));
  }
  process.exit(0);
}
run();
