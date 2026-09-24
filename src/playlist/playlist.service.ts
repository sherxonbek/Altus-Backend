import fs from 'fs'
import path from 'path'
import { Types } from 'mongoose'
import { Playlist, IPlaylist, ILesson } from '../models/playlist.model'
import { Channel } from '../models/channel.model'
import { User } from '../models/user.model'
import { kinescopeService } from '../kinescope/kinescope.service'
import {
  extractKinescopeIdFromUrl,
  buildSecureStreamData,
  StreamAuthResult,
} from '../kinescope/kinescope.auth'

export const formatDurationFromSeconds = (seconds?: number): string => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00'
  const totalSec = Math.floor(seconds)
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (hours > 0) {
    return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export const formatPrice = (amount?: number): string => {
  if (!amount || amount <= 0) return "0 so'm"
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm"
}

/**
 * Davomiylik satridan (masalan "9:26" yoki "1:15:30") daqiqalarni ajratib olish
 */
export const parseDurationToMinutes = (duration?: string): number => {
  if (!duration || typeof duration !== 'string') return 10
  const parts = duration.trim().split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => isNaN(p))) return 10
  if (parts.length === 3) {
    const totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2]
    return Math.max(1, Math.ceil(totalSec / 60))
  }
  if (parts.length === 2) {
    const totalSec = parts[0] * 60 + parts[1]
    return Math.max(1, Math.ceil(totalSec / 60))
  }
  return 10
}

/**
 * Baytlardan MB ga o'tkazish
 */
export const parseFileSizeToMB = (fileSize?: number, durationMinutes: number = 10): number => {
  if (fileSize && typeof fileSize === 'number' && fileSize > 0) {
    return Math.max(1, Math.ceil(fileSize / (1024 * 1024)))
  }
  // Agar fayl hajmi aniq berilmagan bo'lsa, o'rtacha 720p sifat uchun daqiqasiga ~3 MB hisoblanadi
  return Math.max(5, durationMinutes * 3)
}

/**
 * Server infratuzilma xarajatlari (saqlash, transkodlash, CDN trafik) va
 * platforma foydasiga asoslangan dinamik minimal narxni hisoblash (2-usul)
 */
export const calculateDynamicVideoCost = (durationMinutes: number, sizeMB: number): number => {
  // Daqiqasiga server xarajati (transkodlash + ko'rish): 70 so'm / min
  const durationCost = durationMinutes * 70
  // MB bo'yicha server xarajati (saqlash + CDN trafik): 10 so'm / MB
  const sizeCost = sizeMB * 10
  // Platforma bazaviy xizmat va komissiya foydasi: +500 so'm
  const baseMargin = 500

  const rawTotal = durationCost + sizeCost + baseMargin
  // Minimal narx chegarasi (eng kamida 1 500 so'm) va 100 so'mga yaxlitlash
  return Math.max(1500, Math.ceil(rawTotal / 100) * 100)
}

export const recalculatePlaylistPrices = (playlist: IPlaylist) => {
  const count = playlist.videos.length
  if (count === 0) {
    playlist.price = "0 so'm"
    return
  }

  // Muallif kiritgan sof narx (authorPrice bo'lsa o'shani, aks holda dastlabki qiymatni olamiz)
  const authorTotal = playlist.authorPrice !== undefined ? playlist.authorPrice : (playlist.rawPrice || 0)
  playlist.authorPrice = authorTotal

  const authorPerLesson = count > 0 && authorTotal > 0 ? Math.round(authorTotal / count) : 0

  let totalCalculated = 0

  playlist.videos.forEach((video) => {
    const mins = parseDurationToMinutes(video.duration)
    const mb = parseFileSizeToMB(video.fileSize, mins)
    const serverCost = calculateDynamicVideoCost(mins, mb)

    // MUALLIF NARXI USTIGA SERVER XARAJATLARI VA MARJASI QO'SHILADI:
    // Masalan: muallif 10 000 so'm qo'ysa + 1 500 so'm server xarajati = 11 500 so'm!
    // Agar muallif 0 so'm qo'ysa + 1 500 so'm server xarajati = 1 500 so'm!
    const finalLessonPrice = authorPerLesson + serverCost
    video.rawPrice = finalLessonPrice
    video.price = formatPrice(finalLessonPrice)
    video.isFree = false // Server xarajati sababli darslar mutlaqo bepul bo'lmaydi

    totalCalculated += finalLessonPrice
  })

  // Playlist yakuniy narxi: muallif narxi + barcha darslarning server xarajatlari yig'indisi
  playlist.rawPrice = totalCalculated
  playlist.price = formatPrice(totalCalculated)
}

export class PlaylistService {
  private async syncPlaylistVideoDurations(playlist: IPlaylist): Promise<boolean> {
    if (!kinescopeService.isConfigured()) return false
    let hasChanges = false
    for (const video of playlist.videos) {
      if (
        (!video.duration || video.duration === '10:00' || video.duration === '00:00' || !video.fileSize) &&
        (video.kinescopeId || extractKinescopeIdFromUrl(video.videoUrl))
      ) {
        const kId = video.kinescopeId || extractKinescopeIdFromUrl(video.videoUrl)
        if (!kId) continue
        try {
          const kVideo = await kinescopeService.getVideo(kId)
          if (kVideo?.duration && typeof kVideo.duration === 'number' && kVideo.duration > 0) {
            video.duration = formatDurationFromSeconds(kVideo.duration)
            if (!video.kinescopeId) video.kinescopeId = kId
            hasChanges = true
          }
          if (kVideo?.assets && Array.isArray(kVideo.assets) && (!video.fileSize || video.fileSize === 0)) {
            const totalAssetsSize = kVideo.assets.reduce(
              (sum: number, a: any) => sum + (a.file_size || 0),
              0
            )
            if (totalAssetsSize > 0) {
              video.fileSize = totalAssetsSize
              hasChanges = true
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (hasChanges || playlist.videos.some((v) => v.isFree)) {
      recalculatePlaylistPrices(playlist)
      await playlist.save()
      return true
    }
    return false
  }

  async getAllPlaylists(): Promise<IPlaylist[]> {
    return Playlist.find().populate('channelId').sort({ createdAt: -1 })
  }

  async getPlaylistsByChannelId(idOrUsername: string): Promise<IPlaylist[]> {
    let channelId: any = null
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrUsername)

    if (isObjectId) {
      channelId = new Types.ObjectId(idOrUsername)
    } else {
      const clean = idOrUsername.replace('@', '').toLowerCase()
      const channel = await Channel.findOne({ username: clean })
      if (!channel) return []
      channelId = channel._id
    }

    const playlists = await Playlist.find({ channelId }).populate('channelId').sort({ createdAt: -1 })
    for (const p of playlists) {
      await this.syncPlaylistVideoDurations(p)
    }
    return playlists
  }

  async getPlaylistById(playlistId: string): Promise<IPlaylist | null> {
    const playlist = await Playlist.findById(playlistId).populate('channelId')
    if (playlist) {
      await this.syncPlaylistVideoDurations(playlist)
    }
    return playlist
  }

  async createPlaylist(
    userId: string,
    data: {
      title: string
      totalPrice?: number
      description?: string
      thumbnail?: string
    }
  ): Promise<IPlaylist> {
    const channel = await Channel.findOne({ userId: new Types.ObjectId(userId) })
    if (!channel) {
      throw new Error("Kanal topilmadi. Avval kanal ochishingiz kerak.")
    }

    const authorPrice = data.totalPrice ? Math.max(0, data.totalPrice) : 0

    const playlist = new Playlist({
      channelId: channel._id,
      userId: new Types.ObjectId(userId),
      title: data.title.trim(),
      authorPrice,
      rawPrice: authorPrice,
      price: formatPrice(authorPrice),
      description: data.description?.trim(),
      thumbnail:
        data.thumbnail?.trim() ||
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      videos: [],
    })

    await playlist.save()
    return playlist
  }

  async updatePlaylist(
    userId: string,
    playlistId: string,
    data: {
      title?: string
      totalPrice?: number
      description?: string
    }
  ): Promise<IPlaylist> {
    const playlist = await Playlist.findOne({
      _id: new Types.ObjectId(playlistId),
      userId: new Types.ObjectId(userId),
    })

    if (!playlist) {
      throw new Error("Playlist topilmadi yoki sizda ruxsat yo'q")
    }

    if (data.title !== undefined) {
      playlist.title = data.title.trim()
    }
    if (data.totalPrice !== undefined) {
      playlist.authorPrice = Math.max(0, data.totalPrice)
    }
    if (data.description !== undefined) {
      playlist.description = data.description.trim()
    }

    recalculatePlaylistPrices(playlist)
    await playlist.save()
    return playlist
  }

  async deletePlaylist(userId: string, playlistId: string): Promise<void> {
    const playlist = await Playlist.findOne({
      _id: new Types.ObjectId(playlistId),
      userId: new Types.ObjectId(userId),
    })

    if (!playlist) {
      throw new Error("Playlist topilmadi yoki sizda ruxsat yo'q")
    }

    // 1. Playlist ichidagi barcha videolarni Kinescope dan va diskdan o'chirish
    if (playlist.videos && playlist.videos.length > 0) {
      for (const video of playlist.videos) {
        // Kinescope dan o'chirish
        const kinescopeId = video.kinescopeId || extractKinescopeIdFromUrl(video.videoUrl)
        if (kinescopeId) {
          try {
            await kinescopeService.deleteVideo(kinescopeId)
          } catch {
            // ignore
          }
        }

        // Lokal fayl bo'lsa diskdan o'chirish
        if (video.videoUrl && video.videoUrl.includes('/uploads/videos/')) {
          try {
            const filename = path.basename(video.videoUrl)
            const filePath = path.resolve(process.cwd(), 'uploads', 'videos', filename)
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
              console.log(`[Local Disk] Video fayli o'chirildi: ${filePath}`)
            }
          } catch (e: any) {
            console.error('[Local Disk] Faylni o\'chirishda xatolik:', e.message)
          }
        }
      }
    }

    // 2. Playlist muqova rasmi (agar lokal uploads papkasida bo'lsa)
    if (playlist.thumbnail && playlist.thumbnail.includes('/uploads/thumbnails/')) {
      try {
        const thumbName = path.basename(playlist.thumbnail)
        const thumbPath = path.resolve(process.cwd(), 'uploads', 'thumbnails', thumbName)
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath)
        }
      } catch {
        // ignore
      }
    }

    await Playlist.deleteOne({ _id: playlist._id })

    // Kanalning videolar sonini yangilash
    await this.syncChannelVideosCount(playlist.channelId.toString())
  }

  async addVideo(
    userId: string,
    playlistId: string,
    videoData: {
      title: string
      videoUrl: string
      description?: string
      thumbnail?: string
      duration?: string
      fileSize?: number
    }
  ): Promise<IPlaylist> {
    const playlist = await Playlist.findOne({
      _id: new Types.ObjectId(playlistId),
      userId: new Types.ObjectId(userId),
    })

    if (!playlist) {
      throw new Error("Playlist topilmadi yoki sizda ruxsat yo'q")
    }

    const kinescopeId = extractKinescopeIdFromUrl(videoData.videoUrl) || undefined

    let initialDuration = videoData.duration?.trim()
    let initialFileSize = videoData.fileSize
    if (kinescopeId && kinescopeService.isConfigured()) {
      try {
        const kVideo = await kinescopeService.getVideo(kinescopeId)
        if ((!initialDuration || initialDuration === '10:00' || initialDuration === '00:00') && kVideo?.duration && typeof kVideo.duration === 'number' && kVideo.duration > 0) {
          initialDuration = formatDurationFromSeconds(kVideo.duration)
        }
        if ((!initialFileSize || initialFileSize <= 0) && kVideo?.assets && Array.isArray(kVideo.assets)) {
          initialFileSize = kVideo.assets.reduce((sum: number, a: any) => sum + (a.file_size || 0), 0)
        }
      } catch {
        // ignore
      }
    }

    const newLesson: ILesson = {
      id: `lesson-${Date.now()}`,
      title: videoData.title.trim(),
      videoUrl: videoData.videoUrl.trim(),
      kinescopeId,
      description: videoData.description?.trim(),
      thumbnail: videoData.thumbnail?.trim(),
      duration: initialDuration || '00:00',
      fileSize: initialFileSize || 0,
      price: "1 500 so'm",
      isFree: false,
      createdAt: new Date(),
    }


    playlist.videos.push(newLesson)

    // Agar playlistda muqova rasmi default bo'lsa va yangi videoning muqovasi bo'lsa, yangilash
    if (videoData.thumbnail && (!playlist.thumbnail || playlist.thumbnail.includes('unsplash'))) {
      playlist.thumbnail = videoData.thumbnail
    }

    recalculatePlaylistPrices(playlist)
    await playlist.save()

    // Kanalning videolar sonini yangilash
    await this.syncChannelVideosCount(playlist.channelId.toString())

    return playlist
  }

  async updateVideo(
    userId: string,
    playlistId: string,
    videoId: string,
    data: {
      title?: string
      description?: string
    }
  ): Promise<IPlaylist> {
    const playlist = await Playlist.findOne({
      _id: new Types.ObjectId(playlistId),
      userId: new Types.ObjectId(userId),
    })

    if (!playlist) {
      throw new Error("Playlist topilmadi yoki sizda ruxsat yo'q")
    }

    const video = playlist.videos.find((v) => String(v.id) === String(videoId))
    if (!video) {
      throw new Error("Video topilmadi")
    }

    if (data.title !== undefined) video.title = data.title.trim()
    if (data.description !== undefined) video.description = data.description.trim()

    await playlist.save()
    return playlist
  }

  async deleteVideo(userId: string, playlistId: string, videoId: string): Promise<IPlaylist> {
    const playlist = await Playlist.findOne({
      _id: new Types.ObjectId(playlistId),
      userId: new Types.ObjectId(userId),
    })

    if (!playlist) {
      throw new Error("Playlist topilmadi yoki sizda ruxsat yo'q")
    }

    const videoToDelete = playlist.videos.find((v) => String(v.id) === String(videoId))
    if (videoToDelete) {
      // 1. Kinescope dan videoni o'chirish
      const kinescopeId =
        videoToDelete.kinescopeId || extractKinescopeIdFromUrl(videoToDelete.videoUrl)
      if (kinescopeId) {
        try {
          await kinescopeService.deleteVideo(kinescopeId)
        } catch {
          // ignore
        }
      }

      // 2. Agar lokal fayl bo'lsa diskdan o'chirish
      if (videoToDelete.videoUrl && videoToDelete.videoUrl.includes('/uploads/videos/')) {
        try {
          const filename = path.basename(videoToDelete.videoUrl)
          const filePath = path.resolve(process.cwd(), 'uploads', 'videos', filename)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`[Local Disk] Video fayli diskdan o'chirildi: ${filePath}`)
          }
        } catch (e: any) {
          console.error('[Local Disk] Faylni o\'chirishda xatolik:', e.message)
        }
      }
    }

    playlist.videos = playlist.videos.filter((v) => String(v.id) !== String(videoId))
    recalculatePlaylistPrices(playlist)
    await playlist.save()

    // Kanalning videolar sonini yangilash
    await this.syncChannelVideosCount(playlist.channelId.toString())

    return playlist
  }

  async getLessonStream(
    playlistId: string,
    lessonId: string,
    userId?: string
  ): Promise<StreamAuthResult> {
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
      throw new Error('Playlist topilmadi')
    }

    const lesson = playlist.videos.find((v) => String(v.id) === String(lessonId))
    if (!lesson) {
      throw new Error('Dars topilmadi')
    }

    let userDoc = null
    let isOwner = false
    let hasPurchased = false

    if (userId) {
      userDoc = await User.findById(userId)
      if (userDoc) {
        isOwner = playlist.userId.toString() === userId
        hasPurchased =
          (userDoc.purchasedCourses || []).some((id) => id.toString() === playlistId) ||
          (userDoc.purchasedLessons || []).includes(String(lessonId))
      }
    }

    // Dars bepulmi, yoki muallifmi, yoki sotib olganmi?
    const hasAccess = lesson.isFree || isOwner || hasPurchased

    if (!hasAccess) {
      throw new Error('Ushbu dars pullik. Darsni ko‘rish uchun avval uni xarid qiling.')
    }

    const userData = userDoc
      ? { id: userDoc._id.toString(), phone: userDoc.phone, fullName: userDoc.fullName }
      : undefined

    return buildSecureStreamData(lesson.videoUrl, userData)
  }

  async purchaseCourseOrLesson(
    userId: string,
    playlistId: string,
    lessonId?: string
  ) {
    const user = await User.findById(userId)
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi')
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
      throw new Error('Playlist topilmadi')
    }

    if (!user.purchasedLessons) user.purchasedLessons = []
    if (!user.purchasedCourses) user.purchasedCourses = []

    if (lessonId) {
      if (!user.purchasedLessons.includes(String(lessonId))) {
        user.purchasedLessons.push(String(lessonId))
      }
    } else {
      const pId = new Types.ObjectId(playlistId)
      if (!user.purchasedCourses.some((id) => id.toString() === playlistId)) {
        user.purchasedCourses.push(pId)
      }
    }

    await user.save()
    return {
      success: true,
      message: lessonId
        ? 'Dars muvaffaqiyatli xarid qilindi'
        : 'To‘liq kurs muvaffaqiyatli xarid qilindi',
      purchasedCourses: user.purchasedCourses,
      purchasedLessons: user.purchasedLessons,
    }
  }

  private async syncChannelVideosCount(channelId: string) {
    try {
      const playlists = await Playlist.find({ channelId: new Types.ObjectId(channelId) })
      const total = playlists.reduce((acc, p) => acc + p.videos.length, 0)
      await Channel.findByIdAndUpdate(channelId, { videosCount: total })
    } catch {
      // ignore
    }
  }
}


export const playlistService = new PlaylistService()
