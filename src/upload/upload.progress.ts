export interface UploadProgress {
  uploadId: string
  stage: 'uploading_server' | 'uploading_kinescope' | 'done' | 'error'
  percent: number
  message: string
  updatedAt: number
}

class UploadProgressManager {
  private progressMap = new Map<string, UploadProgress>()

  set(uploadId: string, data: { stage: UploadProgress['stage']; percent: number; message: string }) {
    if (!uploadId) return
    this.progressMap.set(uploadId, {
      uploadId,
      ...data,
      updatedAt: Date.now(),
    })
    this.cleanupOld()
  }

  get(uploadId: string): UploadProgress | undefined {
    if (!uploadId) return undefined
    return this.progressMap.get(uploadId)
  }

  delete(uploadId: string) {
    if (!uploadId) return
    this.progressMap.delete(uploadId)
  }

  private cleanupOld() {
    // 30 daqiqadan eski bo'lgan yozuvlarni tozalash
    const threshold = Date.now() - 30 * 60 * 1000
    for (const [id, item] of this.progressMap.entries()) {
      if (item.updatedAt < threshold) {
        this.progressMap.delete(id)
      }
    }
  }
}

export const uploadProgressManager = new UploadProgressManager()
