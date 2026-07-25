import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
})

const SeqCounter = mongoose.model('SeqCounter', counterSchema)

/** Numerim atomik ditor për bileta (pa race condition) */
export async function nextTicketSequence(institutionId) {
  const day = new Date().toISOString().slice(0, 10)
  const key = `ticket:${institutionId}:${day}`
  const doc = await SeqCounter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )
  return doc.seq
}

export const PRIORITY_RANK = {
  emergency: 0,
  elderly: 1,
  disability: 2,
  normal: 3,
}

export function priorityRank(priority) {
  return PRIORITY_RANK[priority] ?? 3
}
