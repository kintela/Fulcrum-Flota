import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const { latitud, longitud, direccion_actual } = await request.json()

    // Validar datos
    if (!latitud || !longitud) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    if (isNaN(Number(latitud)) || isNaN(Number(longitud))) {
      return NextResponse.json({ error: "Latitud y longitud deben ser números válidos" }, { status: 400 })
    }

    const supabase = createClient()

    // Actualizar ubicación del vehículo
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
      return NextResponse.json({ error: "Error al actualizar la ubicación" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Ubicación actualizada correctamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en POST /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const supabase = createClient()

    // Eliminar ubicación del vehículo
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
      return NextResponse.json({ error: "Error al eliminar la ubicación" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Ubicación eliminada correctamente",
      data: data[0],
    })
  } catch (error) {
    console.error("Error en DELETE /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const supabase = createClient()

    // Obtener ubicación del vehículo
    const { data, error } = await supabase
      .from("coches")
      .select("matricula, latitud, longitud, direccion_actual, ultima_ubicacion")
      .eq("matricula", matricula)
      .single()

    if (error) {
      console.error("Error obteniendo ubicación:", error)
      return NextResponse.json({ error: "Error al obtener la ubicación" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error en GET /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
