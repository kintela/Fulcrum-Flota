import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const body = await request.json()

    console.log("📍 POST /api/coches/[matricula]/ubicacion - Datos recibidos:", {
      matricula,
      body,
    })

    const { latitud, longitud, direccion_actual } = body

    // Validar datos requeridos
    if (!latitud || !longitud) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    // Validar que sean números válidos
    const lat = Number.parseFloat(latitud)
    const lng = Number.parseFloat(longitud)

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Latitud y longitud deben ser números válidos" }, { status: 400 })
    }

    // Validar rangos de coordenadas
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Coordenadas fuera de rango válido" }, { status: 400 })
    }

    // Actualizar en la base de datos
    const { data, error } = await supabase
      .from("coches")
      .update({
        latitud: lat,
        longitud: lng,
        direccion_actual: direccion_actual || null,
        ultima_ubicacion: new Date().toISOString(),
      })
      .eq("matricula", matricula)
      .select()

    if (error) {
      console.error("❌ Error actualizando ubicación:", error)
      return NextResponse.json({ error: "Error al actualizar la ubicación en la base de datos" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    console.log("✅ Ubicación actualizada exitosamente:", data[0])

    return NextResponse.json({
      success: true,
      message: "Ubicación actualizada correctamente",
      data: data[0],
    })
  } catch (error) {
    console.error("❌ Error en POST /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params

    console.log("🗑️ DELETE /api/coches/[matricula]/ubicacion - Matrícula:", matricula)

    // Eliminar ubicación (establecer como null)
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
      console.error("❌ Error eliminando ubicación:", error)
      return NextResponse.json({ error: "Error al eliminar la ubicación de la base de datos" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }

    console.log("✅ Ubicación eliminada exitosamente:", data[0])

    return NextResponse.json({
      success: true,
      message: "Ubicación eliminada correctamente",
      data: data[0],
    })
  } catch (error) {
    console.error("❌ Error en DELETE /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
