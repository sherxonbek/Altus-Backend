import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../auth/auth.middleware'
import { kinescopeService } from '../kinescope/kinescope.service'
import { config } from '../config/env'
import { uploadProgressManager } from './upload.progress'

export class UploadController {
  /**
   * Frontend yuklash sozlamalarini olish (Master API kaliti oshkor bo'lmasligi uchun server orqali o'tkaziladi)
   */
  getKinescopeUploadConfig(_req: AuthenticatedRequest, res: Response): void {
    if (!kinescopeService.isConfigured()) {
      res.status(200).json({
        success: false,
        directUpload: false,
        message: 'Server sozlanmagan',
      })
      return
    }

    // Xavfsizlik: Master API kaliti frontend brauzeriga berilmaydi!
    res.status(200).json({
      success: true,
      directUpload: false,
      message: 'Xavfsiz server orqali yuklash faol',
      projectId: config.kinescopeProjectId,
    })
  }

  /**
   * Serverdagi yuklash jarayoni foizini olish
   */
  getUploadProgress(req: AuthenticatedRequest, res: Response): void {
    const rawId = req.params.uploadId
    const uploadId = Array.isArray(rawId) ? rawId[0] : rawId
    if (!uploadId) {
      res.status(400).json({ success: false, message: 'uploadId ko‘rsatilmadi' })
      return
    }

    const progress = uploadProgressManager.get(uploadId)
    res.status(200).json({
      success: true,
      progress: progress || {
        uploadId,
        stage: 'uploading_server',
        percent: 0,
        message: 'Server javobi kutilmoqda...',
      },
    })
  }

  async uploadVideo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Video fayli tanlanmagan' })
        return
      }

      const uploadId = (req.headers['x-upload-id'] as string) || (req.body?.uploadId as string)
      const localFileUrl = `/uploads/videos/${req.file.filename}`
      const localFilePath = req.file.path

      // Kinescope xizmati sozlangan bo'lsa, videoni DRM xizmatiga yuklaymiz
      if (kinescopeService.isConfigured()) {
        try {
          if (uploadId) {
            uploadProgressManager.set(uploadId, {
              stage: 'uploading_kinescope',
              percent: 0,
              message: 'Serverga yuklashni boshladi...',
            })
          }

          const kinescopeData = await kinescopeService.uploadVideo(
            localFilePath,
            req.body?.title || req.file.originalname,
            req.body?.description,
            (pct) => {
              if (uploadId) {
                uploadProgressManager.set(uploadId, {
                  stage: 'uploading_kinescope',
                  percent: pct,
                  message: `Serverga yuklamoqda: ${pct}%`,
                })
              }
            }
          )

          if (uploadId) {
            uploadProgressManager.set(uploadId, {
              stage: 'done',
              percent: 100,
              message: 'Video muvaffaqiyatli saqlandi',
            })
          }

          res.status(200).json({
            success: true,
            message: 'Video muvaffaqiyatli yuklandi',
            provider: 'kinescope',
            url: kinescopeData.embed_link,
            playLink: kinescopeData.play_link,
            embedLink: kinescopeData.embed_link,
            videoId: kinescopeData.id,
            status: kinescopeData.status,
            localFallbackUrl: localFileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
          })
          return
        } catch (kinescopeError: any) {
          console.error(
            'Serverga yuklashda xatolik, lokal saqlashga o‘tildi:',
            kinescopeError?.response?.data || kinescopeError.message
          )
          if (uploadId) {
            uploadProgressManager.set(uploadId, {
              stage: 'error',
              percent: 100,
              message: 'Server xatosi tufayli lokal formatda saqlandi',
            })
          }
        }
      }

      // Agar Kinescope sozlanmagan yoki xatolik bersa, lokal saqlash orqali davom etadi
      res.status(200).json({
        success: true,
        message: 'Video muvaffaqiyatli yuklandi',
        provider: 'local',
        url: localFileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      })
    } catch (error) {
      next(error)
    }
  }

  async getKinescopeStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.videoId
      const videoId = Array.isArray(rawId) ? rawId[0] : rawId
      if (!videoId) {
        res.status(400).json({ success: false, message: 'Video ID ko‘rsatilmadi' })
        return
      }

      const videoData = await kinescopeService.getVideo(videoId)
      res.status(200).json({
        success: true,
        data: videoData,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.response?.data?.error?.message || error.message || 'Statusni olishda xatolik',
      })
    }
  }

  uploadThumbnail(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Rasm fayli tanlanmagan' })
        return
      }

      const fileUrl = `/uploads/thumbnails/${req.file.filename}`

      res.status(200).json({
        success: true,
        message: 'Rasm muvaffaqiyatli yuklandi',
        url: fileUrl,
        filename: req.file.filename,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const uploadController = new UploadController()

