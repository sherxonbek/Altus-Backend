import { Schema, model, Document } from 'mongoose'

export interface ISetting extends Document {
  key: string
  coinPriceUsd: number
  usdToUzsRate: number
  streamRate360p: number // 1 daqiqalik 360p video uchun coin (default: 1)
  streamRate720p: number // 1 daqiqalik 720p video uchun coin (default: 3)
  streamRate1080p: number // 1 daqiqalik 1080p video uchun coin (default: 7)
  updatedAt: Date
}

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'system',
    },
    coinPriceUsd: {
      type: Number,
      default: 0.01, // 1 coin = 0.01$ (1 sent)
      min: 0.0001,
    },
    usdToUzsRate: {
      type: Number,
      default: 13000, // 1$ = 13,000 UZS
      min: 1,
    },
    streamRate360p: {
      type: Number,
      default: 1, // 1 coin/daqiqa (~0.01$)
      min: 0,
    },
    streamRate720p: {
      type: Number,
      default: 3, // 3 coin/daqiqa (~0.03$)
      min: 0,
    },
    streamRate1080p: {
      type: Number,
      default: 7, // 7 coin/daqiqa (~0.07$)
      min: 0,
    },
  },
  {
    timestamps: true,
  }
)

export const Setting = model<ISetting>('Setting', settingSchema)
