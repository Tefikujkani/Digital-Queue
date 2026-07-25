/**
 * Shton institucione shtesë për Ferizaj, Gjakovë, Podujevë, Vushtrri
 * pa fshirë të dhënat ekzistuese.
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Institution from '../models/Institution.js'
import Counter from '../models/Counter.js'
import User from '../models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

const EXTRA = [
  {
    name: 'Komuna e Ferizajt',
    type: 'municipality',
    location: { address: 'Sheshi Dëshmorët e Kombit', city: 'Ferizaj', lat: 42.3709, lng: 21.1553 },
    contact: { phone: '0290 326 100', email: 'info@ferizaj-gov.net' },
    workingHours: { open: '08:00', close: '16:00' },
    services: [
      { name: 'Certifikata të lindjes', description: 'Ekstrakte gjendje civile', estimatedTime: 15, requiredDocuments: ['Letërnjoftimi', 'Numri personal'] },
      { name: 'Leje ndërtimi', description: 'Aplikime komunale', estimatedTime: 30, requiredDocuments: ['Plan urbanistik', 'Pronësia'] },
    ],
  },
  {
    name: 'Spitali i Përgjithshëm Ferizaj',
    type: 'hospital',
    location: { address: 'Rruga e Spitalit', city: 'Ferizaj', lat: 42.375, lng: 21.16 },
    contact: { phone: '0290 321 122' },
    workingHours: { open: '07:00', close: '20:00' },
    services: [
      { name: 'Ambulancë', description: 'Kontrollë e përgjithshme', estimatedTime: 20, requiredDocuments: ['Letërnjoftimi', 'Kartela shëndetësore'] },
    ],
  },
  {
    name: 'Komuna e Gjakovës',
    type: 'municipality',
    location: { address: 'Sheshi i Çarshisë', city: 'Gjakovë', lat: 42.3803, lng: 20.4308 },
    contact: { phone: '0390 320 100' },
    workingHours: { open: '08:00', close: '16:00' },
    services: [
      { name: 'Dokumente personale', description: 'Certifikata', estimatedTime: 15, requiredDocuments: ['Letërnjoftimi'] },
    ],
  },
  {
    name: 'Komuna e Podujevës',
    type: 'municipality',
    location: { address: 'Qendra e Qytetit', city: 'Podujevë', lat: 42.9106, lng: 21.1931 },
    contact: { phone: '038 571 100' },
    workingHours: { open: '08:00', close: '16:00' },
    services: [
      { name: 'Gjendja civile', description: 'Certifikata', estimatedTime: 15, requiredDocuments: ['Letërnjoftimi'] },
    ],
  },
  {
    name: 'Komuna e Vushtrrisë',
    type: 'municipality',
    location: { address: 'Sheshi i Qytetit', city: 'Vushtrri', lat: 42.8231, lng: 20.9675 },
    contact: { phone: '028 572 100' },
    workingHours: { open: '08:00', close: '16:00' },
    services: [
      { name: 'Shërbime administrative', description: 'Vërtetime', estimatedTime: 15, requiredDocuments: ['Letërnjoftimi'] },
    ],
  },
]

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  let added = 0
  for (const row of EXTRA) {
    const exists = await Institution.findOne({ name: row.name })
    if (exists) {
      console.log('skip', row.name)
      continue
    }
    const inst = await Institution.create({ ...row, isActive: true })
    const slug = row.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '')
      .slice(0, 40)
    const email = `admin.${slug}@smartqueue.com`
    let admin = await User.findOne({ email })
    if (!admin) {
      admin = await User.create({
        name: `Admin ${row.location.city}`,
        email,
        password: 'admin123',
        role: 'admin',
        institutionId: inst._id,
        phone: '+38344000000',
      })
    } else {
      admin.institutionId = inst._id
      await admin.save()
    }
    await Counter.insertMany([
      { number: 1, name: 'Sporteli 1', institutionId: inst._id, isActive: true },
      { number: 2, name: 'Sporteli 2', institutionId: inst._id, isActive: true },
    ])
    console.log('added', row.name, 'admin', admin.email)
    added++
  }
  console.log('Done. Added', added)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
