import { Router } from 'express'
import { subscriptionController } from './subscription.controller'
import { authenticateJwt } from '../auth/auth.middleware'

const router = Router()

// Barcha obunalar bilan bog'liq harakatlar tizimga kirishni talab qiladi
router.get('/', authenticateJwt, (req, res, next) =>
  subscriptionController.getMySubscriptions(req, res, next)
)

router.get('/check/:channelId', authenticateJwt, (req, res, next) =>
  subscriptionController.checkStatus(req, res, next)
)

router.post('/:channelId', authenticateJwt, (req, res, next) =>
  subscriptionController.subscribe(req, res, next)
)

router.delete('/:channelId', authenticateJwt, (req, res, next) =>
  subscriptionController.unsubscribe(req, res, next)
)

export const subscriptionRouter = router
