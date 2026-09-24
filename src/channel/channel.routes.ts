import { Router } from 'express'
import { channelController } from './channel.controller'
import { authenticateJwt } from '../auth/auth.middleware'

const router = Router()

// Ommaviy yo'llar
router.get('/', (req, res, next) => channelController.getAllChannels(req, res, next))
router.get('/check-username/:username', (req, res, next) =>
  channelController.checkUsername(req, res, next)
)

// Shaxsiy kanal (Auth talab qilinadi)
router.get('/me', authenticateJwt, (req, res, next) =>
  channelController.getMyChannel(req, res, next)
)
router.post('/', authenticateJwt, (req, res, next) =>
  channelController.saveChannel(req, res, next)
)

// ID yoki username bo'yicha kanal olish
router.get('/:id', (req, res, next) => channelController.getChannel(req, res, next))

export const channelRouter = router
