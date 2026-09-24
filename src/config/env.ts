import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/c2c_db',

  // Access Token sozlamalari (15 daqiqa)
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_2026',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',

  // Refresh Token sozlamalari (7 kun)
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  defaultOtp: process.env.DEFAULT_OTP || '12345',

  // Telegram Gateway Token
  telegramGatewayToken: process.env.TELEGRAM_GATEWAY_TOKEN || '',

  // Kinescope Video Hosting & DRM sozlamalari
  kinescopeApiKey: process.env.KINESCOPE_API_KEY || '',
  kinescopeProjectId: process.env.KINESCOPE_PROJECT_ID || '',
}
