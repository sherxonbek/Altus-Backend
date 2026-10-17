import { Router } from 'express'
import { getPublicSettings, updateAdminSettings } from './setting.controller'
import { authenticateJwt } from '../auth/auth.middleware'
import { requireAdmin } from '../auth/admin.middleware'

export const settingRouter = Router()

// Ommaviy sozlamalar (barcha foydalanuvchilar va mehmonlar ko'rishi mumkin)
settingRouter.get('/', getPublicSettings)

// Admin tomonidan sozlamalarni yangilash
settingRouter.put('/', authenticateJwt, requireAdmin, updateAdminSettings)
