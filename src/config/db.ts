import mongoose from 'mongoose'
import { config } from './env'

// MongoDB bazasiga ulanish funksiyasi
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri)
    console.log(`[MongoDB] Baza muvaffaqiyatli ulandi: ${conn.connection.host}`)
  } catch (error) {
    console.error('[MongoDB] Ulanishda xatolik yuz berdi:', error)
    process.exit(1)
  }
}
