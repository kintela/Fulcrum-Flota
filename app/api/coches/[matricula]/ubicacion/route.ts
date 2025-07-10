import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { latitud, longitud, direccion_actual } = await request.json()
    const { matricula } = params

    // Actualizar la ubicación del coche
    const { data, error } = await supabase
      .from("coches")
      .update({
        latitud: latitud,
        longitud: longitud,
        direccion_actual: direccion_actual,
        ultima_ubicacion: new Date().toISOString(),
      })
      .eq("matricula", matricula)
      .select()

    if (error) {
      console.error("Error actualizando ubicación:", error)
      return NextResponse.json({ error: "Error al actualizar la ubicación" }, { status: 500 })
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
      return NextResponse.json({ error: "Error al eliminar la ubicación" }, { status: 500 })
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
