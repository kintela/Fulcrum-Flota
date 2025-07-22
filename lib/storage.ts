import { supabase } from "./supabase"
import { resizeImage, formatFileSize } from "./image-utils"

export interface FotoUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface FotosResult {
  success: boolean
  fotos?: string[]
  error?: string
}

/**
 * Sube una foto al bucket de Supabase Storage
 */
export async function subirFoto(
  matricula: string,
  archivo: File,
): Promise<FotoUploadResult & { compressionInfo?: string }> {
  try {
    // Validar archivo
    const validacion = validarArchivoImagen(archivo)
    if (!validacion.valido) {
      return {
        success: false,
        error: validacion.error || "Archivo no válido",
      }
    }

    let archivoFinal = archivo
    let compressionInfo = ""

    // Comprimir imagen si es necesaria (archivos > 500KB)
    if (archivo.size > 500 * 1024) {
      console.log(`Comprimiendo imagen: ${archivo.name} (${formatFileSize(archivo.size)})`)

      const resizeResult = await resizeImage(archivo, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: "jpeg",
      })

      if (resizeResult.success && resizeResult.file) {
        archivoFinal = resizeResult.file
        compressionInfo = `Optimizada: ${formatFileSize(resizeResult.originalSize || 0)} → ${formatFileSize(resizeResult.compressedSize || 0)} (${resizeResult.compressionRatio}% reducción)`
        console.log(compressionInfo)
      } else {
        console.warn("No se pudo comprimir la imagen, subiendo original:", resizeResult.error)
      }
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const extension = archivoFinal.name.split(".").pop()
    const nombreArchivo = `${timestamp}.${extension}`
    const rutaArchivo = `${matricula}/${nombreArchivo}`

    console.log(`Intentando subir archivo: ${rutaArchivo} al bucket coches-fotos`)

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage.from("coches-fotos").upload(rutaArchivo, archivoFinal, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Error detallado al subir foto:", {
        error,
        message: error.message,
        statusCode: error.statusCode,
        rutaArchivo,
        tamañoArchivo: archivoFinal.size,
      })

      // Proporcionar mensajes de error más específicos
      let errorMessage = `Error al subir la foto: ${error.message}`

      if (error.message.includes("Bucket not found")) {
        errorMessage = "El bucket 'coches-fotos' no se encuentra. Verifica la configuración de Supabase Storage."
      } else if (error.message.includes("File size too large")) {
        errorMessage = "El archivo es demasiado grande. Máximo permitido: 20MB."
      } else if (error.message.includes("Invalid file type")) {
        errorMessage = "Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG y WebP."
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "No tienes permisos para subir archivos. Verifica la configuración de RLS."
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    console.log("Archivo subido exitosamente:", data)

    // Obtener URL pública
    const { data: urlData } = supabase.storage.from("coches-fotos").getPublicUrl(rutaArchivo)

    console.log("URL pública generada:", urlData.publicUrl)

    return {
      success: true,
      url: urlData.publicUrl,
      compressionInfo: compressionInfo || undefined,
    }
  } catch (error) {
    console.error("Error inesperado al subir foto:", error)
    return {
      success: false,
      error: `Error inesperado al subir la foto: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}

/**
 * Obtiene todas las fotos de un coche por matrícula
 */
export async function obtenerFotosCoche(matricula: string): Promise<FotosResult> {
  try {
    //console.log(`Obteniendo fotos para matrícula: ${matricula}`)

    const { data, error } = await supabase.storage.from("coches-fotos").list(matricula, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    })

    if (error) {
      console.error("Error al obtener fotos:", error)
      return {
        success: false,
        error: `Error al obtener las fotos: ${error.message}`,
      }
    }

    if (!data || data.length === 0) {
      console.log(`No se encontraron fotos para la matrícula: ${matricula}`)
      return {
        success: true,
        fotos: [],
      }
    }

    //console.log(`Encontradas ${data.length} fotos para ${matricula}:`, data)

    // Generar URLs públicas para todas las fotos
    const fotos = data
      .filter((archivo) => archivo.name && !archivo.name.includes(".emptyFolderPlaceholder"))
      .map((archivo) => {
        const { data: urlData } = supabase.storage.from("coches-fotos").getPublicUrl(`${matricula}/${archivo.name}`)
        return urlData.publicUrl
      })

    //console.log(`URLs generadas para ${matricula}:`, fotos)

    return {
      success: true,
      fotos,
    }
  } catch (error) {
    console.error("Error inesperado al obtener fotos:", error)
    return {
      success: false,
      error: "Error inesperado al obtener las fotos",
    }
  }
}

/**
 * Elimina una foto específica
 */
export async function eliminarFoto(
  matricula: string,
  nombreArchivo: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const rutaArchivo = `${matricula}/${nombreArchivo}`
    console.log(`Eliminando foto: ${rutaArchivo}`)

    const { error } = await supabase.storage.from("coches-fotos").remove([rutaArchivo])

    if (error) {
      console.error("Error al eliminar foto:", error)
      return {
        success: false,
        error: `Error al eliminar la foto: ${error.message}`,
      }
    }

    console.log(`Foto eliminada exitosamente: ${rutaArchivo}`)
    return { success: true }
  } catch (error) {
    console.error("Error inesperado al eliminar foto:", error)
    return {
      success: false,
      error: "Error inesperado al eliminar la foto",
    }
  }
}

/**
 * Valida que el archivo sea una imagen válida
 */
export function validarArchivoImagen(archivo: File): { valido: boolean; error?: string; info?: string } {
  // Verificar tipo de archivo
  const tiposPermitidos = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!tiposPermitidos.includes(archivo.type)) {
    return {
      valido: false,
      error: "Solo se permiten archivos de imagen (JPEG, PNG, WebP)",
    }
  }

  // Verificar tamaño (máximo 20MB para el archivo original, se comprimirá automáticamente)
  const tamañoMaximo = 20 * 1024 * 1024 // 20MB en bytes
  if (archivo.size > tamañoMaximo) {
    return {
      valido: false,
      error: "El archivo no puede superar los 20MB",
    }
  }

  // Información sobre la compresión automática
  const info =
    archivo.size > 2 * 1024 * 1024
      ? `Archivo grande (${formatFileSize(archivo.size)}). Se optimizará automáticamente.`
      : undefined

  return { valido: true, info }
}

/**
 * Función de diagnóstico para verificar la configuración de Supabase Storage
 */
export async function diagnosticarStorage(): Promise<{
  success: boolean
  info: {
    bucketsDisponibles: string[]
    configuracionSupabase: boolean
    permisos: string
  }
  error?: string
}> {
  try {
    console.log("Iniciando diagnóstico de Supabase Storage...")

    // Verificar configuración básica de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log("Variables de entorno:", {
      url: supabaseUrl ? "✓ Configurada" : "✗ Faltante",
      key: supabaseKey ? "✓ Configurada" : "✗ Faltante",
    })

    // Listar buckets disponibles
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error("Error al listar buckets:", bucketsError)
      return {
        success: false,
        info: {
          bucketsDisponibles: [],
          configuracionSupabase: false,
          permisos: "Error al verificar",
        },
        error: `Error al acceder a Storage: ${bucketsError.message}`,
      }
    }

    const bucketsDisponibles = buckets?.map((b) => b.id) || []
    console.log("Buckets disponibles:", bucketsDisponibles)

    // Verificar si el bucket coches-fotos existe
    const bucketExiste = bucketsDisponibles.includes("coches-fotos")
    console.log("Bucket 'coches-fotos' existe:", bucketExiste)

    return {
      success: true,
      info: {
        bucketsDisponibles,
        configuracionSupabase: true,
        permisos: bucketExiste ? "Bucket encontrado" : "Bucket no encontrado",
      },
    }
  } catch (error) {
    console.error("Error en diagnóstico:", error)
    return {
      success: false,
      info: {
        bucketsDisponibles: [],
        configuracionSupabase: false,
        permisos: "Error de conexión",
      },
      error: `Error de diagnóstico: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
