import User from '../models/User.js'
import Institution from '../models/Institution.js'

export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      match: { isActive: true },
    })
    res.json(user?.favorites || [])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const toggleFavorite = async (req, res) => {
  try {
    const { institutionId } = req.params
    const institution = await Institution.findById(institutionId)
    if (!institution || !institution.isActive) {
      return res.status(404).json({ message: 'Institucioni nuk u gjet' })
    }

    const user = await User.findById(req.user._id)
    const idx = user.favorites.findIndex((id) => id.toString() === institutionId)
    let favorited = false
    if (idx >= 0) {
      user.favorites.splice(idx, 1)
    } else {
      user.favorites.push(institution._id)
      favorited = true
    }
    await user.save()
    res.json({
      favorited,
      favorites: user.favorites,
      message: favorited ? 'U shtua te të preferuarat' : 'U hoq nga të preferuarat',
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateCitizenPrefs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (req.body.preferredCity !== undefined) {
      user.preferredCity = String(req.body.preferredCity).slice(0, 80)
    }
    if (req.body.telegramChatId !== undefined) {
      user.telegramChatId = String(req.body.telegramChatId).trim().slice(0, 64)
    }
    if (req.body.notificationPrefs) {
      user.notificationPrefs = {
        inApp: req.body.notificationPrefs.inApp ?? user.notificationPrefs?.inApp ?? true,
        email: req.body.notificationPrefs.email ?? user.notificationPrefs?.email ?? true,
        sms: req.body.notificationPrefs.sms ?? user.notificationPrefs?.sms ?? false,
        telegram:
          req.body.notificationPrefs.telegram ?? user.notificationPrefs?.telegram ?? false,
      }
    }
    await user.save()
    res.json({
      preferredCity: user.preferredCity,
      telegramChatId: user.telegramChatId,
      notificationPrefs: user.notificationPrefs,
      favorites: user.favorites,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
