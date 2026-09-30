import { Request, Response, NextFunction } from 'express'
import { channelService } from './channel.service'
import { AuthenticatedRequest } from '../auth/auth.middleware'

export class ChannelController {
  async getMyChannel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const channel = await channelService.getChannelByUserId(userId)
      if (!channel) {
        res.status(200).json({ success: true, channel: null })
        return
      }
      const channelData = channel.toObject ? channel.toObject() : channel
      channelData.id = channel._id.toString()
      res.status(200).json({ success: true, channel: channelData })
    } catch (error) {
      next(error)
    }
  }

  async checkUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = String(req.params.username || '')
      const excludeChannelId = req.query.excludeId ? String(req.query.excludeId) : undefined

      if (!username) {
        res.status(400).json({ success: false, message: 'Username kiritilishi shart' })
        return
      }

      const isAvailable = await channelService.checkUsernameAvailable(username, excludeChannelId)
      res.status(200).json({ success: true, available: isAvailable })
    } catch (error) {
      next(error)
    }
  }

  async saveChannel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const { title, username, avatar, banner, description } = req.body

      if (!title || !username) {
        res.status(400).json({
          success: false,
          message: 'Kanal nomi (title) va username kiritilishi majburiy',
        })
        return
      }

      const channel = await channelService.saveChannel(userId, {
        title,
        username,
        avatar,
        banner,
        description,
      })

      const channelData = channel.toObject ? channel.toObject() : channel
      channelData.id = channel._id.toString()
      res.status(200).json({ success: true, channel: channelData })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik yuz berdi' })
    }
  }

  async getChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id || '')
      const channel = await channelService.getChannelById(id)
      if (!channel) {
        res.status(404).json({ success: false, message: 'Kanal topilmadi' })
        return
      }
      const channelData = channel.toObject ? channel.toObject() : channel
      channelData.id = channel._id.toString()
      res.status(200).json({ success: true, channel: channelData })
    } catch (error) {
      next(error)
    }
  }

  async getAllChannels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const channels = await channelService.getAllChannels()
      const formatted = channels.map((c: any) => {
        const obj = c.toObject ? c.toObject() : c
        obj.id = c._id.toString()
        return obj
      })
      res.status(200).json({ success: true, channels: formatted })
    } catch (error) {
      next(error)
    }
  }
  async getBilling(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }
      
      let channelId = req.params.id
      if (channelId === 'my-channel') {
        const myChannel = await channelService.getChannelByUserId(userId)
        if (!myChannel) {
          res.status(404).json({ success: false, message: 'Kanal topilmadi' })
          return
        }
        channelId = myChannel._id.toString()
      } else {
        // Verify channel ownership if needed
        const myChannel = await channelService.getChannelByUserId(userId)
        if (!myChannel || myChannel._id.toString() !== channelId) {
          res.status(403).json({ success: false, message: 'Ruxsat etilmagan' })
          return
        }
      }

      const stats = await channelService.getBillingStats(channelId)
      res.status(200).json({ success: true, data: stats })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik' })
    }
  }

  async withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Avtorizatsiyadan oʻtilmagan' })
        return
      }

      const { amount, cardNumber } = req.body
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ success: false, message: 'Yechib olinadigan summa 0 dan katta bo\'lishi kerak' })
        return
      }

      if (!cardNumber || typeof cardNumber !== 'string') {
        res.status(400).json({ success: false, message: 'Miqdor va karta raqami kiritilishi shart' })
        return
      }

      const cleanCard = cardNumber.replace(/\s+/g, '')
      if (!/^\d{16}$/.test(cleanCard)) {
        res.status(400).json({ success: false, message: 'Karta raqami noto\'g\'ri' })
        return
      }

      const myChannel = await channelService.getChannelByUserId(userId)
      if (!myChannel) {
        res.status(404).json({ success: false, message: 'Kanal topilmadi' })
        return
      }

      if (amount > (myChannel.balance || 0)) {
        res.status(400).json({ success: false, message: 'Balansda yetarli mablag\' yo\'q' })
        return
      }

      const result = await channelService.processWithdrawal(myChannel._id.toString(), amount, cleanCard)
      res.status(200).json(result)
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Xatolik' })
    }
  }
}

export const channelController = new ChannelController()
