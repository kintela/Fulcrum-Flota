import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const body = await request.json()
    const { latitud, longitud, direccion_actual } = body

    if (!latitud || !longitud) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

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
      console.error("Error updating location:", error)
      return NextResponse.json({ error: "Error al actualizar la ubicación" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params

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
      console.error("Error deleting location:", error)
      return NextResponse.json({ error: "Error al eliminar la ubicación" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in DELETE /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
