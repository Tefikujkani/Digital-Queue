import Institution from '../models/Institution.js'
import Counter from '../models/Counter.js'
import Ticket from '../models/Ticket.js'

// @desc    Get all active institutions
// @route   GET /api/institutions
// @access  Public
export const getInstitutions = async (req, res) => {
  try {
    const institutions = await Institution.find({ isActive: true })
    res.json(institutions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all institutions (including inactive)
// @route   GET /api/institutions/all
// @access  Private/SuperAdmin
export const getAllInstitutions = async (req, res) => {
  try {
    const institutions = await Institution.find({})
    res.json(institutions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get institution by ID
// @route   GET /api/institutions/:id
// @access  Public
export const getInstitutionById = async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id)
    if (institution) {
      res.json(institution)
    } else {
      res.status(404).json({ message: 'Institution not found' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all counters for an institution
// @route   GET /api/counters/institution/:id
// @access  Private
export const getCounters = async (req, res) => {
  try {
    const counters = await Counter.find({ institutionId: req.params.id })
    res.json(counters)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Create a new institution
// @route   POST /api/institutions
// @access  Private/Admin
export const createInstitution = async (req, res) => {
  try {
    const { name, type, location, services = [], workingHours, logo, isActive = true } = req.body

    if (!name || !type || !workingHours) {
      return res.status(400).json({ message: 'Emri, tipi dhe orari i punes jane te detyrueshem' })
    }

    const institution = new Institution({
      name,
      type,
      location,
      services,
      workingHours,
      logo,
      isActive,
      adminId: req.user._id,
    })

    const createdInstitution = await institution.save()
    res.status(201).json(createdInstitution)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update institution status
// @route   PUT /api/institutions/:id/status
// @access  Private/SuperAdmin
export const updateInstitutionStatus = async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id)
    if (institution) {
      institution.isActive = req.body.isActive
      const updatedInstitution = await institution.save()
      res.json(updatedInstitution)
    } else {
      res.status(404).json({ message: 'Institution not found' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update counter status
// @route   PUT /api/counters/:id
// @access  Private/Admin
export const updateCounter = async (req, res) => {
  try {
    const counter = await Counter.findById(req.params.id)
    if (counter) {
      counter.isActive = req.body.isActive ?? counter.isActive
      counter.currentTicketId = req.body.currentTicketId ?? counter.currentTicketId
      const updatedCounter = await counter.save()
      res.json(updatedCounter)
    } else {
      res.status(404).json({ message: 'Counter not found' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get institution analytics
// @route   GET /api/institutions/:id/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
  try {
    const institutionId = req.params.id

    // Total tickets today
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const todayTickets = await Ticket.countDocuments({
      institutionId,
      createdAt: { $gte: startOfDay },
    })

    const completedToday = await Ticket.countDocuments({
      institutionId,
      status: 'completed',
      createdAt: { $gte: startOfDay },
    })

    const cancelledToday = await Ticket.countDocuments({
      institutionId,
      status: 'cancelled',
      createdAt: { $gte: startOfDay },
    })

    // Mock peak hours and service distribution for now or implement aggregation
    const peakHoursData = [
      { hour: '08:00', count: 12 },
      { hour: '10:00', count: 45 },
      { hour: '12:00', count: 30 },
      { hour: '14:00', count: 55 },
      { hour: '16:00', count: 20 },
    ]

    res.json({
      todayTickets,
      completedToday,
      cancelledToday,
      peakHoursData,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get services for an institution
// @route   GET /api/institutions/:id/services
// @access  Public
export const getServices = async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id)
    if (institution) {
      res.json(institution.services)
    } else {
      res.status(404).json({ message: 'Institution not found' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
