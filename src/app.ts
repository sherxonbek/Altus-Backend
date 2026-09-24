import express, { Application } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { authRouter } from './auth/auth.routes'
import { channelRouter } from './channel/channel.routes'
import { subscriptionRouter } from './subscription/subscription.routes'
import { playlistRouter } from './playlist/playlist.routes'
import { uploadRouter } from './upload/upload.routes'
import { errorHandler } from './middleware/error.middleware'

const app: Application = express()

// Global middlewarelar
app.use(
  cors({
    origin: (origin, callback) => {
      // Frontend so'rovlariga ruxsat berish (cookies bilan ishlash uchun)
      callback(null, true)
    },
    credentials: true,
  })
)
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static fayllar (yuklangan videolar va rasmlar)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// Healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Asosiy API yo'llari
app.use('/api/auth', authRouter)
app.use('/api/channels', channelRouter)
app.use('/api/subscriptions', subscriptionRouter)
app.use('/api/playlists', playlistRouter)
app.use('/api/upload', uploadRouter)

// Global xatoliklar ushlovchisi
app.use(errorHandler)

export default app
