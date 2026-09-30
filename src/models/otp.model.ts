import { Schema, model, Document } from 'mongoose'

export interface IOtp extends Document {
  phone: string
  code: string
  isVerified: boolean
  createdAt: Date
}

const otpSchema = new Schema<IOtp>(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // 5 daqiqadan so'ng avtomatik o'chiriladi (TTL index)
    },
  },
  {
    timestamps: false,
  }
)

// Tez qidiruv uchun indeks
otpSchema.index({ phone: 1, createdAt: -1 })

export const Otp = model<IOtp>('Otp', otpSchema)
