import { Schema, model, Document, Types } from 'mongoose'

export interface IUser extends Document {
  fullName: string
  phone: string
  password?: string
  role: 'user' | 'admin'
  avatar?: string
  coins: number
  isPhoneVerified: boolean
  refreshToken?: string
  purchasedCourses: Types.ObjectId[]
  purchasedLessons: string[]
  savedPlaylists: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}


const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
    },
    coins: {
      type: Number,
      default: 100, // Yangi ro'yxatdan o'tgan foydalanuvchiga 100 coin test bonusi
      min: 0,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    purchasedCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Playlist',
      },
    ],
    purchasedLessons: [
      {
        type: String,
      },
    ],
    savedPlaylists: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Playlist',
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Tez qidiruv va billing aggregation uchun indekslar
userSchema.index({ role: 1 })
userSchema.index({ purchasedCourses: 1 })
userSchema.index({ purchasedLessons: 1 })

export const User = model<IUser>('User', userSchema)
