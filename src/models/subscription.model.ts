import { Schema, model, Document, Types } from 'mongoose'

export interface ISubscription extends Document {
  userId: Types.ObjectId
  channelId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Bitta foydalanuvchi bitta kanalga faqat bir marta obuna bo'lishi mumkin
subscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true })
// Kanal obunachilarini tez topish va hisoblash uchun
subscriptionSchema.index({ channelId: 1 })

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema)
