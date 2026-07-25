import mongoose from 'mongoose'
import Ticket from '../models/Ticket.js'
import Institution from '../models/Institution.js'

/**
 * Public wait / busyness stats for citizens
 */
export const getPublicWaitStats = async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id)
    if (!institution || !institution.isActive) {
      return res.status(404).json({ message: 'Institucioni nuk u gjet' })
    }

    const waiting = await Ticket.countDocuments({
      institutionId: institution._id,
      status: 'waiting',
    })
    const called = await Ticket.countDocuments({
      institutionId: institution._id,
      status: 'called',
    })

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const completed = await Ticket.find({
      institutionId: institution._id,
      status: 'completed',
      completedAt: { $gte: since },
      calledAt: { $exists: true },
    })
      .select('createdAt calledAt completedAt')
      .lean()

    let avgWaitMinutes = 0
    if (completed.length) {
      const total = completed.reduce((sum, t) => {
        const start = new Date(t.createdAt).getTime()
        const end = new Date(t.calledAt || t.completedAt).getTime()
        return sum + Math.max(0, (end - start) / 60000)
      }, 0)
      avgWaitMinutes = Math.round(total / completed.length)
    }

    const avgService =
      (institution.services || []).reduce((s, x) => s + (x.estimatedTime || 5), 0) /
        Math.max((institution.services || []).length, 1) || 5

    const estimatedWaitMinutes = Math.round(waiting * avgService)
    const load = waiting <= 3 ? 'low' : waiting <= 10 ? 'medium' : 'high'

    const hourBuckets = Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, count: 0 }))
    completed.forEach((t) => {
      const h = new Date(t.createdAt).getHours()
      const bucket = hourBuckets.find((b) => b.hour === h)
      if (bucket) bucket.count += 1
    })
    const quietest = [...hourBuckets].sort((a, b) => a.count - b.count)[0]

    res.json({
      institutionId: institution._id,
      name: institution.name,
      waiting,
      called,
      estimatedWaitMinutes,
      avgWaitMinutes: avgWaitMinutes || estimatedWaitMinutes,
      load,
      ratingAvg: institution.ratingAvg || 0,
      ratingCount: institution.ratingCount || 0,
      bestHourHint: quietest
        ? `${String(quietest.hour).padStart(2, '0')}:00–${String(quietest.hour + 1).padStart(2, '0')}:00`
        : '08:00–09:00',
      peakHours: hourBuckets,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/**
 * Batch wait stats for institution list cards
 */
export const getBatchWaitStats = async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50)

    if (!ids.length) return res.json({})

    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    const waitingAgg = await Ticket.aggregate([
      { $match: { institutionId: { $in: objectIds }, status: 'waiting' } },
      { $group: { _id: '$institutionId', waiting: { $sum: 1 } } },
    ])

    const map = {}
    for (const row of waitingAgg) {
      const waiting = row.waiting
      map[row._id.toString()] = {
        waiting,
        estimatedWaitMinutes: waiting * 5,
        load: waiting <= 3 ? 'low' : waiting <= 10 ? 'medium' : 'high',
      }
    }

    ids.forEach((id) => {
      if (!map[id]) map[id] = { waiting: 0, estimatedWaitMinutes: 0, load: 'low' }
    })

    res.json(map)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/** Kosovo cities hub with institution counts */
export const getCities = async (_req, res) => {
  try {
    const rows = await Institution.aggregate([
      { $match: { isActive: true, 'location.city': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          types: { $addToSet: '$type' },
          sampleLat: { $first: '$location.lat' },
          sampleLng: { $first: '$location.lng' },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])

    const kosovoOrder = [
      'Prishtinë',
      'Prizren',
      'Pejë',
      'Gjakovë',
      'Mitrovicë',
      'Gjilan',
      'Ferizaj',
      'Fushë Kosovë',
      'Podujevë',
      'Vushtrri',
    ]

    const cities = rows.map((r) => ({
      name: r._id,
      count: r.count,
      types: r.types,
      lat: r.sampleLat,
      lng: r.sampleLng,
    }))

    cities.sort((a, b) => {
      const ia = kosovoOrder.indexOf(a.name)
      const ib = kosovoOrder.indexOf(b.name)
      if (ia === -1 && ib === -1) return b.count - a.count
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })

    res.json({ cities, totalInstitutions: cities.reduce((s, c) => s + c.count, 0) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
