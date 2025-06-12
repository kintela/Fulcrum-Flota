/**
 * Utilidades para procesamiento de imágenes
 */

export interface ImageResizeOptions {
  maxWidth: number
  maxHeight: number
  quality: number
  format?: "jpeg" | "webp"
}

export interface ImageResizeResult {
  success: boolean
  file?: File
  error?: string
  originalSize?: number
  compressedSize?: number
  compressionRatio?: number
}

/**
 * Configuración por defecto para redimensionar imágenes
 */
export const DEFAULT_IMAGE_CONFIG: ImageResizeOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: "jpeg",
}

/**
 * Redimensiona y comprime una imagen
 */
export async function resizeImage(file: File, options: Partial<ImageResizeOptions> = {}): Promise<ImageResizeResult> {
  const config = { ...DEFAULT_IMAGE_CONFIG, ...options }

  try {
    // Crear elemento de imagen
    const img = new Image()
    img.crossOrigin = "anonymous"

    // Crear URL del archivo
    const imageUrl = URL.createObjectURL(file)

    return new Promise((resolve) => {
      img.onload = () => {
        try {
          // Limpiar URL
          URL.revokeObjectURL(imageUrl)

          // Calcular nuevas dimensiones manteniendo proporción
          const { width: newWidth, height: newHeight } = calculateDimensions(
            img.width,
            img.height,
            config.maxWidth,
            config.maxHeight,
          )

          // Crear canvas
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          if (!ctx) {
            resolve({
              success: false,
              error: "No se pudo crear el contexto del canvas",
            })
            return
          }

          // Configurar canvas
          canvas.width = newWidth
          canvas.height = newHeight

          // Configurar calidad de renderizado
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, newWidth, newHeight)

          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({
                  success: false,
                  error: "Error al generar la imagen comprimida",
                })
                return
              }

              // Crear nuevo archivo
              const extension = config.format === "webp" ? "webp" : "jpg"
              const fileName = file.name.replace(/\.[^/.]+$/, `.${extension}`)
              const compressedFile = new File([blob], fileName, {
                type: `image/${config.format}`,
                lastModified: Date.now(),
              })

              // Calcular ratio de compresión
              const compressionRatio = ((file.size - compressedFile.size) / file.size) * 100

              resolve({
                success: true,
                file: compressedFile,
                originalSize: file.size,
                compressedSize: compressedFile.size,
                compressionRatio: Math.round(compressionRatio * 100) / 100,
              })
            },
            `image/${config.format}`,
            config.quality,
          )
        } catch (error) {
          console.error("Error al procesar imagen:", error)
          resolve({
            success: false,
            error: "Error al procesar la imagen",
          })
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl)
        resolve({
          success: false,
          error: "Error al cargar la imagen",
        })
      }

      img.src = imageUrl
    })
  } catch (error) {
    console.error("Error inesperado al redimensionar imagen:", error)
    return {
      success: false,
      error: "Error inesperado al procesar la imagen",
    }
  }
}

/**
 * Calcula las nuevas dimensiones manteniendo la proporción
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight }

  // Si la imagen es más pequeña que los límites, no redimensionar
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  // Calcular ratio de aspecto
  const aspectRatio = width / height

  // Redimensionar basado en el límite que se alcance primero
  if (width > maxWidth) {
    width = maxWidth
    height = width / aspectRatio
  }

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  }
}

/**
 * Procesa múltiples imágenes en lote
 */
export async function resizeMultipleImages(
  files: File[],
  options: Partial<ImageResizeOptions> = {},
): Promise<ImageResizeResult[]> {
  const results: ImageResizeResult[] = []

  for (const file of files) {
    const result = await resizeImage(file, options)
    results.push(result)
  }

  return results
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Valida si el navegador soporta el formato WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src =
      "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA"
  })
}
