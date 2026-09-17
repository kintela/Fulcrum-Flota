import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import {
  ITV_DOCUMENTOS_BUCKET,
  obtenerRutaDocumentosITV,
} from "@/lib/itv-documentos-config"

function parametrosValidos(matricula: unknown, itvId: unknown): itvId is number {
  return typeof matricula === "string"
    && matricula.trim().length > 0
    && typeof itvId === "number"
    && Number.isInteger(itvId)
    && itvId > 0
}

export async function GET(request: NextRequest) {
  const matricula = request.nextUrl.searchParams.get("matricula") || ""
  const itvId = Number(request.nextUrl.searchParams.get("itvId"))
  if (!parametrosValidos(matricula, itvId)) {
    return NextResponse.json({ error: "Matrícula o revisión ITV no válidas" }, { status: 400 })
  }

  const carpeta = obtenerRutaDocumentosITV(matricula, itvId)
  const { data, error } = await supabaseServer.storage.from(ITV_DOCUMENTOS_BUCKET).list(carpeta, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const archivos = (data || []).filter(
    (archivo) => archivo.name && archivo.name !== ".emptyFolderPlaceholder" && archivo.id,
  )
  const documentos = await Promise.all(archivos.map(async (archivo) => {
    const ruta = `${carpeta}/${archivo.name}`
    const { data: enlace, error: enlaceError } = await supabaseServer.storage
      .from(ITV_DOCUMENTOS_BUCKET)
      .createSignedUrl(ruta, 60 * 60)

    return {
      nombre: archivo.name.replace(/^\d+-[a-z0-9]+-/, ""),
      ruta,
      url: enlaceError ? "" : enlace.signedUrl,
      tamano: archivo.metadata?.size,
      creadoEn: archivo.created_at,
    }
  }))

  return NextResponse.json({ documentos })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const matricula = body.matricula
  const itvId = Number(body.itvId)
  const nombre = typeof body.nombre === "string" ? body.nombre : ""
  if (!parametrosValidos(matricula, itvId) || !/^[a-zA-Z0-9_.-]+$/.test(nombre)) {
    return NextResponse.json({ error: "Datos del documento no válidos" }, { status: 400 })
  }

  const ruta = `${obtenerRutaDocumentosITV(matricula, itvId)}/${nombre}`
  const { data, error } = await supabaseServer.storage
    .from(ITV_DOCUMENTOS_BUCKET)
    .createSignedUploadUrl(ruta)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ruta, token: data.token })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const matricula = body.matricula
  const itvId = Number(body.itvId)
  if (!parametrosValidos(matricula, itvId)) {
    return NextResponse.json({ error: "Matrícula o revisión ITV no válidas" }, { status: 400 })
  }

  const carpeta = obtenerRutaDocumentosITV(matricula, itvId)
  let rutas: string[] = []

  if (body.eliminarTodos === true) {
    const { data, error } = await supabaseServer.storage.from(ITV_DOCUMENTOS_BUCKET).list(carpeta, { limit: 100 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rutas = (data || [])
      .filter((archivo) => archivo.name && archivo.name !== ".emptyFolderPlaceholder" && archivo.id)
      .map((archivo) => `${carpeta}/${archivo.name}`)
  } else if (typeof body.ruta === "string" && body.ruta.startsWith(`${carpeta}/`)) {
    rutas = [body.ruta]
  } else {
    return NextResponse.json({ error: "La ruta no pertenece a esta revisión ITV" }, { status: 400 })
  }

  if (rutas.length > 0) {
    const { error } = await supabaseServer.storage.from(ITV_DOCUMENTOS_BUCKET).remove(rutas)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
