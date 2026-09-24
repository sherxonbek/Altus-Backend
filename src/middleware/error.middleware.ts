import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zod validatsiya xatoligi
  if (err instanceof ZodError) {
    const firstError = err.errors[0]?.message || "Ma'lumotlar noto'g'ri kiritildi"
    res.status(400).json({
      success: false,
      message: firstError,
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // MongoDB takroriy (unique) kalit xatoligi (masalan, telefon raqam)
  if (err.code === 11000) {
    res.status(400).json({
      success: false,
      message: "Ushbu ma'lumot (telefon raqam) allaqachon ro'yxatdan o'tgan",
    })
    return
  }

  // Boshqa xatoliklar
  const statusCode = err.statusCode || 400
  const message = err.message || 'Serverda kutilmagan xatolik yuz berdi'

  res.status(statusCode).json({
    success: false,
    message,
  })
}
