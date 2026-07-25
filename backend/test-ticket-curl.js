import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './src/models/User.js';
import Institution from './src/models/Institution.js';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ role: 'superadmin' });
  const inst = await Institution.findOne();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  console.log(`Token: ${token}`);
  console.log(`Inst ID: ${inst._id}`);
  console.log(`Service ID: ${inst.services[0]._id}`);
  process.exit(0);
}
run();
