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
}

export const channelController = new ChannelController()
