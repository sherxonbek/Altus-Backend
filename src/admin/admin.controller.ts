import { Request, Response } from 'express'
import { adminService } from './admin.service'

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await adminService.getStats()
    res.status(200).json({ success: true, data: stats })
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Xatolik' })
  }
}

export const getWithdrawals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query
    const withdrawals = await adminService.getWithdrawals(status as string)
    res.status(200).json({ success: true, data: withdrawals })
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Xatolik' })
  }
}

export const approveWithdrawal = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id)
    const withdrawal = await adminService.approveWithdrawal(id)
    res.status(200).json({ success: true, data: withdrawal, message: "So'rov tasdiqlandi" })
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Xatolik' })
  }
}

export const rejectWithdrawal = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id)
    const { reason } = req.body
    if (!reason) {
      res.status(400).json({ success: false, message: 'Bekor qilish sababi kiritilishi shart' })
      return
    }
    const withdrawal = await adminService.rejectWithdrawal(id, reason)
    res.status(200).json({ success: true, data: withdrawal, message: "So'rov bekor qilindi va pul qaytarildi" })
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Xatolik' })
  }
}
