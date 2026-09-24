import { Router } from 'express'
import { playlistController } from './playlist.controller'
import { authenticateJwt, optionalAuthenticateJwt } from '../auth/auth.middleware'

const router = Router()

// Ommaviy yo'llar
router.get('/', (req, res, next) => playlistController.getAllPlaylists(req, res, next))
router.get('/channel/:channelId', (req, res, next) =>
  playlistController.getChannelPlaylists(req, res, next)
)
router.get('/:id', (req, res, next) => playlistController.getPlaylist(req, res, next))

// Xavfsiz DRM Stream manzili (Bepul darslar uchun hamma kira oladi, pullik darslar uchun sotib olingan bo'lishi shart)
router.get('/:playlistId/lessons/:lessonId/stream', optionalAuthenticateJwt, (req, res, next) =>
  playlistController.getLessonStream(req, res, next)
)

// Dars yoki kursni xarid qilish
router.post('/:playlistId/purchase', authenticateJwt, (req, res, next) =>
  playlistController.purchase(req as any, res, next)
)

// Playlist boshqaruvi (Auth talab qilinadi)
router.post('/', authenticateJwt, (req, res, next) =>
  playlistController.createPlaylist(req, res, next)
)
router.put('/:id', authenticateJwt, (req, res, next) =>
  playlistController.updatePlaylist(req, res, next)
)
router.delete('/:id', authenticateJwt, (req, res, next) =>
  playlistController.deletePlaylist(req, res, next)
)

// Video boshqaruvi (Auth talab qilinadi)
router.post('/:id/videos', authenticateJwt, (req, res, next) =>
  playlistController.addVideo(req, res, next)
)
router.put('/:id/videos/:videoId', authenticateJwt, (req, res, next) =>
  playlistController.updateVideo(req, res, next)
)
router.delete('/:id/videos/:videoId', authenticateJwt, (req, res, next) =>
  playlistController.deleteVideo(req, res, next)
)

export const playlistRouter = router

