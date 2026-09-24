import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { config } from '../config/env'
import {
  sendOtpValidation,
  verifyOtpValidation,
  registerValidation,
  loginValidation,
} from './auth.validation'

// Cookie o'rnatish yordamchi funksiyasi
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 kun
  })
}

export class AuthController {
  // 1-QADAM: SMS kod yuborish
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = sendOtpValidation.parse(req.body)
      const result = await authService.sendOtp(validatedData.phone)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  // 2-QADAM: Kodni tasdiqlash
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = verifyOtpValidation.parse(req.body)
      const result = await authService.verifyOtp(
        validatedData.phone,
        validatedData.code
      )
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  // 3-QADAM: Ro'yxatdan o'tish (Access token va httpOnly Cookie da Refresh token)
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = registerValidation.parse(req.body)
      const result = await authService.register(validatedData)

      // Refresh tokenni xavfsiz httpOnly cookie'ga yozish
      setRefreshTokenCookie(res, result.refreshToken)

      res.status(201).json({
        success: true,
        message: result.message,
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      next(error)
    }
  }

  // 4-QADAM: Kirish (Login - Telefon va Parol)
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = loginValidation.parse(req.body)
      const result = await authService.login(
        validatedData.phone,
        validatedData.password
      )

      // Refresh tokenni xavfsiz httpOnly cookie'ga yozish
      setRefreshTokenCookie(res, result.refreshToken)

      res.status(200).json({
        success: true,
        message: result.message,
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      next(error)
    }
  }

  // 4-QADAM: Yangi Access token olish (Refresh Token orqali)
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken
      const result = await authService.refreshToken(token)

      // Yangilangan refresh tokenni cookie'ga qayta yozish
      setRefreshTokenCookie(res, result.refreshToken)

      res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      next(error)
    }
  }

  // 5-QADAM: Chiqish (Logout)
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId
      if (userId) {
        await authService.logout(userId)
      }

      // Cookie'ni tozalash
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      })

      res.status(200).json({
        success: true,
        message: 'Muvaffaqiyatli chiqildi',
      })
    } catch (error) {
      next(error)
    }
  }

  // Profil ma'lumotlarini olish (JWT orqali)
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId
      const profile = await authService.getProfile(userId)
      res.status(200).json({
        success: true,
        user: profile,
      })
    } catch (error) {
      next(error)
    }
  }

  // Profil ma'lumotlarini yangilash
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId
      const { fullName, avatar, oldPassword, newPassword } = req.body
      const updatedUser = await authService.updateProfile(userId, {
        fullName,
        avatar,
        oldPassword,
        newPassword,
      })
      res.status(200).json({
        success: true,
        message: "Profil ma'lumotlari muvaffaqiyatli saqlandi",
        user: updatedUser,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const authController = new AuthController()
