import { z } from 'zod'

// Telefon raqamdan faqat raqamlarni tozalab olish (masalan, "90 123 45 67" yoki "+998901234567" dan "901234567")
const cleanPhone = (val: string) => {
  const digits = val.replace(/\D/g, '')
  if (digits.startsWith('998') && digits.length === 12) {
    return digits.slice(3)
  }
  return digits
}

// 1. Kod yuborish validatsiyasi
export const sendOtpValidation = z.object({
  phone: z
    .string()
    .min(1, "Telefon raqami kiritilishi shart")
    .transform(cleanPhone)
    .refine((val) => val.length === 9, {
      message: "Telefon raqami 9 xonali bo'lishi kerak",
    }),
})

// 2. Kodni tasdiqlash validatsiyasi
export const verifyOtpValidation = z.object({
  phone: z
    .string()
    .min(1, "Telefon raqami kiritilishi shart")
    .transform(cleanPhone)
    .refine((val) => val.length === 9, {
      message: "Telefon raqami 9 xonali bo'lishi kerak",
    }),
  code: z
    .string()
    .length(5, "Tasdiqlash kodi 5 ta raqam bo'lishi kerak"),
})

// 3. Ro'yxatdan o'tish validatsiyasi
export const registerValidation = z.object({
  phone: z
    .string()
    .min(1, "Telefon raqami kiritilishi shart")
    .transform(cleanPhone)
    .refine((val) => val.length === 9, {
      message: "Telefon raqami 9 xonali bo'lishi kerak",
    }),
  fullName: z
    .string()
    .trim()
    .min(1, "F.I.SH kiritilishi shart")
    .min(5, "F.I.SH kamida 5 ta belgidan iborat bo'lishi kerak"),
  password: z
    .string()
    .min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
    .regex(/[a-zA-Z]/, "Parolda kamida bitta harf bo'lishi kerak")
    .regex(/\d/, "Parolda kamida bitta raqam qatnashishi kerak"),
})

// 4. Kirish (Login) validatsiyasi
export const loginValidation = z.object({
  phone: z
    .string()
    .min(1, "Telefon raqami kiritilishi shart")
    .transform(cleanPhone)
    .refine((val) => val.length === 9, {
      message: "Telefon raqami 9 xonali bo'lishi kerak",
    }),
  password: z
    .string()
    .min(1, "Parol kiritilishi shart"),
})
