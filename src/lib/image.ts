const MAX_DIMENSION = 1600
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024

/**
 * Downscales large photos before they are stored in IndexedDB. GIFs and SVGs
 * keep their original bytes so animation / vectors are preserved.
 */
export async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('請選擇圖片檔案')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('圖片超過 15 MB，請選擇較小的檔案')
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Formats the browser cannot decode (e.g. HEIC on desktop Chrome) are stored as-is.
    return file
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 600 * 1024) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86))
  return blob && blob.size < file.size ? blob : file
}
