import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const body = await request.json()
    const { latitud, longitud, direccion_actual } = body

    // Validar datos
    if (!latitud || !longitud) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    // Validar rangos de coordenadas
    if (latitud < -90 || latitud > 90) {
      return NextResponse.json({ error: "Latitud debe estar entre -90 y 90" }, { status: 400 })
    }

    if (longitud < -180 || longitud > 180) {
      return NextResponse.json({ error: "Longitud debe estar entre -180 y 180" }, { status: 400 })
    }

    const supabase = createClient()

    // Verificar que el coche existe
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula)
      .single()

    if (cocheError || !coche) {
      return NextResponse.json({ error: "Coche no encontrado" }, { status: 404 })
    }

    // Actualizar ubicación
    const { data, error } = await supabase
      .from("coches")
      .update({
        latitud: Number(latitud),
        longitud: Number(longitud),
        direccion_actual: direccion_actual || null,
        ultima_ubicacion: new Date().toISOString(),
      })
      .eq("matricula", matricula)
      .select()

    if (error) {
      console.error("Error actualizando ubicación:", error)
      return NextResponse.json({ error: "Error al actualizar ubicación" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Ubicación actualizada correctamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en API de ubicación:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const supabase = createClient()

    // Verificar que el coche existe
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula)
      .single()

    if (cocheError || !coche) {
      return NextResponse.json({ error: "Coche no encontrado" }, { status: 404 })
    }

    // Eliminar ubicación
    const { data, error } = await supabase
      .from("coches")
      .update({
        latitud: null,
        longitud: null,
        direccion_actual: null,
        ultima_ubicacion: null,
      })
      .eq("matricula", matricula)
      .select()

    if (error) {
      console.error("Error eliminando ubicación:", error)
      return NextResponse.json({ error: "Error al eliminar ubicación" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Ubicación eliminada correctamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en API de ubicación:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const supabase = createClient()

    const { data, error } = await supabase
      .from("coches")
      .select("matricula, latitud, longitud, direccion_actual, ultima_ubicacion")
      .eq("matricula", matricula)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Coche no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error obteniendo ubicación:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
