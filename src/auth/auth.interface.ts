export interface JwtPayload {
  userId: string
  phone: string
  role: string
}

export interface SendOtpDto {
  phone: string
}

export interface VerifyOtpDto {
  phone: string
  code: string
}

export interface RegisterDto {
  phone: string
  fullName: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  token?: string
  user?: {
    id: string
    fullName: string
    phone: string
    role: string
  }
}
