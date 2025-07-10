import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params
    const body = await request.json()
    const { latitud, longitud, direccion_actual } = body

    console.log("📍 POST ubicación:", { matricula, latitud, longitud, direccion_actual })

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
    if (lat < -90 || lat > 90) {
      return NextResponse.json({ error: "Latitud debe estar entre -90 y 90" }, { status: 400 })
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Longitud debe estar entre -180 y 180" }, { status: 400 })
    }

    // Verificar que el coche existe
    const { data: cocheExistente, error: errorVerificacion } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula)
      .single()

    if (errorVerificacion || !cocheExistente) {
      console.error("Coche no encontrado:", errorVerificacion)
      return NextResponse.json({ error: "Coche no encontrado" }, { status: 404 })
    }

    // Actualizar ubicación del vehículo
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
      console.error("Error actualizando ubicación:", error)
      return NextResponse.json({ error: "Error al actualizar la ubicación en la base de datos" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No se pudo actualizar la ubicación" }, { status: 500 })
    }

    console.log("✅ Ubicación actualizada:", data[0])

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

    console.log("🗑️ DELETE ubicación:", matricula)

    // Verificar que el coche existe
    const { data: cocheExistente, error: errorVerificacion } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula)
      .single()

    if (errorVerificacion || !cocheExistente) {
      console.error("Coche no encontrado:", errorVerificacion)
      return NextResponse.json({ error: "Coche no encontrado" }, { status: 404 })
    }

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
      console.error("Error eliminando ubicación:", error)
      return NextResponse.json({ error: "Error al eliminar la ubicación de la base de datos" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No se pudo eliminar la ubicación" }, { status: 500 })
    }

    console.log("✅ Ubicación eliminada:", data[0])

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

export async function GET(request: NextRequest, { params }: { params: { matricula: string } }) {
  try {
    const { matricula } = params

    console.log("📍 GET ubicación:", matricula)

    const { data, error } = await supabase
      .from("coches")
      .select("matricula, latitud, longitud, direccion_actual, ultima_ubicacion")
      .eq("matricula", matricula)
      .single()

    if (error || !data) {
      console.error("Coche no encontrado:", error)
      return NextResponse.json({ error: "Coche no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("❌ Error en GET /api/coches/[matricula]/ubicacion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
