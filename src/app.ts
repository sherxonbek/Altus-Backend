import express, { Application } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import { authRouter } from './auth/auth.routes'
import { channelRouter } from './channel/channel.routes'
import { subscriptionRouter } from './subscription/subscription.routes'
import { playlistRouter } from './playlist/playlist.routes'
import { uploadRouter } from './upload/upload.routes'
import { userRouter } from './user/user.routes'
import { errorHandler } from './middleware/error.middleware'

const app: Application = express()

// Global middlewarelar
app.use(compression()) // Javoblarni GZIP/Deflate orqali siqish (trafik va kechikishni keskin kamaytiradi)
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

// Katta video fayllarni xotirani band qilmasdan HTTP 206 Range orqali oqimli (chunked stream) uzatish
app.get('/uploads/videos/:filename', (req, res) => {
  const filePath = path.resolve(process.cwd(), 'uploads', 'videos', req.params.filename)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: 'Video fayli topilmadi' })
    return
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    // 2 MB gacha bo'lgan silliq bufer qismi
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 2 * 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1
    const fileStream = fs.createReadStream(filePath, { start, end })

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=86400',
    })
    fileStream.pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    })
    fs.createReadStream(filePath).pipe(res)
  }
})

// Static fayllar (muqovalar va rasmlar)
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'), {
    maxAge: '7d',
    etag: true,
  })
)

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
app.use('/api/users', userRouter)

// Global xatoliklar ushlovchisi
app.use(errorHandler)

export default app
