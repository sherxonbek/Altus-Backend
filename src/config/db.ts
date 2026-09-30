import mongoose from 'mongoose'
import { config } from './env'

// MongoDB bazasiga ulanish funksiyasi
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      maxPoolSize: 200, // 200 tagacha parallel ulanishlar puli
      minPoolSize: 10,  // Kamida 10 ta doimiy ulanish
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    console.log(`[MongoDB] Baza muvaffaqiyatli ulandi: ${conn.connection.host}`)
  } catch (error) {
    console.error('[MongoDB] Ulanishda xatolik yuz berdi:', error)
    process.exit(1)
  }
}
