import { Request, Response, NextFunction } from 'express'
import { settingService } from './setting.service'

export const getPublicSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingService.getSettings()
    res.status(200).json(settings)
  } catch (error) {
    next(error)
  }
}

export const updateAdminSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { coinPriceUsd, usdToUzsRate, streamRate360p, streamRate720p, streamRate1080p } = req.body

    const validateField = (val: any, fieldName: string): number | undefined => {
      if (val !== undefined) {
        const num = Number(val)
        if (Number.isNaN(num) || num < 0) {
          throw new Error(`${fieldName} musbat son bo'lishi kerak`)
        }
        return num
      }
      return undefined
    }

    let parsedCoinPriceUsd: number | undefined
    let parsedUsdToUzsRate: number | undefined
    let parsedStreamRate360p: number | undefined
    let parsedStreamRate720p: number | undefined
    let parsedStreamRate1080p: number | undefined

    try {
      parsedCoinPriceUsd = validateField(coinPriceUsd, 'coinPriceUsd')
      parsedUsdToUzsRate = validateField(usdToUzsRate, 'usdToUzsRate')
      parsedStreamRate360p = validateField(streamRate360p, 'streamRate360p')
      parsedStreamRate720p = validateField(streamRate720p, 'streamRate720p')
      parsedStreamRate1080p = validateField(streamRate1080p, 'streamRate1080p')
    } catch (validationErr: any) {
      res.status(400).json({ message: validationErr.message })
      return
    }

    const updated = await settingService.updateSettings({
      coinPriceUsd: parsedCoinPriceUsd,
      usdToUzsRate: parsedUsdToUzsRate,
      streamRate360p: parsedStreamRate360p,
      streamRate720p: parsedStreamRate720p,
      streamRate1080p: parsedStreamRate1080p,
    })
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}
