import jwt from 'jsonwebtoken'
import { config } from '../config/env'

export interface WatermarkInfo {
  text: string
  userId?: string
  phone?: string
}

export interface StreamAuthResult {
  streamUrl: string
  kinescopeId: string | null
  isKinescope: boolean
  drmAuthToken?: string
  watermark: WatermarkInfo
  expiresAt: number
}

/**
 * Matndan Kinescope ID sini ajratib oladi
 */
export const extractKinescopeIdFromUrl = (rawUrl?: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()

  const iframeMatch = trimmed.match(/src=["'](https:\/\/kinescope\.io\/embed\/[^"']+)["']/)
  if (iframeMatch && iframeMatch[1]) {
    return extractKinescopeIdFromUrl(iframeMatch[1])
  }

  const embedMatch = trimmed.match(/kinescope\.io\/embed\/([a-zA-Z0-9_-]+)/i)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  const directMatch = trimmed.match(/kinescope\.io\/([a-zA-Z0-9_-]+)/i)
  if (directMatch && directMatch[1] && directMatch[1] !== 'embed') {
    return directMatch[1]
  }

  const isKinescopeIdPattern = /^[a-zA-Z0-9_-]{18,36}$/.test(trimmed)
  if (isKinescopeIdPattern && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed
  }

  return null
}

/**
 * Foydalanuvchi uchun vaqtinchalik Kinescope DRM token generatsiya qilish
 */
export const generateDrmAuthToken = (payload: {
  userId: string
  videoId: string
  phone?: string
  expiresInSeconds?: number
}): { token: string; expiresAt: number } => {
  const expiresInSeconds = payload.expiresInSeconds || 900 // 15 daqiqa amal qiladi
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds

  const secret = config.jwtAccessSecret || 'c2c_kinescope_drm_secret_key'

  const token = jwt.sign(
    {
      sub: payload.userId,
      vid: payload.videoId,
      phone: payload.phone,
      exp: expiresAt,
      iss: 'c2c-platform',
    },
    secret
  )

  return { token, expiresAt }
}

/**
 * Maxfiy, imzolangan va DRM bilan himoyalangan stream linkini tayyorlash
 */
export const buildSecureStreamData = (
  rawVideoUrl: string,
  user?: { id?: string; phone?: string; fullName?: string }
): StreamAuthResult => {
  const kinescopeId = extractKinescopeIdFromUrl(rawVideoUrl)
  const isKinescope = Boolean(kinescopeId)

  const watermark: WatermarkInfo = {
    text: '',
    userId: user?.id,
    phone: user?.phone,
  }

  if (isKinescope && kinescopeId) {
    const { token, expiresAt } = generateDrmAuthToken({
      userId: user?.id || 'guest',
      videoId: kinescopeId,
      phone: user?.phone,
    })

    // Kinescope embed URL: ?drmauthtoken=... bilan birga (suv belgisiz, toza video)
    const streamUrl = `https://kinescope.io/embed/${kinescopeId}?drmauthtoken=${token}&autoplay=1&dnt=1`

    return {
      streamUrl,
      kinescopeId,
      isKinescope: true,
      drmAuthToken: token,
      watermark,
      expiresAt,
    }
  }

  // Lokal yoki boshqa turdagi video fayl uchun
  return {
    streamUrl: rawVideoUrl,
    kinescopeId: null,
    isKinescope: false,
    watermark,
    expiresAt: Math.floor(Date.now() / 1000) + 900,
  }
}
