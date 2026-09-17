import { supabase } from "./supabase"
import {
  ITV_DOCUMENTO_MAX_BYTES,
  ITV_DOCUMENTOS_BUCKET,
  obtenerRutaDocumentosITV,
} from "./itv-documentos-config"

export { obtenerRutaDocumentosITV } from "./itv-documentos-config"

const TIPOS_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]

export interface DocumentoITV {
  nombre: string
  ruta: string
  url: string
  tamano?: number
  creadoEn?: string
}

export interface ResultadoDocumentosITV {
  success: boolean
  documentos?: DocumentoITV[]
  error?: string
}

function limpiarNombreArchivo(nombre: string) {
  const ultimoPunto = nombre.lastIndexOf(".")
  const base = ultimoPunto > 0 ? nombre.slice(0, ultimoPunto) : nombre
  const extension = ultimoPunto > 0 ? nombre.slice(ultimoPunto).toLowerCase() : ""
  const baseLimpia = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")

  return `${baseLimpia || "documento"}${extension}`
}

export function validarDocumentoITV(archivo: File): { valido: boolean; error?: string } {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return {
      valido: false,
      error: "Solo se permiten documentos PDF, Word o imágenes JPEG, PNG y WebP",
    }
  }

  if (archivo.size > ITV_DOCUMENTO_MAX_BYTES) {
    return { valido: false, error: "El archivo no puede superar los 20 MB" }
  }

  return { valido: true }
}

export async function subirDocumentoITV(matricula: string, itvId: number, archivo: File) {
  const validacion = validarDocumentoITV(archivo)
  if (!validacion.valido) return { success: false, error: validacion.error }

  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${limpiarNombreArchivo(archivo.name)}`
  const respuestaFirma = await fetch("/api/itv-documentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matricula, itvId, nombre }),
  })
  const firma = await respuestaFirma.json()
  if (!respuestaFirma.ok) {
    return { success: false, error: `No se pudo preparar la subida de ${archivo.name}: ${firma.error}` }
  }

  const { ruta, token } = firma as { ruta: string; token: string }
  const { error } = await supabase.storage.from(ITV_DOCUMENTOS_BUCKET).uploadToSignedUrl(ruta, token, archivo, {
    cacheControl: "3600",
    contentType: archivo.type,
  })

  if (error) {
    const mensaje = error.message.includes("Bucket not found")
      ? `El bucket '${ITV_DOCUMENTOS_BUCKET}' no existe o no está configurado`
      : error.message
    return { success: false, error: `No se pudo subir ${archivo.name}: ${mensaje}` }
  }

  return { success: true, ruta }
}

export async function subirDocumentosITV(matricula: string, itvId: number, archivos: File[]) {
  const resultados = await Promise.all(
    archivos.map(async (archivo) => ({
      archivo,
      resultado: await subirDocumentoITV(matricula, itvId, archivo),
    })),
  )

  const errores = resultados
    .filter(({ resultado }) => !resultado.success)
    .map(({ archivo, resultado }) => resultado.error || `No se pudo subir ${archivo.name}`)

  return {
    success: errores.length === 0,
    subidos: resultados.length - errores.length,
    errores,
  }
}

export async function obtenerDocumentosITV(matricula: string, itvId: number): Promise<ResultadoDocumentosITV> {
  const parametros = new URLSearchParams({ matricula, itvId: String(itvId) })
  const respuesta = await fetch(`/api/itv-documentos?${parametros.toString()}`)
  const data = await respuesta.json()
  return respuesta.ok
    ? { success: true, documentos: data.documentos || [] }
    : { success: false, error: `No se pudieron cargar los documentos: ${data.error}` }
}

export async function eliminarDocumentoITV(matricula: string, itvId: number, ruta: string) {
  const carpetaEsperada = `${obtenerRutaDocumentosITV(matricula, itvId)}/`
  if (!ruta.startsWith(carpetaEsperada)) {
    return { success: false, error: "La ruta del documento no pertenece a esta revisión ITV" }
  }

  const respuesta = await fetch("/api/itv-documentos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matricula, itvId, ruta }),
  })
  const data = await respuesta.json()
  return respuesta.ok ? { success: true } : { success: false, error: `No se pudo eliminar el documento: ${data.error}` }
}

export async function eliminarDocumentosITV(matricula: string, itvId: number) {
  const respuesta = await fetch("/api/itv-documentos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matricula, itvId, eliminarTodos: true }),
  })
  const data = await respuesta.json()
  return respuesta.ok
    ? { success: true }
    : { success: false, error: `No se pudieron eliminar los documentos de la ITV: ${data.error}` }
}
