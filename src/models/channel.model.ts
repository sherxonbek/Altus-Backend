import { Schema, model, Document, Types } from 'mongoose'

export interface IChannel extends Document {
  userId: Types.ObjectId
  title: string
  username: string
  avatar?: string
  banner?: string
  description?: string
  subscribersCount: number
  videosCount: number
  createdAt: Date
  updatedAt: Date
}

const channelSchema = new Schema<IChannel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    banner: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subscribersCount: {
      type: Number,
      default: 0,
    },
    videosCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id
        return ret
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id
        return ret
      },
    },
  }
)

export const Channel = model<IChannel>('Channel', channelSchema)
