import Rating from '../models/Rating.js'
import Institution from '../models/Institution.js'
import Ticket from '../models/Ticket.js'

async function refreshInstitutionRating(institutionId) {
  const stats = await Rating.aggregate([
    { $match: { institutionId } },
    {
      $group: {
        _id: '$institutionId',
        avg: { $avg: '$score' },
        count: { $sum: 1 },
      },
    },
  ])
  const avg = stats[0]?.avg || 0
  const count = stats[0]?.count || 0
  await Institution.findByIdAndUpdate(institutionId, {
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: count,
  })
  return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count }
}

export const createOrUpdateRating = async (req, res) => {
  try {
    const { institutionId, score, comment, ticketId } = req.body
    if (!institutionId || !score || score < 1 || score > 5) {
      return res.status(400).json({ message: 'institutionId dhe score (1-5) janë të detyrueshme' })
    }

    const institution = await Institution.findById(institutionId)
    if (!institution) return res.status(404).json({ message: 'Institucioni nuk u gjet' })

    if (ticketId) {
      const ticket = await Ticket.findById(ticketId)
      if (!ticket || ticket.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Ticket i pavlefshëm' })
      }
    }

    const rating = await Rating.findOneAndUpdate(
      { userId: req.user._id, institutionId },
      {
        score: Number(score),
        comment: comment ? String(comment).slice(0, 500) : undefined,
        ticketId: ticketId || undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const summary = await refreshInstitutionRating(institution._id)
    res.status(201).json({ rating, ...summary })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getInstitutionRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ institutionId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name')
      .lean()
    const institution = await Institution.findById(req.params.id).select('ratingAvg ratingCount name')
    res.json({
      ratingAvg: institution?.ratingAvg || 0,
      ratingCount: institution?.ratingCount || 0,
      reviews: ratings.map((r) => ({
        id: r._id,
        score: r.score,
        comment: r.comment,
        userName: r.userId?.name || 'Qytetar',
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
