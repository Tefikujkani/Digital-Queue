import User from '../models/User.js'
import Ticket from '../models/Ticket.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { sendEmail } from '../services/emailService.js'

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId,
    phone: user.phone,
    favorites: user.favorites || [],
    preferredCity: user.preferredCity || 'Prishtinë',
    telegramChatId: user.telegramChatId || '',
    viberId: user.viberId || '',
    whatsappPhone: user.whatsappPhone || '',
    notificationPrefs: user.notificationPrefs,
  }
}

function validatePassword(password) {
  if (!password || String(password).length < 8) {
    return 'Fjalëkalimi duhet të ketë të paktën 8 karaktere'
  }
  return null
}

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Emri, email dhe fjalëkalimi janë të detyrueshëm' })
    }
    const pwErr = validatePassword(password)
    if (pwErr) return res.status(400).json({ message: pwErr })

    const normalizedEmail = String(email).toLowerCase().trim()
    const userExists = await User.findOne({ email: normalizedEmail })
    if (userExists) {
      return res.status(400).json({ message: 'Ky email ekziston tashmë' })
    }

    // SIGURI: role gjithmonë citizen — admin vetëm nga seed/superadmin
    const user = await User.create({
      name: String(name).trim().slice(0, 80),
      email: normalizedEmail,
      password,
      role: 'citizen',
      phone: phone ? String(phone).trim().slice(0, 20) : undefined,
    })

    res.status(201).json({
      ...publicUser(user),
      token: generateToken(user._id),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dhe fjalëkalimi janë të detyrueshëm' })
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
      '+password',
    )
    if (user && (await user.matchPassword(password))) {
      res.json({
        ...publicUser(user),
        token: generateToken(user._id),
      })
    } else {
      res.status(401).json({ message: 'Email ose fjalëkalim i gabuar' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (user) res.json(publicUser(user))
    else res.status(404).json({ message: 'User not found' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (req.body.name !== undefined) user.name = String(req.body.name).trim().slice(0, 80)
    if (req.body.phone !== undefined) user.phone = String(req.body.phone).trim().slice(0, 20)
    if (req.body.preferredCity !== undefined) {
      user.preferredCity = String(req.body.preferredCity).slice(0, 80)
    }
    await user.save()
    res.json(publicUser(user))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const pwErr = validatePassword(newPassword)
    if (pwErr) return res.status(400).json({ message: pwErr })

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!(await user.matchPassword(currentPassword || ''))) {
      return res.status(400).json({ message: 'Fjalëkalimi aktual është gabim' })
    }
    user.password = newPassword
    await user.save()
    res.json({ message: 'Fjalëkalimi u ndryshua' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    // Mos ekspozo nëse email ekziston
    const generic = {
      message: 'Nëse email ekziston, do të marrësh udhëzime për rivendosje.',
    }
    const user = await User.findOne({ email })
    if (!user) return res.json(generic)

    const token = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex')
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    const client = process.env.CLIENT_URL || 'http://localhost:5178'
    const link = `${client}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    await sendEmail(
      email,
      'Rivendos fjalëkalimin — SmartQueue',
      `<div style="font-family:sans-serif;padding:24px">
        <h2>Rivendos fjalëkalimin</h2>
        <p>Kliko linkun (vlen 1 orë):</p>
        <p><a href="${link}">${link}</a></p>
        <p style="color:#888;font-size:12px">Nëse nuk e kërkove ti, injoroje këtë email.</p>
      </div>`,
    )
    res.json(generic)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body
    const pwErr = validatePassword(newPassword)
    if (pwErr) return res.status(400).json({ message: pwErr })
    if (!email || !token) return res.status(400).json({ message: 'Të dhëna të paplota' })

    const hashed = crypto.createHash('sha256').update(String(token)).digest('hex')
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken')

    if (!user) {
      return res.status(400).json({ message: 'Token i pavlefshëm ose i skaduar' })
    }
    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()
    res.json({ message: 'Fjalëkalimi u rivendos. Mund të kyçesh.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body
    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!(await user.matchPassword(password || ''))) {
      return res.status(400).json({ message: 'Fjalëkalimi është gabim' })
    }

    await Ticket.updateMany(
      { userId: user._id, status: { $in: ['waiting', 'checked_in', 'called'] } },
      { $set: { status: 'cancelled' } },
    )
    await User.findByIdAndDelete(user._id)
    res.json({ message: 'Llogaria u fshi. Të dhënat personale u hoqën.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/** Superadmin: krijon admin për institucion */
export const createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role, institutionId, phone } = req.body
    if (!['admin'].includes(role)) {
      return res.status(400).json({ message: 'Vetëm role admin lejohet këtu' })
    }
    const pwErr = validatePassword(password)
    if (pwErr) return res.status(400).json({ message: pwErr })
    if (!institutionId) {
      return res.status(400).json({ message: 'institutionId është i detyrueshëm' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: 'Email ekziston' })
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: 'admin',
      institutionId,
      phone,
    })
    res.status(201).json(publicUser(user))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
