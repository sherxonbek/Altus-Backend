import { Types } from 'mongoose'
import { Subscription } from '../models/subscription.model'
import { Channel } from '../models/channel.model'

export class SubscriptionService {
  async getUserSubscriptions(userId: string): Promise<any[]> {
    const subs = await Subscription.find({ userId: new Types.ObjectId(userId) })
      .populate('channelId')
      .sort({ createdAt: -1 })

    // Kanal ma'lumotlarini formatlash
    return subs
      .filter((s) => s.channelId)
      .map((s) => {
        const ch = s.channelId as any
        return {
          id: ch._id.toString(),
          name: ch.title,
          username: ch.username.startsWith('@') ? ch.username : `@${ch.username}`,
          avatar: ch.avatar || '',
          verified: false,
          subscribers: `${ch.subscribersCount} obunachi`,
          rating: 5.0,
          courseCount: ch.videosCount || 0,
        }
      })
  }

  async isSubscribed(userId: string, targetChannelIdOrUsername: string): Promise<boolean> {
    const channel = await this.resolveChannel(targetChannelIdOrUsername)
    if (!channel) return false

    const existing = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      channelId: channel._id,
    })
    return !!existing
  }

  async subscribe(userId: string, targetChannelIdOrUsername: string): Promise<void> {
    const channel = await this.resolveChannel(targetChannelIdOrUsername)
    if (!channel) {
      throw new Error('Kanal topilmadi')
    }

    // O'z kanaliga obuna bo'lishni bloklash
    if (channel.userId.toString() === userId) {
      throw new Error("O'z kanalingizga obuna bo'la olmaysiz")
    }

    const existing = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      channelId: channel._id,
    })

    if (!existing) {
      await Subscription.create({
        userId: new Types.ObjectId(userId),
        channelId: channel._id,
      })

      // Kanal obunachilar sonini oshirish
      await Channel.findByIdAndUpdate(channel._id, {
        $inc: { subscribersCount: 1 },
      })
    }
  }

  async unsubscribe(userId: string, targetChannelIdOrUsername: string): Promise<void> {
    const channel = await this.resolveChannel(targetChannelIdOrUsername)
    if (!channel) {
      throw new Error('Kanal topilmadi')
    }

    const deleted = await Subscription.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      channelId: channel._id,
    })

    if (deleted) {
      // Kanal obunachilar sonini kamaytirish (manfiy bo'lmasligi uchun)
      const current = await Channel.findById(channel._id)
      if (current && current.subscribersCount > 0) {
        current.subscribersCount = Math.max(0, current.subscribersCount - 1)
        await current.save()
      }
    }
  }

  private async resolveChannel(idOrUsername: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrUsername)
    if (isObjectId) {
      const channel = await Channel.findById(idOrUsername)
      if (channel) return channel
    }
    const clean = idOrUsername.replace('@', '').toLowerCase()
    return Channel.findOne({ username: clean })
  }
}

export const subscriptionService = new SubscriptionService()
