import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const body = await request.json()
    const { latitud, longitud, direccion_actual } = body

    // Validar datos
    if (!latitud || !longitud) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    if (isNaN(Number(latitud)) || isNaN(Number(longitud))) {
      return NextResponse.json({ error: "Latitud y longitud deben ser números válidos" }, { status: 400 })
    }

    // Actualizar ubicación en la base de datos
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

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error("Error en POST /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params

    // Eliminar ubicación de la base de datos
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

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error("Error en DELETE /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
