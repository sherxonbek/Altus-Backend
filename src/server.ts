import app from './app'
import { connectDB } from './config/db'
import { config } from './config/env'
import { seedDatabaseIfEmpty } from './seed/seed'

const startServer = async () => {
  // 1. Bazaga ulanish
  await connectDB()

  // 2. Baza bo'sh bo'lsa demo ma'lumotlarni kiritish
  await seedDatabaseIfEmpty()

  // 3. Serverni tinglash
  app.listen(config.port, () => {
    console.log(`🚀 [Server] Server http://localhost:${config.port} manzilida ishlamoqda (${config.nodeEnv})`)
  })
}

startServer()
