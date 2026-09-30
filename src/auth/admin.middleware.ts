import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth.middleware'

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'admin') {
    next()
  } else {
    res.status(403).json({ success: false, message: 'Admin huquqi talab qilinadi' })
  }
}
