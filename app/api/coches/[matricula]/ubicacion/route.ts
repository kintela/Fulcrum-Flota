import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const { latitud, longitud, direccion_actual } = await request.json()

    if (!matricula) {
      return NextResponse.json({ error: "Matrícula requerida" }, { status: 400 })
    }

    if (!latitud || !longitud) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    const supabase = createClient()

    // Actualizar la ubicación del coche
    const { data, error } = await supabase
      .from("coches")
      .update({
        latitud,
        longitud,
        direccion_actual,
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

    if (!matricula) {
      return NextResponse.json({ error: "Matrícula requerida" }, { status: 400 })
    }

    const supabase = createClient()

    // Eliminar la ubicación del coche
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
