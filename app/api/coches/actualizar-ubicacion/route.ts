import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { getAuthSession } from '@/lib/get-session'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getAuthSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { matricula, latitud, longitud, precision, timestamp } = await request.json()

    // Validar datos requeridos
    if (!matricula || typeof latitud !== 'number' || typeof longitud !== 'number') {
      return NextResponse.json(
        { error: 'Matrícula, latitud y longitud son requeridos' },
        { status: 400 }
      )
    }

    // Validar que la matrícula existe
    const { data: coche, error: cocheError } = await supabase
      .from('coches')
      .select('matricula, marca, modelo')
      .eq('matricula', matricula)
      .single()

    if (cocheError || !coche) {
      return NextResponse.json(
        { error: `Vehículo con matrícula ${matricula} no encontrado` },
        { status: 404 }
      )
    }

    // Actualizar la ubicación del coche
    const { error: updateError } = await supabase
      .from('coches')
      .update({
        latitud: latitud,
        longitud: longitud,
        ultima_ubicacion: timestamp || new Date().toISOString()
      })
      .eq('matricula', matricula)

    if (updateError) {
      console.error('Error actualizando ubicación:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la ubicación del vehículo' },
        { status: 500 }
      )
    }

    console.log(`📍 Ubicación actualizada para ${matricula} por ${session.user.email}:`, {
      latitud,
      longitud,
      precision
    })

    return NextResponse.json({
      success: true,
      message: `Ubicación actualizada correctamente para ${matricula}`,
      data: {
        matricula,
        marca: coche.marca,
        modelo: coche.modelo,
        latitud,
        longitud,
        precision,
        timestamp,
        actualizadoPor: session.user.email
      }
    })

  } catch (error) {
    console.error('Error en actualizar-ubicacion:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
