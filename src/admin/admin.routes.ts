import { Router } from 'express'
import { authenticateJwt } from '../auth/auth.middleware'
import { requireAdmin } from '../auth/admin.middleware'
import { getStats, getTrades, getWithdrawals, approveWithdrawal, rejectWithdrawal, getChannels, getUsers } from './admin.controller'

export const adminRouter = Router()

// Barcha admin marshrutlari auth va admin huquqini talab qiladi
adminRouter.use(authenticateJwt, requireAdmin)

adminRouter.get('/stats', getStats)
adminRouter.get('/trades', getTrades)
adminRouter.get('/channels', getChannels)
adminRouter.get('/users', getUsers)
adminRouter.get('/withdrawals', getWithdrawals)
adminRouter.post('/withdrawals/:id/approve', approveWithdrawal)
adminRouter.post('/withdrawals/:id/reject', rejectWithdrawal)
