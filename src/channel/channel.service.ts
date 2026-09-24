import { Types } from 'mongoose'
import { Channel, IChannel } from '../models/channel.model'

export class ChannelService {
  async getChannelByUserId(userId: string): Promise<IChannel | null> {
    try {
      return await Channel.findOne({ userId: new Types.ObjectId(userId) })
    } catch {
      return null
    }
  }


  async getChannelById(idOrUsername: string): Promise<IChannel | null> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrUsername)
    if (isObjectId) {
      const channel = await Channel.findById(idOrUsername)
      if (channel) return channel
    }
    const clean = idOrUsername.replace('@', '').toLowerCase()
    return Channel.findOne({ username: clean })
  }

  async checkUsernameAvailable(username: string, excludeChannelId?: string): Promise<boolean> {
    const clean = username.trim().replace('@', '').toLowerCase()
    const query: any = { username: clean }
    if (excludeChannelId) {
      query._id = { $ne: excludeChannelId }
    }
    const existing = await Channel.findOne(query)
    return !existing
  }

  async saveChannel(
    userId: string,
    data: {
      title: string
      username: string
      avatar?: string
      banner?: string
      description?: string
    }
  ): Promise<IChannel> {
    const cleanUsername = data.username.trim().replace('@', '').toLowerCase()

    // 1. Foydalanuvchining mavjud kanali bor-yo'qligini tekshirish
    const userObjId = new Types.ObjectId(userId)
    let channel = await Channel.findOne({ userId: userObjId })

    // 2. Username band emasligini tekshirish
    const isAvail = await this.checkUsernameAvailable(cleanUsername, channel?._id?.toString())
    if (!isAvail) {
      throw new Error(`"${cleanUsername}" username allaqachon band qilingan.`)
    }

    if (channel) {
      channel.title = data.title.trim()
      channel.username = cleanUsername
      if (data.avatar !== undefined) channel.avatar = data.avatar.trim()
      if (data.banner !== undefined) channel.banner = data.banner.trim()
      if (data.description !== undefined) channel.description = data.description.trim()
      await channel.save()
      return channel
    } else {
      channel = await Channel.create({
        userId: userObjId,
        title: data.title.trim(),
        username: cleanUsername,

        avatar: data.avatar?.trim(),
        banner: data.banner?.trim(),
        description: data.description?.trim(),
      })
      return channel
    }
  }

  async getAllChannels(): Promise<IChannel[]> {
    return Channel.find().sort({ subscribersCount: -1 }).limit(50)
  }
}

export const channelService = new ChannelService()
