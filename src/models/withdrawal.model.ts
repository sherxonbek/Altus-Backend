import { Schema, model, Document, Types } from 'mongoose'

export interface IWithdrawal extends Document {
  userId: Types.ObjectId
  channelId: Types.ObjectId
  amount: number
  cardNumber: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    amount: { type: Number, required: true },
    cardNumber: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
)

export const Withdrawal = model<IWithdrawal>('Withdrawal', withdrawalSchema)
