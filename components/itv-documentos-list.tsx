"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type DocumentoITV,
  eliminarDocumentoITV,
  obtenerDocumentosITV,
} from "@/lib/itv-documentos"

type TipoDocumento = "pdf" | "word" | "imagen" | "otro"

function obtenerTipoDocumento(nombre: string): TipoDocumento {
  if (/\.pdf$/i.test(nombre)) return "pdf"
  if (/\.docx?$/i.test(nombre)) return "word"
  if (/\.(jpe?g|png|webp)$/i.test(nombre)) return "imagen"
  return "otro"
}

function DocumentoIcon({ tipo, compacto = false }: { tipo: TipoDocumento; compacto?: boolean }) {
  const etiqueta = tipo === "pdf" ? "PDF" : tipo === "word" ? "W" : ""
  const color = tipo === "pdf" ? "text-red-600" : tipo === "word" ? "text-blue-700" : "text-blue-600"

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${compacto ? "h-5 w-5" : "h-20 w-20"}`}>
      <FileText className={`h-full w-full ${color}`} strokeWidth={compacto ? 2 : 1.35} />
      {etiqueta && (
        <span className={`absolute font-bold leading-none ${color} ${compacto ? "bottom-1 text-[5px]" : "bottom-5 text-xs"}`}>
          {etiqueta}
        </span>
      )}
    </span>
  )
}

interface ITVDocumentosListProps {
  matricula: string
  itvId: number
  isEditing: boolean
  refreshKey?: number
  onError?: (mensaje: string) => void
  className?: string
}

export function ITVDocumentosList({
  matricula,
  itvId,
  isEditing,
  refreshKey = 0,
  onError,
  className,
}: ITVDocumentosListProps) {
  const [documentos, setDocumentos] = useState<DocumentoITV[]>([])
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)

  async function cargarDocumentos() {
    setCargando(true)
    const resultado = await obtenerDocumentosITV(matricula, itvId)
    if (resultado.success) {
      setDocumentos(resultado.documentos || [])
    } else {
      onError?.(resultado.error || "No se pudieron cargar los documentos")
    }
    setCargando(false)
  }

  useEffect(() => {
    void cargarDocumentos()
  }, [matricula, itvId, refreshKey])

  async function handleEliminar(documento: DocumentoITV) {
    if (!window.confirm(`¿Quieres eliminar el documento ${documento.nombre}?`)) return
    setEliminando(documento.ruta)
    const resultado = await eliminarDocumentoITV(matricula, itvId, documento.ruta)
    if (resultado.success) {
      await cargarDocumentos()
    } else {
      onError?.(resultado.error || "No se pudo eliminar el documento")
    }
    setEliminando(null)
  }

  if (cargando) {
    return (
      <div className={cn("flex items-center gap-2 pt-2 text-xs text-gray-500", className)}>
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando documentos...
      </div>
    )
  }

  if (documentos.length === 0) return null

  return (
    <div className={cn("mt-3 min-w-0 border-t border-gray-100 pt-3", className)}>
      <p className="mb-2 text-xs font-medium text-gray-600">Documentos ({documentos.length})</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {documentos.map((documento) => {
          const tipo = obtenerTipoDocumento(documento.nombre)
          const esImagen = tipo === "imagen"

          return (
            <div key={documento.ruta} className="min-w-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50">
              {esImagen && documento.url && (
                <a href={documento.url} target="_blank" rel="noopener noreferrer" title={`Abrir ${documento.nombre}`}>
                  {/* La URL es temporal y externa, por eso no se usa next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={documento.url}
                    alt={`Documento ITV ${documento.nombre}`}
                    className="h-36 w-full bg-white object-contain"
                  />
                </a>
              )}
              {!esImagen && (
                documento.url ? (
                  <a
                    href={documento.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Abrir ${documento.nombre}`}
                    className="flex h-36 items-center justify-center bg-white"
                  >
                    <DocumentoIcon tipo={tipo} />
                  </a>
                ) : (
                  <div className="flex h-36 items-center justify-center bg-white">
                    <DocumentoIcon tipo={tipo} />
                  </div>
                )
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <DocumentoIcon tipo={tipo} compacto />
                  <span className="truncate text-sm" title={documento.nombre}>{documento.nombre}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  {documento.url && (
                    <Button size="sm" variant="ghost" asChild title="Abrir documento">
                      <a href={documento.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Abrir {documento.nombre}</span>
                      </a>
                    </Button>
                  )}
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Eliminar documento"
                      disabled={eliminando === documento.ruta}
                      onClick={() => handleEliminar(documento)}
                    >
                      {eliminando === documento.ruta
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4 text-red-600" />}
                      <span className="sr-only">Eliminar {documento.nombre}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
