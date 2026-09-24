import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticateJwt } from '../auth/auth.middleware'
import { uploadController } from './upload.controller'

const uploadRouter = Router()

// Upload papkalarini yaratish
const uploadsBaseDir = path.resolve(process.cwd(), 'uploads')
const videosDir = path.join(uploadsBaseDir, 'videos')
const thumbnailsDir = path.join(uploadsBaseDir, 'thumbnails')

if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true })
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true })
}

// 1. Video uchun Multer sozlamasi
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, videosDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4'
    const safeName = `video_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, safeName)
  },
})

const videoFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|flv|m4v)$/i.test(file.originalname)) {
    cb(null, true)
  } else {
    cb(new Error('Faqat video formatidagi fayllar qabul qilinadi (mp4, webm, mov, mkv va h.k.)'))
  }
}

const uploadVideoMulter = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB maksimal hajm
  },
})

// 2. Rasm / Muqova (Thumbnail) uchun Multer sozlamasi
const thumbnailStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, thumbnailsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    const safeName = `thumb_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, safeName)
  },
})

const thumbnailFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) {
    cb(null, true)
  } else {
    cb(new Error('Faqat rasm formatidagi fayllar qabul qilinadi (jpg, png, webp va h.k.)'))
  }
}

const uploadThumbnailMulter = multer({
  storage: thumbnailStorage,
  fileFilter: thumbnailFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB maksimal hajm
  },
})

// Endpointlar
uploadRouter.get(
  '/kinescope/config',
  authenticateJwt,
  uploadController.getKinescopeUploadConfig
)

uploadRouter.get(
  '/progress/:uploadId',
  authenticateJwt,
  uploadController.getUploadProgress
)

uploadRouter.post(
  '/video',
  authenticateJwt,
  uploadVideoMulter.single('video'),
  uploadController.uploadVideo
)

uploadRouter.post(
  '/thumbnail',
  authenticateJwt,
  uploadThumbnailMulter.single('thumbnail'),
  uploadController.uploadThumbnail
)

uploadRouter.get(
  '/kinescope/status/:videoId',
  authenticateJwt,
  uploadController.getKinescopeStatus
)

export { uploadRouter }
