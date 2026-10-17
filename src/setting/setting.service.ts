import { Setting } from '../models/setting.model'

export class SettingService {
  async getSettings() {
    let setting = await Setting.findOne({ key: 'system' })
    if (!setting) {
      setting = await Setting.create({
        key: 'system',
        coinPriceUsd: 0.01,
        usdToUzsRate: 13000,
        streamRate360p: 1,
        streamRate720p: 3,
        streamRate1080p: 7,
      })
    }

    const coinPriceUzs = Math.max(1, Math.round(setting.coinPriceUsd * setting.usdToUzsRate))

    return {
      coinPriceUsd: setting.coinPriceUsd,
      usdToUzsRate: setting.usdToUzsRate,
      coinPriceUzs, // Masalan: 0.01 * 13000 = 130 so'm
      streamRate360p: setting.streamRate360p !== undefined ? setting.streamRate360p : 1,
      streamRate720p: setting.streamRate720p !== undefined ? setting.streamRate720p : 3,
      streamRate1080p: setting.streamRate1080p !== undefined ? setting.streamRate1080p : 7,
      updatedAt: setting.updatedAt,
    }
  }

  async updateSettings(data: {
    coinPriceUsd?: number
    usdToUzsRate?: number
    streamRate360p?: number
    streamRate720p?: number
    streamRate1080p?: number
  }) {
    let setting = await Setting.findOne({ key: 'system' })
    if (!setting) {
      setting = new Setting({ key: 'system' })
    }

    if (data.coinPriceUsd !== undefined && data.coinPriceUsd > 0) {
      setting.coinPriceUsd = data.coinPriceUsd
    }

    if (data.usdToUzsRate !== undefined && data.usdToUzsRate > 0) {
      setting.usdToUzsRate = data.usdToUzsRate
    }

    if (data.streamRate360p !== undefined && data.streamRate360p >= 0) {
      setting.streamRate360p = data.streamRate360p
    }

    if (data.streamRate720p !== undefined && data.streamRate720p >= 0) {
      setting.streamRate720p = data.streamRate720p
    }

    if (data.streamRate1080p !== undefined && data.streamRate1080p >= 0) {
      setting.streamRate1080p = data.streamRate1080p
    }

    await setting.save()

    const coinPriceUzs = Math.max(1, Math.round(setting.coinPriceUsd * setting.usdToUzsRate))

    return {
      success: true,
      message: 'Tizim sozlamalari muvaffaqiyatli yangilandi',
      coinPriceUsd: setting.coinPriceUsd,
      usdToUzsRate: setting.usdToUzsRate,
      coinPriceUzs,
      streamRate360p: setting.streamRate360p,
      streamRate720p: setting.streamRate720p,
      streamRate1080p: setting.streamRate1080p,
      updatedAt: setting.updatedAt,
    }
  }
}

export const settingService = new SettingService()
