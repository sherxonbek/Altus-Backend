import { Router } from 'express'
import { channelController } from './channel.controller'
import { authenticateJwt } from '../auth/auth.middleware'
import { cacheService } from '../cache/cache.service'

const router = Router()

// Ommaviy yo'llar (Kesh bilan tezlashtirilgan)
router.get('/', cacheService.middleware(60, 'channels'), (req, res, next) =>
  channelController.getAllChannels(req, res, next)
)
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

// Billing
router.get('/:id/billing', authenticateJwt, (req, res, next) => channelController.getBilling(req, res, next))
router.post('/billing/withdraw', authenticateJwt, (req, res, next) => channelController.withdraw(req, res, next))

// ID yoki username bo'yicha kanal olish (Kesh bilan tezlashtirilgan)
router.get('/:id', cacheService.middleware(60, 'channels'), (req, res, next) =>
  channelController.getChannel(req, res, next)
)

export const channelRouter = router
