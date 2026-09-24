import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticateJwt } from './auth.middleware'

const router = Router()

// 1-QADAM: SMS kod yuborish
router.post('/send-otp', (req, res, next) => authController.sendOtp(req, res, next))

// 2-QADAM: SMS kodni tekshirish
router.post('/verify-otp', (req, res, next) => authController.verifyOtp(req, res, next))

// 3-QADAM: Ro'yxatdan o'tish
router.post('/register', (req, res, next) => authController.register(req, res, next))

// Kirish (Login)
router.post('/login', (req, res, next) => authController.login(req, res, next))

// 4-QADAM: Refresh token orqali yangi Access token olish
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next))

// 5-QADAM: Tizimdan chiqish (Logout)
router.post('/logout', (req, res, next) => authController.logout(req, res, next))

// JWT orqali shaxsiy profilni olish
router.get('/me', authenticateJwt, (req, res, next) => authController.getMe(req, res, next))

// JWT orqali profil ma'lumotlarini yangilash
router.put('/profile', authenticateJwt, (req, res, next) => authController.updateProfile(req, res, next))

export const authRouter = router
