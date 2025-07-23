"use server"

import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export interface ReservaTemporal {
  id: number
  matricula: string
  empleado_id: number
  fecha_inicio: string
  fecha_fin: string
  observaciones: string | null
  estado: string
  created_at: string
  coches: {
    matricula: string
    marca: string
    modelo: string
  }
  empleados: {
    id: number
    nombre: string
    apellidos: string
    email: string
  }
}

export interface AsignacionPermanente {
  id: number
  matricula: string
  marca: string
  modelo: string
  latitud?: number
  longitud?: number
  asignadoa: string | number
  donante?: boolean
  direccion_actual?: string
  ultima_ubicacion?: string
  empleado?: {
    id: number
    nombre: string
    apellidos: string
    email: string
    telefono?: string
  }
  foto?: string | null
}

export async function obtenerReservasTemporales(): Promise<{
  success: boolean;
  error?: string;
  reservas?: ReservaTemporal[];
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Obtener todas las reservas temporales con información relacionada
    const { data: reservas, error: reservasError } = await supabase
      .from("reservas")
      .select(`
        *,
        coches (
          matricula,
          marca,
          modelo
        ),
        empleados (
          id,
          nombre,
          apellidos,
          email
        )
      `)
      .order('fecha_inicio', { ascending: false })

    if (reservasError) {
      console.error("Error obteniendo reservas temporales:", reservasError)
      return {
        success: false,
        error: "Error al obtener las reservas temporales"
      }
    }

    return {
      success: true,
      reservas: (reservas || []) as ReservaTemporal[]
    }

  } catch (error) {
    console.error("Error en obtenerReservasTemporales:", error)
    return {
      success: false,
      error: "Error inesperado al obtener las reservas temporales"
    }
  }
}

export async function obtenerAsignacionesPermanentes(): Promise<{
  success: boolean;
  error?: string;
  asignaciones?: AsignacionPermanente[];
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Obtener todos los coches asignados (reservas permanentes)
    const { data: coches, error: cochesError } = await supabase
      .from("coches")
      .select("*")
      .not("asignadoa", "is", null)
      .eq("donante", false)

    if (cochesError) {
      console.error("Error al obtener coches asignados:", cochesError)
      return {
        success: false,
        error: "Error al obtener las asignaciones permanentes"
      }
    }

    // Obtener información de empleados
    const { data: empleados, error: empleadosError } = await supabase
      .from("empleados")
      .select("*")

    if (empleadosError) {
      console.error("Error al obtener empleados:", empleadosError)
      return {
        success: false,
        error: "Error al obtener información de empleados"
      }
    }

    // Combinar información de coches con empleados
    const asignaciones = coches.map((coche) => {
      const empleado = empleados.find((emp) => emp.id === Number(coche.asignadoa))
      
      return {
        ...coche,
        empleado: empleado
      }
    })

    return {
      success: true,
      asignaciones: (asignaciones || []) as AsignacionPermanente[]
    }

  } catch (error) {
    console.error("Error en obtenerAsignacionesPermanentes:", error)
    return {
      success: false,
      error: "Error inesperado al obtener las asignaciones permanentes"
    }
  }
}

export async function cancelarReservaTemporal(reservaId: number) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Verificar que el usuario es administrador
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("role")
      .eq('email', session.user.email)
      .single()
    
    if (empleadoError || !empleado || empleado.role !== 'admin') {
      return {
        success: false,
        error: "Acceso no autorizado - Solo administradores pueden cancelar reservas"
      }
    }

    // Verificar que la reserva existe
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .select("*")
      .eq('id', reservaId)
      .single()
    
    if (reservaError || !reserva) {
      return {
        success: false,
        error: "Reserva no encontrada"
      }
    }

    // Solo permitir cancelar reservas activas
    if (reserva.estado !== 'activa') {
      return {
        success: false,
        error: "Solo se pueden cancelar reservas activas"
      }
    }

    // Actualizar el estado de la reserva a cancelada
    const { error: updateError } = await supabase
      .from("reservas")
      .update({ estado: 'cancelada' })
      .eq('id', reservaId)
    
    if (updateError) {
      console.error("Error cancelando reserva temporal:", updateError)
      return {
        success: false,
        error: "Error al cancelar la reserva temporal"
      }
    }

    return {
      success: true,
      message: "Reserva temporal cancelada exitosamente"
    }

  } catch (error) {
    console.error("Error en cancelarReservaTemporal:", error)
    return {
      success: false,
      error: "Error inesperado al cancelar la reserva temporal"
    }
  }
}
