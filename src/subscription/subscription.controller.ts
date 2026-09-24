import { Response, NextFunction } from 'express'
import { subscriptionService } from './subscription.service'
import { AuthenticatedRequest } from '../auth/auth.middleware'

export class SubscriptionController {
  async getMySubscriptions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const subscriptions = await subscriptionService.getUserSubscriptions(userId)
      res.status(200).json({ success: true, subscriptions })
    } catch (error) {
      next(error)
    }
  }

  async checkStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId
      const channelId = String(req.params.channelId || '')

      if (!userId) {
        res.status(200).json({ success: true, isSubscribed: false })
        return
      }

      const isSubscribed = await subscriptionService.isSubscribed(userId, channelId)
      res.status(200).json({ success: true, isSubscribed })
    } catch (error) {
      next(error)
    }
  }

  async subscribe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId
      const channelId = String(req.params.channelId || '')

      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      await subscriptionService.subscribe(userId, channelId)
      res.status(200).json({ success: true, message: 'Kanalga obuna boʻlindi' })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async unsubscribe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId
      const channelId = String(req.params.channelId || '')

      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      await subscriptionService.unsubscribe(userId, channelId)
      res.status(200).json({ success: true, message: 'Obuna bekor qilindi' })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }
}

export const subscriptionController = new SubscriptionController()
