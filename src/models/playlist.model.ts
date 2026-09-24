import { Schema, model, Document, Types } from 'mongoose'

export interface ILesson {
  id: string
  title: string
  description?: string
  videoUrl: string
  kinescopeId?: string
  thumbnail?: string
  duration?: string
  fileSize?: number
  rawPrice?: number
  price: string
  isFree: boolean
  createdAt: Date
}


export interface IPlaylist extends Document {
  channelId: Types.ObjectId
  userId: Types.ObjectId
  title: string
  authorPrice?: number
  rawPrice: number
  price: string
  thumbnail?: string
  description?: string
  rating: number
  videos: ILesson[]
  createdAt: Date
  updatedAt: Date
}

const lessonSchema = new Schema<ILesson>(
  {
    id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    kinescopeId: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      default: '10:00',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    rawPrice: {
      type: Number,
      default: 0,
    },
    price: {
      type: String,
      default: 'Bepul',
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
)

const playlistSchema = new Schema<IPlaylist>(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authorPrice: {
      type: Number,
      default: 0,
    },
    rawPrice: {
      type: Number,
      default: 0,
    },
    price: {
      type: String,
      default: 'Bepul',
    },
    thumbnail: {
      type: String,
      trim: true,
      default:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
    },
    description: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 5.0,
    },
    videos: [lessonSchema],
  },
  {
    timestamps: true,
  }
)

export const Playlist = model<IPlaylist>('Playlist', playlistSchema)
