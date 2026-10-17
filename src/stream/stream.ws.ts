import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { config } from '../config/env'
import { User } from '../models/user.model'
import { settingService } from '../setting/setting.service'

interface StreamSession {
  userId: string
  quality: '360p' | '720p' | '1080p'
  playlistId?: string
  lessonId?: string
  isPlaying: boolean
  secondsAccumulator: number
  timer?: NodeJS.Timeout
}

export function initStreamWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/stream-ws' })

  // 30 soniyalik Heartbeat Ping/Pong (Zombi ulanishlar va memory leak'larning oldini oladi)
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client: any) => {
      if (client.isAlive === false) {
        console.warn('⚠️ [WebSocket] Zombi ulanish aniqlandi, ulanish tugatildi')
        return client.terminate()
      }
      client.isAlive = false
      client.ping()
    })
  }, 30000)

  wss.on('close', () => {
    clearInterval(heartbeatInterval)
  })

  wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
    const aliveWs = ws as any
    aliveWs.isAlive = true
    aliveWs.on('pong', () => {
      aliveWs.isAlive = true
    })

    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      const token = url.searchParams.get('token')

      if (!token) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Token taqdim etilmadi' }))
        ws.close()
        return
      }

      let decoded: any
      try {
        decoded = jwt.verify(token, config.jwtAccessSecret)
      } catch {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Token yaroqsiz yoki muddati o‘tgan' }))
        ws.close()
        return
      }

      const userId = decoded.userId
      if (!userId) {
        ws.close()
        return
      }

      console.log(`🔌 [WebSocket] Foydalanuvchi ulandi: ${userId}`)

      let session: StreamSession = {
        userId,
        quality: '720p',
        isPlaying: false,
        secondsAccumulator: 0,
      }

      const getTargetInterval = async (quality: string) => {
        try {
          const settings = await settingService.getSettings()
          let ratePerMin = settings.streamRate720p || 3
          if (quality === '360p') ratePerMin = settings.streamRate360p ?? 1
          if (quality === '1080p') ratePerMin = settings.streamRate1080p ?? 7
          if (ratePerMin <= 0) return 60
          return Math.max(1, Math.round(60 / ratePerMin))
        } catch {
          if (quality === '1080p') return 9
          if (quality === '720p') return 18
          return 35
        }
      }

      const deductCoin = async () => {
        try {
          const settings = await settingService.getSettings()
          let ratePerMin = settings.streamRate720p || 3
          if (session.quality === '360p') ratePerMin = settings.streamRate360p ?? 1
          if (session.quality === '1080p') ratePerMin = settings.streamRate1080p ?? 7

          // Atomik tanga yechish (Race conditiondan himoyalangan)
          const updatedUser = await User.findOneAndUpdate(
            { _id: session.userId, coins: { $gte: 1 } },
            { $inc: { coins: -1 } },
            { new: true }
          )

          if (!updatedUser) {
            session.isPlaying = false
            if (session.timer) {
              clearInterval(session.timer)
              session.timer = undefined
            }
            const currentUser = await User.findById(session.userId)
            ws.send(
              JSON.stringify({
                type: 'OUT_OF_COINS',
                coins: currentUser?.coins || 0,
                quality: session.quality,
                ratePerMin,
                message: 'Hisobingizda tangalar tugadi. Videoni ko‘rishni davom ettirish uchun toʻldiring.',
              })
            )
            return
          }

          console.log(
            `🪙 [WS StreamDeduct] User: ${updatedUser.fullName}, -1 coin, Qolgan: ${updatedUser.coins}, Sifat: ${session.quality}`
          )

          ws.send(
            JSON.stringify({
              type: 'DEDUCTED',
              coins: updatedUser.coins,
              deducted: 1,
              quality: session.quality,
              ratePerMin,
            })
          )
        } catch (err) {
          console.error('[WS StreamDeduct] Xatolik:', err)
        }
      }

      const startTimer = () => {
        if (session.timer) clearInterval(session.timer)

        session.timer = setInterval(async () => {
          if (!session.isPlaying) return

          session.secondsAccumulator += 1
          const threshold = await getTargetInterval(session.quality)

          if (session.secondsAccumulator >= threshold) {
            session.secondsAccumulator = 0
            await deductCoin()
          }
        }, 1000)
      }

      ws.on('message', async (data: string) => {
        try {
          const msg = JSON.parse(data.toString())

          switch (msg.type) {
            case 'START':
              session.quality = msg.quality || '720p'
              session.playlistId = msg.playlistId
              session.lessonId = msg.lessonId

              // 0 coin tekshiruvi: tangasi bo'lmasa ijroni darhol to'xtatish
              const currentUser = await User.findById(session.userId)
              if (!currentUser || (currentUser.coins || 0) < 1) {
                session.isPlaying = false
                if (session.timer) {
                  clearInterval(session.timer)
                  session.timer = undefined
                }
                ws.send(
                  JSON.stringify({
                    type: 'OUT_OF_COINS',
                    coins: currentUser ? (currentUser.coins || 0) : 0,
                    quality: session.quality,
                    message: 'Hisobingizda tangalar tugadi (0 coin). Videoni ko‘rishni davom ettirish uchun balansingizni toʻldiring.',
                  })
                )
                console.log(`⛔ [WS Stream] 0 coin tufayli ijro rad etildi: ${session.userId}`)
                break
              }

              session.isPlaying = true
              session.secondsAccumulator = 0
              startTimer()
              console.log(`▶️ [WS Stream] Ijro boshlandi: Sifat ${session.quality}, Balans: ${currentUser.coins} coin`)
              break

            case 'CHANGE_QUALITY':
              session.quality = msg.quality || '720p'
              console.log(`🔄 [WS Stream] Sifat o'zgardi: ${session.quality}`)
              ws.send(JSON.stringify({ type: 'QUALITY_CHANGED', quality: session.quality }))
              break

            case 'PAUSE':
              session.isPlaying = false
              if (session.timer) {
                clearInterval(session.timer)
                session.timer = undefined
              }
              console.log(`⏸️ [WS Stream] Video pauza qilindi`)
              break

            case 'RESUME':
              // RESUME bo'lganda ham 0 coin tekshiruvi
              const resumeUser = await User.findById(session.userId)
              if (!resumeUser || (resumeUser.coins || 0) < 1) {
                session.isPlaying = false
                if (session.timer) {
                  clearInterval(session.timer)
                  session.timer = undefined
                }
                ws.send(
                  JSON.stringify({
                    type: 'OUT_OF_COINS',
                    coins: resumeUser ? (resumeUser.coins || 0) : 0,
                    quality: session.quality,
                    message: 'Hisobingizda tangalar tugadi (0 coin). Videoni ko‘rishni davom ettirish uchun balansingizni toʻldiring.',
                  })
                )
                console.log(`⛔ [WS Stream] 0 coin tufayli RESUME rad etildi: ${session.userId}`)
                break
              }
              session.isPlaying = true
              startTimer()
              console.log(`▶️ [WS Stream] Video davom ettirildi`)
              break

            case 'STOP':
              session.isPlaying = false
              if (session.timer) {
                clearInterval(session.timer)
                session.timer = undefined
              }
              console.log(`⏹️ [WS Stream] Video to'xtatildi`)
              break

            default:
              break
          }
        } catch (e) {
          console.error('[WS Message Error]', e)
        }
      })

      ws.on('close', () => {
        if (session.timer) {
          clearInterval(session.timer)
          session.timer = undefined
        }
        console.log(`🔌 [WS Stream] Ulanish yopildi: ${session.userId}`)
      })

      ws.on('error', (err) => {
        if (session.timer) {
          clearInterval(session.timer)
          session.timer = undefined
        }
        console.error(`❌ [WS Stream Error]`, err)
      })
    } catch (error) {
      console.error('[WS Connection Error]', error)
      ws.close()
    }
  })

  console.log('⚡ [WebSocket] Stream WebSocket serveri /stream-ws manzilida faollashtirildi')
  return wss
}
