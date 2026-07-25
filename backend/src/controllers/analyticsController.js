import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';

export const getInstitutionStats = async (req, res) => {
  try {
    const { id } = req.params;
    const institutionId = new mongoose.Types.ObjectId(id);

    const stats = await Ticket.aggregate([
      { $match: { institutionId: institutionId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgWaitTime: {
            $avg: {
              $cond: [
                { $and: ['$calledAt', '$createdAt'] },
                { $subtract: ['$calledAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get daily ticket volume for charts
    const dailyVolume = await Ticket.aggregate([
      { $match: { institutionId: institutionId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } },
      { $limit: 7 }
    ]);

    res.json({
      summary: stats,
      dailyVolume: dailyVolume
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
