import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/** Attach req.user when a valid Bearer token is present; otherwise continue as guest. */
export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
    }
  } catch {
    req.user = null
  }
  next()
}
