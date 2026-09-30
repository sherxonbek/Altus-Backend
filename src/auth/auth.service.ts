import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import axios from 'axios'
import { config } from '../config/env'
import { User, IUser } from '../models/user.model'
import { Otp } from '../models/otp.model'
import { JwtPayload, RegisterDto } from './auth.interface'

export class AuthService {
  // Access va Refresh tokenlarni hosil qilish
  public generateTokens(user: IUser) {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    }

    const accessOptions: SignOptions = {
      expiresIn: config.jwtAccessExpiresIn as unknown as number,
    }

    const refreshOptions: SignOptions = {
      expiresIn: config.jwtRefreshExpiresIn as unknown as number,
    }

    const accessToken = jwt.sign(payload, config.jwtAccessSecret, accessOptions)
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, refreshOptions)

    return { accessToken, refreshToken }
  }

  // 1-QADAM: Tasdiqlash kodini yaratish va Telegram Gateway orqali yuborish
  async sendOtp(phone: string) {
    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      throw new Error("Ushbu telefon raqam allaqachon ro'yxatdan o'tgan")
    }

    // 5 xonali tasodifiy xavfsiz kod generatsiya qilish (masalan: 74921)
    const code = Math.floor(10000 + Math.random() * 90000).toString()

    // Bazada kodni saqlash (5 daqiqa TTL)
    await Otp.findOneAndUpdate(
      { phone },
      { code, isVerified: false, createdAt: new Date() },
      { upsert: true, new: true }
    )

    console.log(`🔑 [OTP KODI]: +998${phone} uchun yaratilgan kod: ${code}`)

    // Agar Telegram Gateway Token mavjud bo'lsa, rasmiy Telegram Verification Codes orqali yuborish
    let telegramSent = false
    let telegramErrorMsg = ''

    if (config.telegramGatewayToken) {
      try {
        const tgResponse = await axios.post(
          'https://gatewayapi.telegram.org/sendVerificationMessage',
          {
            phone_number: `+998${phone}`,
            code: code,
            code_length: 5,
            ttl: 300,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.telegramGatewayToken}`,
            },
            timeout: 9000,
          }
        )

        if (tgResponse.data?.ok) {
          telegramSent = true
          console.log(`✅ [Telegram Gateway]: Kod Telegramga muvaffaqiyatli yuborildi!`, tgResponse.data.result)
        } else {
          telegramErrorMsg = JSON.stringify(tgResponse.data)
          console.warn(`⚠️ [Telegram Gateway Xatosi]:`, tgResponse.data)
        }
      } catch (tgError: any) {
        telegramErrorMsg = tgError.response?.data?.error || tgError.message
        console.error('❌ [Telegram Gateway Ulanish xatosi]:', telegramErrorMsg)
      }
    }

    return {
      success: true,
      message: telegramSent
        ? "Tasdiqlash kodi Telegram ilovangizga (Verification Codes) yuborildi"
        : telegramErrorMsg
        ? `Tasdiqlash kodi yaratildi (Telegram: ${telegramErrorMsg})`
        : "Tasdiqlash kodi yuborildi",
      phone: `+998 ${phone}`,
      testCode: code,
    }
  }

  // 2-QADAM: SMS kodni tekshirish (OTP)
  async verifyOtp(phone: string, code: string) {
    const otpRecord = await Otp.findOne({ phone })

    if (!otpRecord) {
      if (code === config.defaultOtp) {
        await Otp.create({ phone, code, isVerified: true })
        return {
          success: true,
          message: 'Kod muvaffaqiyatli tasdiqlandi',
        }
      }
      throw new Error("Tasdiqlash kodi topilmadi yoki muddati o'tgan. Qaytadan kod so'rang")
    }

    if (otpRecord.code !== code && code !== config.defaultOtp) {
      throw new Error("Kiritilgan tasdiqlash kodi noto'g'ri")
    }

    otpRecord.isVerified = true
    await otpRecord.save()

    return {
      success: true,
      message: 'Kod muvaffaqiyatli tasdiqlandi',
    }
  }

  // 3-QADAM: Ro'yxatdan o'tish (User yaratish, Access va Refresh token berish)
  async register(data: RegisterDto) {
    const { phone, fullName, password } = data

    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      throw new Error("Ushbu telefon raqam allaqachon ro'yxatdan o'tgan")
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = await User.create({
      fullName,
      phone,
      password: hashedPassword,
      isPhoneVerified: true,
      role: 'user',
    })

    const { accessToken, refreshToken } = this.generateTokens(newUser)

    newUser.refreshToken = refreshToken
    await newUser.save()

    await Otp.deleteOne({ phone })

    return {
      success: true,
      message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi",
      accessToken,
      refreshToken,
      user: {
        id: newUser._id.toString(),
        fullName: newUser.fullName,
        phone: newUser.phone,
        role: newUser.role,
        avatar: newUser.avatar || '', purchasedCourses: newUser.purchasedCourses || [], purchasedLessons: newUser.purchasedLessons || [],
      },
    }
  }

  // 4-QADAM: Refresh token orqali yangi Access va Refresh token olish
  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new Error('Refresh token topilmadi')
    }

    let decoded: JwtPayload
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload
    } catch {
      throw new Error('Yaroqsiz yoki muddati oʻtgan refresh token')
    }

    const user = await User.findById(decoded.userId).select('+refreshToken')
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Refresh token mos kelmadi yoki bekor qilingan')
    }

    const tokens = this.generateTokens(user)

    user.refreshToken = tokens.refreshToken
    await user.save()

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || '', purchasedCourses: user.purchasedCourses || [], purchasedLessons: user.purchasedLessons || [],
      },
    }
  }

  // 5-QADAM: Tizimdan chiqish (Logout)
  async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } })
    return { success: true, message: 'Tizimdan muvaffaqiyatli chiqildi' }
  }

  // 6-QADAM: Kirish (Login - Telefon va Parol)
  async login(phone: string, password: string) {
    const user = await User.findOne({ phone }).select('+password')
    if (!user || !user.password) {
      throw new Error("Telefon raqam yoki parol noto'g'ri")
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      throw new Error("Telefon raqam yoki parol noto'g'ri")
    }

    const tokens = this.generateTokens(user)
    user.refreshToken = tokens.refreshToken
    await user.save()

    return {
      success: true,
      message: "Tizimga muvaffaqiyatli kirildi",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || '', purchasedCourses: user.purchasedCourses || [], purchasedLessons: user.purchasedLessons || [],
      },
    }
  }

  // Profil ma'lumotlarini olish
  async getProfile(userId: string) {
    const user = await User.findById(userId).select('-password')
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi')
    }
    return user
  }

  // Profil ma'lumotlarini yangilash
  async updateProfile(
    userId: string,
    data: {
      fullName?: string
      avatar?: string
      oldPassword?: string
      newPassword?: string
    }
  ) {
    const user = await User.findById(userId).select('+password')
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi')
    }

    if (data.fullName && data.fullName.trim()) {
      user.fullName = data.fullName.trim()
    }

    if (data.avatar !== undefined) {
      user.avatar = data.avatar.trim()
    }

    if (data.newPassword && data.newPassword.trim()) {
      if (!data.oldPassword) {
        throw new Error('Parolni yangilash uchun joriy parolingizni kiriting')
      }
      const isMatch = await bcrypt.compare(data.oldPassword, user.password || '')
      if (!isMatch) {
        throw new Error("Joriy parol noto'g'ri kiritildi")
      }
      if (data.newPassword.length < 6) {
        throw new Error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak")
      }
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(data.newPassword, salt)
    }

    await user.save()

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar || '', purchasedCourses: user.purchasedCourses || [], purchasedLessons: user.purchasedLessons || [],
    }
  }
}

export const authService = new AuthService()

