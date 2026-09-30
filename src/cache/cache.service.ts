import { Request, Response, NextFunction } from 'express'

interface CacheEntry<T = any> {
  value: T
  expiresAt: number
}

class CacheService {
  private store: Map<string, CacheEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Har 60 soniyada muddati o'tgan kesh kalitlarini avtomatik tozalash
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  get<T = any>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    return entry.value as T
  }

  set<T = any>(key: string, value: T, ttlSeconds: number = 60): void {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
  }

  del(key: string): void {
    this.store.delete(key)
  }

  delByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  clear(): void {
    this.store.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Express middleware: GET so'rovlarini keshlaydi
   */
  middleware(ttlSeconds: number = 60, prefix: string = 'api') {
    return (req: Request, res: Response, next: NextFunction) => {
      // Faqat GET so'rovlarini keshlaymiz
      if (req.method !== 'GET') {
        return next()
      }

      // Agar avtorizatsiyalangan foydalanuvchi maxsus so'rov qilsa, keshni chetlab o'tish mumkin
      const cacheKey = `${prefix}:${req.originalUrl || req.url}`
      const cachedData = this.get(cacheKey)

      if (cachedData !== undefined) {
        res.setHeader('X-Cache', 'HIT')
        return res.status(200).json(cachedData)
      }

      // Kesh bo'lmaganda res.json ni tutib olish va saqlash
      res.setHeader('X-Cache', 'MISS')
      const originalJson = res.json.bind(res)

      res.json = (body: any) => {
        // Faqat muvaffaqiyatli (200-299) javoblarni keshlaymiz
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(cacheKey, body, ttlSeconds)
        }
        return originalJson(body)
      }

      next()
    }
  }
}

export const cacheService = new CacheService()
