import cluster from 'node:cluster'
import os from 'node:os'
import http from 'node:http'
import app from './app'
import { connectDB } from './config/db'
import { config } from './config/env'
import { seedDatabaseIfEmpty } from './seed/seed'
import { initStreamWebSocket } from './stream/stream.ws'
import { playlistService } from './playlist/playlist.service'

const numCPUs = Math.min(os.cpus().length, 8)
const isClusterMode = process.env.CLUSTER_MODE === 'true'

const startServer = async () => {
  // 1. Bazaga ulanish
  await connectDB()

  // 2. Baza bo'sh bo'lsa demo ma'lumotlarni kiritish
  await seedDatabaseIfEmpty()

  // 3. Mavjud playlistlar narxlarini sof muallif narxiga sinxronlashtirish
  await playlistService.syncAllPlaylistsPrices()

  // 4. HTTP server va WebSocketni ishga tushirish
  const server = http.createServer(app)
  initStreamWebSocket(server)

  server.listen(config.port, () => {
    console.log(`🚀 [Server ${process.pid}] Server http://localhost:${config.port} manzilida ishlamoqda (${config.nodeEnv})`)
  })
}

if (isClusterMode && cluster.isPrimary) {
  console.log(`⚡ [Cluster Master ${process.pid}] ${numCPUs} ta ishchi oqim (workers) ishga tushirilmoqda...`)

  // Workerlarni yaratish
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️ [Cluster] Worker ${worker.process.pid} to'xtadi (kod: ${code}, signal: ${signal}). Yangi worker qayta ishga tushirilmoqda...`)
    cluster.fork()
  })
} else {
  startServer()
}
