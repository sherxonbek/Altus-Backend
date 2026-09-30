import { Router } from 'express'
import { authenticateJwt } from '../auth/auth.middleware'
import { requireAdmin } from '../auth/admin.middleware'
import { getStats, getWithdrawals, approveWithdrawal, rejectWithdrawal } from './admin.controller'

export const adminRouter = Router()

// Barcha admin marshrutlari auth va admin huquqini talab qiladi
adminRouter.use(authenticateJwt, requireAdmin)

adminRouter.get('/stats', getStats)
adminRouter.get('/withdrawals', getWithdrawals)
adminRouter.post('/withdrawals/:id/approve', approveWithdrawal)
adminRouter.post('/withdrawals/:id/reject', rejectWithdrawal)
