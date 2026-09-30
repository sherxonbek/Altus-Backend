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
    const recentSales: any[] = []

    return {
      totalRevenue,
      platformIncome,
      creatorsIncome,
      totalUsers,
      totalChannels,
      totalPlaylists,
      pendingWithdrawalsCount,
      recentSales,
    }
  }

  async getWithdrawals(status?: string) {
    const query: any = {}
    if (status) query.status = status
    return Withdrawal.find(query).populate('userId', 'fullName avatar phone').populate('channelId', 'title username avatar balance').sort({ createdAt: -1 })
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
}

export const adminService = new AdminService()
