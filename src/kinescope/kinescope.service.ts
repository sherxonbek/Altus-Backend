import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { Transform } from 'stream'
import { config } from '../config/env'

export interface KinescopeUploadResult {
  id: string
  title: string
  status: string
  play_link: string
  embed_link: string
  hls_link?: string
  created_at?: string
  poster?: string
}

export class KinescopeService {
  private readonly uploaderUrl = 'https://uploader.kinescope.io/v2/video'
  private readonly apiUrl = 'https://api.kinescope.io/v1'

  /**
   * Kinescope API kaliti mavjudligini tekshirish
   */
  isConfigured(): boolean {
    return Boolean(config.kinescopeApiKey && config.kinescopeApiKey.trim().length > 0)
  }

  /**
   * Loyihada DRM shifrlash (FairPlay / Widevine / PlayReady) faollashtirilganini tekshirish va yoqish
   */
  async ensureProjectDrmEnabled(projectId?: string): Promise<boolean> {
    if (!this.isConfigured()) return false
    const targetId = projectId || config.kinescopeProjectId
    if (!targetId) return false

    try {
      const response = await axios.get(`${this.apiUrl}/projects/${targetId}`, {
        headers: { Authorization: `Bearer ${config.kinescopeApiKey}` },
      })
      const project = response.data?.data
      if (project && !project.encrypted) {
        await axios.put(
          `${this.apiUrl}/projects/${targetId}`,
          {
            name: project.name || 'My project',
            privacy_type: project.privacy_type || 'anywhere',
            encrypted: true,
          },
          {
            headers: {
              Authorization: `Bearer ${config.kinescopeApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Videoni Kinescope uploader v2 ga yuklash (oqimli progress bilan)
   */
  async uploadVideo(
    filePath: string,
    title?: string,
    description?: string,
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<KinescopeUploadResult> {
    if (!this.isConfigured()) {
      throw new Error('Kinescope API kaliti sozlanmagan')
    }

    // DRM shifrlash doimo yoqiq bo'lishini ta'minlash
    if (config.kinescopeProjectId) {
      await this.ensureProjectDrmEnabled(config.kinescopeProjectId).catch(() => {})
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Fayl topilmadi: ${filePath}`)
    }

    const videoTitle = title?.trim() || path.basename(filePath, path.extname(filePath))
    // HTTP sarlavhalari xavfsiz bo'lishi uchun ASCII ga keltiramiz yoki encode qilamiz
    const safeTitleHeader = encodeURIComponent(videoTitle)

    const fileStat = fs.statSync(filePath)
    const totalSize = fileStat.size
    let loadedBytes = 0

    const progressStream = new Transform({
      transform(chunk, encoding, callback) {
        loadedBytes += chunk.length
        if (onProgress && totalSize > 0) {
          const pct = Math.min(100, Math.round((loadedBytes * 100) / totalSize))
          onProgress(pct, loadedBytes, totalSize)
        }
        callback(null, chunk)
      },
    })

    const fileStream = fs.createReadStream(filePath).pipe(progressStream)

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.kinescopeApiKey}`,
      'X-Video-Title': safeTitleHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(totalSize),
    }

    if (config.kinescopeProjectId) {
      headers['X-Parent-ID'] = config.kinescopeProjectId
    }

    if (description?.trim()) {
      headers['X-Video-Description'] = encodeURIComponent(description.trim())
    }

    const response = await axios.post(this.uploaderUrl, fileStream, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    const data = response.data?.data
    if (!data || !data.id) {
      throw new Error("Serverdan'dan kutilmagan javob qaytdi")
    }

    return {
      id: data.id,
      title: data.title || videoTitle,
      status: data.status || 'processing',
      play_link: data.play_link || `https://kinescope.io/${data.id}`,
      embed_link: data.embed_link || `https://kinescope.io/embed/${data.id}`,
      hls_link: data.hls_link,
      created_at: data.created_at,
    }
  }

  /**
   * Video holatini olish (transcoding status, poster, davomiyligi)
   */
  async getVideo(videoId: string) {
    if (!this.isConfigured()) {
      throw new Error('Server API kaliti sozlanmagan')
    }

    const response = await axios.get(`${this.apiUrl}/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${config.kinescopeApiKey}`,
      },
    })

    return response.data?.data
  }

  /**
   * Videoni o'chirish
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    try {
      await axios.delete(`${this.apiUrl}/videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${config.kinescopeApiKey}`,
        },
      })
      return true
    } catch {
      return false
    }
  }
}

export const kinescopeService = new KinescopeService()
