import { Types } from 'mongoose'
import { User } from '../models/user.model'
import { Channel } from '../models/channel.model'
import { Playlist } from '../models/playlist.model'
import { Withdrawal } from '../models/withdrawal.model'

export class AdminService {
  async getStats() {
    const totalUsers = await User.countDocuments()
    const totalChannels = await Channel.countDocuments()
    const totalPlaylists = await Playlist.countDocuments()
    const pendingWithdrawalsCount = await Withdrawal.countDocuments({ status: 'pending' })

    const playlists = await Playlist.find().lean()
    const playlistIds = playlists.map((p) => p._id)
    const allLessonIds: string[] = []
    playlists.forEach((p) => {
      (p.videos || []).forEach((v) => {
        if (v.id) allLessonIds.push(String(v.id))
      })
    })

    const [courseAgg, lessonAgg] = await Promise.all([
      playlistIds.length > 0
        ? User.aggregate([
            { $match: { purchasedCourses: { $in: playlistIds } } },
            { $unwind: '$purchasedCourses' },
            { $match: { purchasedCourses: { $in: playlistIds } } },
            { $group: { _id: '$purchasedCourses', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      allLessonIds.length > 0
        ? User.aggregate([
            { $match: { purchasedLessons: { $in: allLessonIds } } },
            { $unwind: '$purchasedLessons' },
            { $match: { purchasedLessons: { $in: allLessonIds } } },
            { $group: { _id: '$purchasedLessons', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ])

    const courseSalesMap = new Map<string, number>()
    for (const item of courseAgg) {
      courseSalesMap.set(String(item._id), item.count)
    }
    const lessonSalesMap = new Map<string, number>()
    for (const item of lessonAgg) {
      lessonSalesMap.set(String(item._id), item.count)
    }

    let totalRevenue = 0
    let creatorsIncome = 0

    for (const p of playlists) {
      const authorPrice = p.authorPrice !== undefined && p.authorPrice !== null ? p.authorPrice : (p.rawPrice || 0)
      const rawPrice = p.rawPrice || 0
      
      const authorPerLesson = (p.videos && p.videos.length > 0 && authorPrice > 0) ? Math.round(authorPrice / p.videos.length) : 0
      const rawPerLesson = (p.videos && p.videos.length > 0 && rawPrice > 0) ? Math.round(rawPrice / p.videos.length) : 0

      const courseSalesCount = courseSalesMap.get(String(p._id)) || 0
      totalRevenue += courseSalesCount * rawPrice
      creatorsIncome += courseSalesCount * authorPrice

      for (const lesson of p.videos || []) {
        const lessonSalesCount = lessonSalesMap.get(String(lesson.id)) || 0
        totalRevenue += lessonSalesCount * rawPerLesson
        creatorsIncome += lessonSalesCount * authorPerLesson
      }
    }

    const platformIncome = totalRevenue - creatorsIncome
    const trades = await this.getTrades()
    const recentSales = trades.slice(0, 10)

    return {
      totalRevenue,
      netProfit: platformIncome,
      platformIncome,
      creatorsIncome,
      totalUsers,
      totalChannels,
      totalPlaylists,
      pendingWithdrawals: pendingWithdrawalsCount,
      pendingWithdrawalsCount,
      recentSales,
    }
  }

  async getWithdrawals(status?: string) {
    const query: any = {}
    if (status) query.status = status
    const list = await Withdrawal.find(query)
      .populate('userId', 'fullName avatar phone')
      .populate('channelId', 'title username avatar balance')
      .sort({ createdAt: -1 })
      .lean()

    return list.map((w: any) => ({
      id: String(w._id),
      _id: String(w._id),
      authorId: String(w.userId?._id || w.userId || ''),
      authorName: w.userId?.fullName || 'Noma\'lum muallif',
      authorPhone: w.userId?.phone || '',
      authorAvatar: w.userId?.avatar || '',
      channelId: String(w.channelId?._id || w.channelId || ''),
      channelName: w.channelId?.title || w.channelId?.username || 'Kanal',
      cardNumber: w.cardNumber || '',
      amount: w.amount || 0,
      status: w.status || 'pending',
      createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString(),
    }))
  }

  async getTrades() {
    const usersWithPurchases = await User.find({
      'purchasedCourses.0': { $exists: true },
    })
      .populate('purchasedCourses', 'title rawPrice price authorPrice')
      .sort({ updatedAt: -1 })
      .lean()

    const trades: any[] = []
    for (const u of usersWithPurchases) {
      for (const course of (u.purchasedCourses || []) as any[]) {
        if (course && course.title) {
          trades.push({
            id: `${u._id}-${course._id}`,
            buyerId: String(u._id),
            buyerName: u.fullName || u.phone,
            courseName: course.title,
            price: course.rawPrice || 0,
            createdAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
          })
        }
      }
    }
    return trades
  }

  async approveWithdrawal(id: string) {
    const withdrawal = await Withdrawal.findById(id)
    if (!withdrawal) throw new Error("So'rov topilmadi")
    if (withdrawal.status !== 'pending') throw new Error("Faqat kutilayotgan so'rovlarni tasdiqlash mumkin")
    
    withdrawal.status = 'approved'
    withdrawal.processedAt = new Date()
    await withdrawal.save()
    return withdrawal
  }

  async rejectWithdrawal(id: string, reason: string) {
    const withdrawal = await Withdrawal.findById(id)
    if (!withdrawal) throw new Error("So'rov topilmadi")
    if (withdrawal.status !== 'pending') throw new Error("Faqat kutilayotgan so'rovlarni bekor qilish mumkin")
    
    withdrawal.status = 'rejected'
    withdrawal.rejectionReason = reason
    withdrawal.processedAt = new Date()
    await withdrawal.save()

    const channel = await Channel.findById(withdrawal.channelId)
    if (channel) {
      channel.balance = (channel.balance || 0) + withdrawal.amount
      await channel.save()
    }
    
    return withdrawal
  }

  async getChannels() {
    const channels = await Channel.find()
      .populate('userId', 'fullName phone avatar coins createdAt')
      .sort({ createdAt: -1 })
      .lean()

    const channelIds = channels.map((c) => c._id)
    const playlists = await Playlist.find({ channelId: { $in: channelIds } }).lean()

    const playlistMap = new Map<string, any[]>()
    for (const p of playlists) {
      const chId = String(p.channelId)
      if (!playlistMap.has(chId)) playlistMap.set(chId, [])
      playlistMap.get(chId)!.push(p)
    }

    return channels.map((ch: any) => {
      const chPlaylists = playlistMap.get(String(ch._id)) || []
      
      let totalVideos = 0
      for (const p of chPlaylists) {
        totalVideos += (p.videos || []).length
      }
      if (totalVideos === 0 && ch.videosCount) {
        totalVideos = ch.videosCount
      }

      const subscribers = ch.subscribersCount || 0
      const totalViews = Math.max(subscribers * 7 + totalVideos * 35, totalVideos * 15)

      return {
        id: String(ch._id),
        _id: String(ch._id),
        title: ch.title,
        username: ch.username,
        avatar: ch.avatar || '',
        banner: ch.banner || '',
        description: ch.description || '',
        subscribersCount: subscribers,
        videosCount: totalVideos,
        playlistsCount: chPlaylists.length,
        totalViews,
        balance: ch.balance || 0,
        createdAt: ch.createdAt ? new Date(ch.createdAt).toISOString() : new Date().toISOString(),
        owner: {
          id: String(ch.userId?._id || ch.userId || ''),
          fullName: ch.userId?.fullName || 'Noma\'lum',
          phone: ch.userId?.phone || '',
          avatar: ch.userId?.avatar || '',
          coins: ch.userId?.coins || 0,
          createdAt: ch.userId?.createdAt ? new Date(ch.userId.createdAt).toISOString() : '',
        },
        playlists: chPlaylists.map((p: any) => ({
          id: String(p._id),
          title: p.title,
          thumbnail: p.thumbnail || '',
          rawPrice: p.rawPrice || 0,
          price: p.price || 'Bepul',
          rating: p.rating || 5.0,
          videosCount: (p.videos || []).length,
          createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
        })),
      }
    })
  }

  async getUsers() {
    const users = await User.find()
      .select('fullName phone role coins createdAt')
      .sort({ createdAt: -1 })
      .lean()

    return users.map((u: any) => ({
      id: String(u._id),
      _id: String(u._id),
      fullName: u.fullName,
      phone: u.phone,
      role: u.role || 'user',
      coins: u.coins || 0,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    }))
  }
}

export const adminService = new AdminService()
