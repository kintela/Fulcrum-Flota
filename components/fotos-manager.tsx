"use client"

import type React from "react"
import { diagnosticarStorage } from "@/lib/storage" // Import the missing function

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Upload, ImageIcon, Trash2, Eye, AlertCircle, CheckCircle, Loader2, Info } from "lucide-react"
import { subirFoto, obtenerFotosCoche, eliminarFoto, validarArchivoImagen } from "@/lib/storage"
import { formatFileSize } from "@/lib/image-utils"

interface FotosManagerProps {
  matricula: string
  isEditing?: boolean
  modoEdicion?: boolean // Mantener ambas props para compatibilidad
}

export function FotosManager({ matricula, isEditing = false, modoEdicion = false }: FotosManagerProps) {
  // Usar cualquiera de las dos props para determinar si estamos en modo edición
  const enModoEdicion = isEditing || modoEdicion

  const [fotos, setFotos] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [fotoSeleccionada, setFotoSeleccionada] = useState<string | null>(null)
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([])
  const [infoCompresion, setInfoCompresion] = useState<string[]>([])
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false)
  const [diagnostico, setDiagnostico] = useState<any>(null)

  // Cargar fotos al montar el componente
  useEffect(() => {
    cargarFotos()
  }, [matricula])

  const cargarFotos = async () => {
    setCargando(true)
    setError(null)

    const resultado = await obtenerFotosCoche(matricula)

    if (resultado.success) {
      setFotos(resultado.fotos || [])
    } else {
      setError(resultado.error || "Error al cargar las fotos")
    }

    setCargando(false)
  }

  const ejecutarDiagnostico = async () => {
    setMostrarDiagnostico(true)
    const resultado = await diagnosticarStorage()
    setDiagnostico(resultado)
  }

  const manejarSeleccionArchivos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(event.target.files || [])
    const archivosValidos: File[] = []
    const errores: string[] = []

    archivos.forEach((archivo) => {
      const validacion = validarArchivoImagen(archivo)
      if (validacion.valido) {
        archivosValidos.push(archivo)
      } else {
        errores.push(`${archivo.name}: ${validacion.error}`)
      }
    })

    if (errores.length > 0) {
      setError(`Archivos no válidos:\n${errores.join("\n")}`)
    } else {
      setError(null)
    }

    setArchivosSeleccionados(archivosValidos)
  }

  const subirArchivos = async () => {
    if (archivosSeleccionados.length === 0) return

    setSubiendo(true)
    setError(null)
    setExito(null)
    setInfoCompresion([])

    const resultados = []
    const infosCompresion: string[] = []

    for (const archivo of archivosSeleccionados) {
      console.log(`Subiendo archivo: ${archivo.name}`)
      const resultado = await subirFoto(matricula, archivo)
      resultados.push(resultado)

      if (resultado.compressionInfo) {
        infosCompresion.push(`${archivo.name}: ${resultado.compressionInfo}`)
      }
    }

    const exitosos = resultados.filter((r) => r.success)
    const fallidos = resultados.filter((r) => !r.success)

    if (exitosos.length > 0) {
      setExito(`${exitosos.length} foto(s) subida(s) correctamente`)
      setInfoCompresion(infosCompresion)
      await cargarFotos() // Recargar la lista de fotos
    }

    if (fallidos.length > 0) {
      const errores = fallidos.map((r) => r.error).join(", ")
      setError(`Error en ${fallidos.length} archivo(s): ${errores}`)
    }

    setSubiendo(false)
    setArchivosSeleccionados([])

    // Limpiar el input
    const input = document.getElementById("foto-input") as HTMLInputElement
    if (input) input.value = ""
  }

  const eliminarFotoHandler = async (url: string) => {
    const nombreArchivo = url.split("/").pop()
    if (!nombreArchivo) return

    const confirmacion = window.confirm("¿Estás seguro de que quieres eliminar esta foto?")
    if (!confirmacion) return

    const resultado = await eliminarFoto(matricula, nombreArchivo)

    if (resultado.success) {
      setExito("Foto eliminada correctamente")
      await cargarFotos()
    } else {
      setError(resultado.error || "Error al eliminar la foto")
    }
  }

  const limpiarMensajes = () => {
    setError(null)
    setExito(null)
    setInfoCompresion([])
  }

  if (cargando) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando fotos...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Fotos del Vehículo
          {fotos.length > 0 && <Badge variant="secondary">{fotos.length}</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mensajes de estado */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">
              {error}
              <Button variant="ghost" size="sm" className="ml-2" onClick={limpiarMensajes}>
                Cerrar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {exito && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {exito}
              <Button variant="ghost" size="sm" className="ml-2" onClick={limpiarMensajes}>
                Cerrar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Información de compresión */}
        {infoCompresion.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Optimización aplicada:</div>
              <ul className="text-sm space-y-1">
                {infoCompresion.map((info, index) => (
                  <li key={index} className="font-mono">
                    {info}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Formulario de subida (solo en modo edición) */}
        {enModoEdicion && (
          <div className="space-y-4">
            <Separator />
            <div>
              <Label htmlFor="foto-input">Seleccionar fotos</Label>
              <Input
                id="foto-input"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={manejarSeleccionArchivos}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Formatos permitidos: JPEG, PNG, WebP. Máximo 20MB por archivo.
              </p>
            </div>

            {/* Vista previa de archivos seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos seleccionados:</Label>
                <div className="space-y-2">
                  {archivosSeleccionados.map((archivo, index) => {
                    const validacion = validarArchivoImagen(archivo)
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{archivo.name}</span>
                          <Badge variant="outline">{formatFileSize(archivo.size)}</Badge>
                          {validacion.info && <Badge variant="secondary">Se optimizará</Badge>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={subirArchivos}
              disabled={archivosSeleccionados.length === 0 || subiendo}
              className="w-full"
            >
              {subiendo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo fotos...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir {archivosSeleccionados.length} foto(s)
                </>
              )}
            </Button>
          </div>
        )}

        <Separator />

        {/* Galería de fotos */}
        {fotos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay fotos disponibles para este vehículo</p>
            {enModoEdicion && <p className="text-sm mt-2">Sube algunas fotos usando el formulario de arriba</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fotos.map((foto, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg border">
                  <img
                    src={foto || "/placeholder.svg"}
                    alt={`Foto ${index + 1} del vehículo ${matricula}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" onClick={() => setFotoSeleccionada(foto)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Foto del vehículo {matricula}</DialogTitle>
                      </DialogHeader>
                      <div className="flex justify-center">
                        <img
                          src={foto || "/placeholder.svg"}
                          alt={`Foto del vehículo ${matricula}`}
                          className="max-w-full max-h-[70vh] object-contain"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>

                  {enModoEdicion && (
                    <Button size="sm" variant="destructive" onClick={() => eliminarFotoHandler(foto)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog de diagnóstico */}
        <Dialog open={mostrarDiagnostico} onOpenChange={setMostrarDiagnostico}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Diagnóstico de Storage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {diagnostico ? (
                <div className="space-y-3">
                  <div>
                    <Label>Estado de la conexión:</Label>
                    <Badge variant={diagnostico.success ? "default" : "destructive"}>
                      {diagnostico.success ? "Conectado" : "Error"}
                    </Badge>
                  </div>

                  <div>
                    <Label>Configuración de Supabase:</Label>
                    <Badge variant={diagnostico.info.configuracionSupabase ? "default" : "destructive"}>
                      {diagnostico.info.configuracionSupabase ? "Correcta" : "Error"}
                    </Badge>
                  </div>

                  <div>
                    <Label>Buckets disponibles:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {diagnostico.info.bucketsDisponibles.map((bucket: string) => (
                        <Badge key={bucket} variant={bucket === "coches-fotos" ? "default" : "outline"}>
                          {bucket}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Estado del bucket 'coches-fotos':</Label>
                    <p className="text-sm text-muted-foreground">{diagnostico.info.permisos}</p>
                  </div>

                  {diagnostico.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{diagnostico.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Ejecutando diagnóstico...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
