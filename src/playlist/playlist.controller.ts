import { Request, Response, NextFunction } from 'express'
import { playlistService } from './playlist.service'
import { AuthenticatedRequest } from '../auth/auth.middleware'

export class PlaylistController {
  async getAllPlaylists(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const playlists = await playlistService.getAllPlaylists()
      res.status(200).json({ success: true, playlists })
    } catch (error) {
      next(error)
    }
  }

  async getChannelPlaylists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const channelId = String(req.params.channelId || '')
      const playlists = await playlistService.getPlaylistsByChannelId(channelId)
      res.status(200).json({ success: true, playlists })
    } catch (error) {
      next(error)
    }
  }

  async getPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id || '')
      const playlist = await playlistService.getPlaylistById(id)
      if (!playlist) {
        res.status(404).json({ success: false, message: 'Playlist topilmadi' })
        return
      }
      res.status(200).json({ success: true, playlist })
    } catch (error) {
      next(error)
    }
  }

  async createPlaylist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const { title, totalPrice, description, thumbnail } = req.body
      if (!title) {
        res.status(400).json({ success: false, message: 'Playlist nomi kiritilishi shart' })
        return
      }

      const playlist = await playlistService.createPlaylist(userId, {
        title,
        totalPrice,
        description,
        thumbnail,
      })

      res.status(201).json({ success: true, playlist })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async updatePlaylist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      const id = String(req.params.id || '')
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const { title, totalPrice, description } = req.body
      const playlist = await playlistService.updatePlaylist(userId, id, {
        title,
        totalPrice,
        description,
      })

      res.status(200).json({ success: true, playlist })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async deletePlaylist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      const id = String(req.params.id || '')
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      await playlistService.deletePlaylist(userId, id)
      res.status(200).json({ success: true, message: 'Playlist muvaffaqiyatli oʻchirildi' })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async addVideo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      const id = String(req.params.id || '')
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const { title, videoUrl, description, thumbnail, duration, fileSize } = req.body
      if (!title || !videoUrl) {
        res.status(400).json({
          success: false,
          message: 'Video sarlavhasi va video havolasi majburiy',
        })
        return
      }

      const playlist = await playlistService.addVideo(userId, id, {
        title,
        videoUrl,
        description,
        thumbnail,
        duration,
        fileSize: typeof fileSize === 'number' ? fileSize : (fileSize ? parseInt(fileSize, 10) : undefined),
      })

      res.status(201).json({ success: true, playlist })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async updateVideo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      const id = String(req.params.id || '')
      const videoId = String(req.params.videoId || '')
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const { title, description } = req.body
      const playlist = await playlistService.updateVideo(userId, id, videoId, {
        title,
        description,
      })

      res.status(200).json({ success: true, playlist })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async deleteVideo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      const id = String(req.params.id || '')
      const videoId = String(req.params.videoId || '')
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const playlist = await playlistService.deleteVideo(userId, id, videoId)
      res.status(200).json({ success: true, playlist })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async getLessonStream(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {
      const playlistId = String(req.params.playlistId || '')
      const lessonId = String(req.params.lessonId || '')
      const userId = (req as AuthenticatedRequest).user?.userId

      const streamData = await playlistService.getLessonStream(playlistId, lessonId, userId)
      res.status(200).json({ success: true, ...streamData })
    } catch (error: any) {
      const statusCode = error.message?.includes('pullik') ? 403 : 400
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Streamni olishda xatolik yuz berdi',
      })
    }
  }

  async purchase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const playlistId = String(req.params.playlistId || '')
      const { lessonId } = req.body

      const result = await playlistService.purchaseCourseOrLesson(userId, playlistId, lessonId)
      res.status(200).json(result)
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xarid qilishda xatolik yuz berdi' })
    }
  }
}


export const playlistController = new PlaylistController()
