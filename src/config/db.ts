import mongoose from 'mongoose'
import { config } from './env'

// MongoDB bazasiga ulanish funksiyasi
export const connectDB = async (): Promise<void> => {
  try {
    const maskedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@')
    console.log(`[MongoDB] Ulanish harakati: ${maskedUri}`)

    const conn = await mongoose.connect(config.mongoUri, {
      maxPoolSize: 200,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    })
    console.log(`[MongoDB] Baza muvaffaqiyatli ulandi: ${conn.connection.host}`)
  } catch (error) {
    console.error(`[MongoDB] Ulanishda xatolik yuz berdi (${config.mongoUri.startsWith('mongodb+srv') ? 'Atlas' : 'Local'}):`, error)
    process.exit(1)
  }
}
