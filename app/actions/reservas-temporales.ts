"use server"

import { supabase } from "@/lib/supabase"
import { enviarEmailInicioReserva } from "@/lib/email"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export interface CrearReservaData {
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  observaciones?: string
}

export async function crearReservaTemporal(data: CrearReservaData) {
  try {
    // Obtener información del usuario logueado
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Buscar el empleado por email
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("id, nombre, apellidos")
      .eq('email', session.user.email)
      .single()
    
    if (empleadoError || !empleado) {
      return {
        success: false,
        error: "No se encontró el empleado asociado a este usuario"
      }
    }

    // Verificar que el coche existe
    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("matricula, marca, modelo, donante")
      .eq('matricula', data.matricula)
      .single()
    
    if (cocheError || !coche) {
      return {
        success: false,
        error: "Vehículo no encontrado"
      }
    }

    // Verificar que no sea un vehículo donante
    if (coche.donante) {
      return {
        success: false,
        error: "No se pueden reservar vehículos donantes"
      }
    }

    // Validar fechas
    const fechaInicio = new Date(data.fecha_inicio)
    const fechaFin = new Date(data.fecha_fin)
    const ahora = new Date()

    if (fechaInicio < ahora) {
      return {
        success: false,
        error: "La fecha de inicio no puede ser anterior a la fecha actual"
      }
    }

    if (fechaFin <= fechaInicio) {
      return {
        success: false,
        error: "La fecha de fin debe ser posterior a la fecha de inicio"
      }
    }

  // Determinar estado inicial: 'pendiente' si todavía no ha comenzado, sino 'activa'
  const estadoInicial = fechaInicio > ahora ? 'pendiente' : 'activa'

  // Crear la reserva temporal
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .insert([
        {
          matricula: data.matricula,
          empleado_id: empleado.id,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          observaciones: data.observaciones || null,
      estado: estadoInicial
        }
      ])
      .select()
      .single()
    
    if (reservaError) {
      console.error("Error creando reserva:", reservaError)
      
      // Verificar si es un error de solapamiento temporal
      if (reservaError.message?.includes('reserva activa para el vehículo')) {
        return {
          success: false,
          error: "Ya existe una reserva activa para este vehículo en el período solicitado"
        }
      }
      
      return {
        success: false,
        error: "Error al crear la reserva temporal"
      }
    }

    return {
      success: true,
      message: `Reserva temporal creada exitosamente para el vehículo ${data.matricula}`,
      reserva: reserva
    }

  } catch (error) {
    console.error("Error en crearReservaTemporal:", error)
    return {
      success: false,
      error: "Error inesperado al crear la reserva temporal"
    }
  }
}

export async function obtenerReservasUsuario() {
  try {
    // Obtener información del usuario logueado
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Buscar el empleado por email
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("id")
      .eq('email', session.user.email)
      .single()
    
    if (empleadoError || !empleado) {
      return {
        success: false,
        error: "No se encontró el empleado asociado a este usuario"
      }
    }

    // Obtener las reservas del usuario con información del coche
    const { data: reservas, error: reservasError } = await supabase
      .from("reservas")
      .select(`
        *,
        coches (
          matricula,
          marca,
          modelo
        )
      `)
      .eq('empleado_id', empleado.id)
      .order('fecha_inicio', { ascending: true })

    if (reservasError) {
      console.error("Error obteniendo reservas:", reservasError)
      return {
        success: false,
        error: "Error al obtener las reservas"
      }
    }

    return {
      success: true,
      reservas: reservas || []
    }

  } catch (error) {
    console.error("Error en obtenerReservasUsuario:", error)
    return {
      success: false,
      error: "Error inesperado al obtener las reservas"
    }
  }
}

export async function cancelarReserva(reservaId: number) {
  try {
    // Obtener información del usuario logueado
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    // Buscar el empleado por email
    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("id")
      .eq('email', session.user.email)
      .single()
    
    if (empleadoError || !empleado) {
      return {
        success: false,
        error: "No se encontró el empleado asociado a este usuario"
      }
    }

    // Verificar que la reserva existe y pertenece al usuario
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .select("*")
      .eq('id', reservaId)
      .eq('empleado_id', empleado.id)
      .single()
    
    if (reservaError || !reserva) {
      return {
        success: false,
        error: "Reserva no encontrada o no autorizada"
      }
    }

  // Solo permitir cancelar reservas activas o pendientes
  if (!(reserva.estado === 'activa' || reserva.estado === 'pendiente')) {
      return {
        success: false,
    error: "Solo se pueden cancelar reservas activas o pendientes"
      }
    }

    // Actualizar el estado de la reserva a cancelada
    const { error: updateError } = await supabase
      .from("reservas")
      .update({ estado: 'cancelada' })
      .eq('id', reservaId)
    
    if (updateError) {
      console.error("Error cancelando reserva:", updateError)
      return {
        success: false,
        error: "Error al cancelar la reserva"
      }
    }

    return {
      success: true,
      message: "Reserva cancelada exitosamente"
    }

  } catch (error) {
    console.error("Error en cancelarReserva:", error)
    return {
      success: false,
      error: "Error inesperado al cancelar la reserva"
    }
  }
}

export async function completarReserva(reservaId: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: 'Usuario no autenticado' }
    }
    const { data: empleado, error: empleadoError } = await supabase
      .from('empleados')
      .select('id')
      .eq('email', session.user.email)
      .single()
    if (empleadoError || !empleado) {
      return { success: false, error: 'No se encontró el empleado asociado a este usuario' }
    }
    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .eq('empleado_id', empleado.id)
      .single()
    if (reservaError || !reserva) {
      return { success: false, error: 'Reserva no encontrada o no autorizada' }
    }
    if (reserva.estado !== 'activa') {
      return { success: false, error: 'Sólo se pueden completar reservas activas' }
    }
    const { error: updateError } = await supabase
      .from('reservas')
      .update({ estado: 'completada' })
      .eq('id', reservaId)
    if (updateError) {
      console.error('Error completando reserva:', updateError)
      return { success: false, error: 'Error al completar la reserva' }
    }
    return { success: true, message: 'Reserva marcada como completada' }
  } catch (error) {
    console.error('Error en completarReserva:', error)
    return { success: false, error: 'Error inesperado al completar la reserva' }
  }
}

export async function verificarDisponibilidad(matricula: string, fechaInicio: string, fechaFin: string) {
  try {
    // Obtener reservas activas o pendientes del vehículo (pendiente = programada futura)
    const { data: reservasActivas, error } = await supabase
      .from('reservas')
      .select('id, fecha_inicio, fecha_fin')
      .eq('matricula', matricula)
      .in('estado', ['activa','pendiente'])

    if (error) {
      console.error('Error verificando disponibilidad:', error)
      return { success: false, error: 'Error al verificar disponibilidad' }
    }

    const inicioSolicitado = new Date(fechaInicio)
    const finSolicitado = new Date(fechaFin)
    const ahora = new Date()

    const conflictos = (reservasActivas || []).filter(r => {
      const inicio = new Date(r.fecha_inicio)
      const fin = new Date(r.fecha_fin)
      // Solape temporal con la solicitud
      const solapa = inicio <= finSolicitado && fin >= inicioSolicitado
      // Reserva activa ya vencida pero no marcada (fin < ahora) -> sigue bloqueando
      const vencidaNoCompletada = fin < ahora && inicio <= ahora
      return solapa || vencidaNoCompletada
    })

    return { success: true, disponible: conflictos.length === 0, conflictos }

  } catch (error) {
    console.error("Error en verificarDisponibilidad:", error)
    return {
      success: false,
      error: "Error inesperado al verificar disponibilidad"
    }
  }
}

// Activar reservas pendientes cuyo inicio ya llegó (cron)
export async function activarReservasPendientes() {
  try {
    const ahora = new Date()
    // Buscar reservas en estado pendiente con fecha_inicio <= ahora
    const { data: pendientes, error } = await supabase
      .from('reservas')
      .select('id, fecha_inicio, fecha_fin, matricula, empleado_id, coches(marca,modelo), empleados(email,nombre,apellidos)')
      .eq('estado', 'pendiente')
      .lte('fecha_inicio', ahora.toISOString())

    if (error) {
      console.error('Error consultando reservas pendientes para activar:', error)
      return { success: false, error: 'Error consultando reservas pendientes' }
    }

    if (!pendientes || pendientes.length === 0) {
      return { success: true, activadas: 0 }
    }

    const ids: number[] = []
    let emailsEnviados = 0
    for (const r of pendientes) {
      try {
        const { error: upErr } = await supabase.from('reservas').update({ estado: 'activa' }).eq('id', r.id)
        if (upErr) {
          console.error('Error activando reserva', r.id, upErr)
          continue
        }
        ids.push(r.id)
        // Enviar email si hay datos
        const email = (r as any).empleados?.email
        const nombre = (r as any).empleados?.nombre || ''
        const coche = (r as any).coches
        if (email && coche) {
          const resEmail = await enviarEmailInicioReserva(
            email,
            nombre,
            { matricula: r.matricula, marca: coche.marca, modelo: coche.modelo },
            new Date(r.fecha_inicio),
            new Date(r.fecha_fin)
          )
          if (resEmail.success) emailsEnviados++
        }
      } catch (e) {
        console.error('Error procesando activación individual', r.id, e)
      }
    }

    return { success: true, activadas: ids.length, ids, emailsEnviados }
  } catch (error) {
    console.error('Error en activarReservasPendientes:', error)
    return { success: false, error: 'Error inesperado activando reservas' }
  }
}
