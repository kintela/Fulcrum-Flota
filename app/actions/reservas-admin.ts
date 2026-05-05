"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { notificarQuejaReservaAdministradores } from "@/lib/reserva-quejas"

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
    
    const roleValue = String(empleado?.role || '').toLowerCase()
    const isAdmin = roleValue === 'admin' || roleValue === 'administrador'

    if (empleadoError || !empleado || !isAdmin) {
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

    // Un administrador puede cancelar cualquier reserva no finalizada
    if (reserva.estado === 'cancelada' || reserva.estado === 'completada') {
      return {
        success: false,
        error: "No se pueden cancelar reservas ya finalizadas"
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

export async function completarReservaTemporalAdmin(
  reservaId: number,
  observacion?: string,
  queja?: string,
  estadoLimpieza?: "bien" | "regular" | "mal"
) {
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

    const roleValue = String(empleado?.role || '').toLowerCase()
    const isAdmin = roleValue === 'admin' || roleValue === 'administrador'

    if (empleadoError || !empleado || !isAdmin) {
      return {
        success: false,
        error: "Acceso no autorizado - Solo administradores pueden completar reservas"
      }
    }

    // Verificar que la reserva existe
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .select(`
        id,
        estado,
        matricula,
        fecha_inicio,
        fecha_fin,
        observaciones,
        quejas,
        coches (
          matricula,
          marca,
          modelo
        ),
        empleados (
          nombre,
          apellidos,
          email
        )
      `)
      .eq('id', reservaId)
      .single()

    if (reservaError || !reserva) {
      return {
        success: false,
        error: "Reserva no encontrada"
      }
    }

    // Solo permitir completar reservas activas o vencidas
    if (reserva.estado !== 'activa' && reserva.estado !== 'vencida') {
      return {
        success: false,
        error: "Solo se pueden completar reservas activas o vencidas"
      }
    }

    const fechaFin = new Date(reserva.fecha_fin)
    if (isNaN(fechaFin.getTime())) {
      return {
        success: false,
        error: "La reserva tiene una fecha de fin inválida"
      }
    }

    if (fechaFin > new Date()) {
      return {
        success: false,
        error: "Solo se pueden completar reservas vencidas"
      }
    }

    const updateData: any = { estado: 'completada' }
    const obs = observacion?.trim()
    if (obs) {
      const anterior = reserva.observaciones ? String(reserva.observaciones).trim() : ''
      updateData.observaciones = anterior
        ? `${anterior}\n${obs}`
        : obs
    }
    const q = queja?.trim()
    if (q) {
      const anteriorQuejas = reserva.quejas ? String(reserva.quejas).trim() : ''
      updateData.quejas = anteriorQuejas
        ? `${anteriorQuejas}\n${q}`
        : q
    }
    if (estadoLimpieza && ["bien", "regular", "mal"].includes(estadoLimpieza)) {
      updateData.limpieza = estadoLimpieza
    }

    const { error: updateError } = await supabase
      .from("reservas")
      .update(updateData)
      .eq('id', reservaId)

    if (updateError) {
      console.error("Error completando reserva temporal:", updateError)
      return {
        success: false,
        error: "Error al completar la reserva temporal"
      }
    }

    if (q) {
      const { data: adminReporter } = await supabase
        .from("empleados")
        .select("nombre, apellidos, email")
        .eq("email", session.user.email)
        .maybeSingle()

      const payload = {
        accion: "completada",
        queja: q,
        observacion: obs || null,
        estadoLimpieza: estadoLimpieza || null,
        reserva: reserva as any,
        reportadaPor: adminReporter || { email: session.user.email },
      } as const

      void notificarQuejaReservaAdministradores(payload)
        .then((notificacion) => {
          if (!notificacion.success) {
            console.error(`❌ No se pudo notificar la queja de la reserva ${reservaId}:`, notificacion.error)
          }
        })
        .catch((error) => {
          console.error(`❌ Error inesperado notificando la queja de la reserva ${reservaId}:`, error)
        })
    }

    return {
      success: true,
      message: "Reserva temporal marcada como completada"
    }

  } catch (error) {
    console.error("Error en completarReservaTemporalAdmin:", error)
    return {
      success: false,
      error: "Error inesperado al completar la reserva temporal"
    }
  }
}
