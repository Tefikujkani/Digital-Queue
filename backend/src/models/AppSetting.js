import mongoose from 'mongoose'

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

export default mongoose.model('AppSetting', appSettingSchema)
