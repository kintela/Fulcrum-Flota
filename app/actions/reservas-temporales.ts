"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { enviarEmailInicioReserva } from "@/lib/email"
import { sendWhatsAppMessage, formatSpanishPhone } from "@/lib/whatsapp"

// Helper para envío WhatsApp inicio (manual únicamente)
async function enviarWhatsappInicioReserva(destino: string, mensaje: string) {
  const to = formatSpanishPhone(destino)
  return await sendWhatsAppMessage({ to, message: mensaje })
}
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export interface CrearReservaData {
  matricula: string
  fecha_inicio: string
  fecha_fin: string
  observaciones?: string
}

interface EmpleadoSesion {
  id: number
  nombre?: string | null
  apellidos?: string | null
  baneado?: boolean | null
  email?: string | null
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase()
}

async function obtenerEmpleadosSesion(session: { user?: { email?: string | null; empleadoId?: number | null } }) {
  if (!session?.user?.email) {
    return {
      success: false as const,
      error: "Usuario no autenticado",
      empleados: [] as EmpleadoSesion[],
      principal: null as EmpleadoSesion | null,
    }
  }

  const emailNormalizado = normalizarEmail(session.user.email)
  const empleadoIdSesion = typeof session.user.empleadoId === "number" ? session.user.empleadoId : null

  const { data: empleadosPorEmail, error: empleadosPorEmailError } = await supabase
    .from("empleados")
    .select("id, nombre, apellidos, baneado, email")
    .ilike("email", emailNormalizado)

  if (empleadosPorEmailError) {
    return {
      success: false as const,
      error: "Error al resolver el empleado del usuario",
      empleados: [] as EmpleadoSesion[],
      principal: null as EmpleadoSesion | null,
    }
  }

  const candidatos: EmpleadoSesion[] = (empleadosPorEmail || []).filter(
    (e) => normalizarEmail(String(e.email || "")) === emailNormalizado,
  )

  if (candidatos.length === 0) {
    const { data: todosEmpleados } = await supabase.from("empleados").select("id, nombre, apellidos, baneado, email")
    for (const empleado of todosEmpleados || []) {
      if (normalizarEmail(String(empleado.email || "")) === emailNormalizado) {
        candidatos.push(empleado as EmpleadoSesion)
      }
    }
  }

  if (empleadoIdSesion !== null && !candidatos.some((e) => e.id === empleadoIdSesion)) {
    const { data: empleadoSesion } = await supabase
      .from("empleados")
      .select("id, nombre, apellidos, baneado, email")
      .eq("id", empleadoIdSesion)
      .maybeSingle()

    if (empleadoSesion) {
      candidatos.push(empleadoSesion as EmpleadoSesion)
    }
  }

  const empleados = Array.from(new Map(candidatos.map((e) => [e.id, e])).values()).sort((a, b) => a.id - b.id)

  if (empleados.length === 0) {
    return {
      success: false as const,
      error: "No se encontró el empleado asociado a este usuario",
      empleados,
      principal: null as EmpleadoSesion | null,
    }
  }

  const principal = (empleadoIdSesion ? empleados.find((e) => e.id === empleadoIdSesion) : undefined) || empleados[0]

  return {
    success: true as const,
    error: null as string | null,
    empleados,
    principal,
  }
}

async function obtenerReservaUsuarioPorId(
  reservaId: number,
  empleadoIds: number[],
  emailNormalizado: string,
) {
  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select(`
      *,
      empleados (
        id,
        email
      )
    `)
    .eq("id", reservaId)
    .single()

  if (reservaError || !reserva) {
    return {
      success: false as const,
      error: "Reserva no encontrada o no autorizada",
      reserva: null,
    }
  }

  const empleadoIdReserva = Number((reserva as any).empleado_id)
  const emailReserva = normalizarEmail(String((reserva as any).empleados?.email || ""))
  const autorizada = empleadoIds.includes(empleadoIdReserva) || (emailReserva !== "" && emailReserva === emailNormalizado)

  if (!autorizada) {
    return {
      success: false as const,
      error: "Reserva no encontrada o no autorizada",
      reserva: null,
    }
  }

  return {
    success: true as const,
    error: null as string | null,
    reserva,
  }
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

    const empleadosSesion = await obtenerEmpleadosSesion(session)
    if (!empleadosSesion.success || !empleadosSesion.principal) {
      return {
        success: false,
        error: empleadosSesion.error || "No se encontró el empleado asociado a este usuario"
      }
    }
    const empleado = empleadosSesion.principal

    if (empleado.baneado) {
      return {
        success: false,
        error: "Tu usuario está baneado y no puede crear nuevas reservas"
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

    const empleadosSesion = await obtenerEmpleadosSesion(session)
    if (!empleadosSesion.success || empleadosSesion.empleados.length === 0) {
      return {
        success: false,
        error: empleadosSesion.error || "No se encontró el empleado asociado a este usuario"
      }
    }
    const emailNormalizado = normalizarEmail(String(session.user.email || ""))
    const empleadoIds = empleadosSesion.empleados.map((e) => e.id)

    // Obtener las reservas del usuario con información del coche
    const { data: reservasPorId, error: reservasError } = await supabase
      .from("reservas")
      .select(`
        *,
        coches (
          matricula,
          marca,
          modelo,
          latitud,
          longitud,
          direccion_actual
        )
      `)
      .in("empleado_id", empleadoIds)
      .order('fecha_inicio', { ascending: true })

    if (reservasError) {
      console.error("Error obteniendo reservas:", reservasError)
      return {
        success: false,
        error: "Error al obtener las reservas"
      }
    }

    let reservas = reservasPorId || []

    // Fallback defensivo: por si el empleado_id del usuario y el de la reserva no encajan,
    // recuperar por email del empleado propietario de la reserva.
    if (reservas.length === 0) {
      const { data: reservasConEmpleado, error: reservasConEmpleadoError } = await supabase
        .from("reservas")
        .select(`
          *,
          coches (
            matricula,
            marca,
            modelo,
            latitud,
            longitud,
            direccion_actual
          ),
          empleados (
            id,
            email
          )
        `)
        .order("fecha_inicio", { ascending: true })

      if (!reservasConEmpleadoError && reservasConEmpleado) {
        reservas = reservasConEmpleado.filter(
          (reserva: any) => normalizarEmail(String(reserva?.empleados?.email || "")) === emailNormalizado,
        )
      }
    }

    return {
      success: true,
      reservas: reservas || []
    }

  } catch (error) {
    console.error("Error en obtenerReservasUsuario:", error)
    const message = error instanceof Error ? error.message : ""
    if (
      message.includes("SUPABASE_SERVICE_ROLE_KEY no está configurada") ||
      message.includes("NEXT_PUBLIC_SUPABASE_URL no está configurada")
    ) {
      return {
        success: false,
        error: "Error de configuración del servidor en producción (variables de Supabase no definidas)"
      }
    }
    return {
      success: false,
      error: "Error inesperado al obtener las reservas"
    }
  }
}

export async function cancelarReserva(
  reservaId: number,
  observacion?: string,
  queja?: string,
  estadoLimpieza?: "bien" | "regular" | "mal"
) {
  try {
    // Obtener información del usuario logueado
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Usuario no autenticado"
      }
    }

    const empleadosSesion = await obtenerEmpleadosSesion(session)
    if (!empleadosSesion.success || empleadosSesion.empleados.length === 0) {
      return {
        success: false,
        error: empleadosSesion.error || "No se encontró el empleado asociado a este usuario"
      }
    }
    const emailNormalizado = normalizarEmail(String(session.user.email || ""))
    const empleadoIds = empleadosSesion.empleados.map((e) => e.id)

    // Verificar que la reserva existe y pertenece al usuario
    const reservaUsuario = await obtenerReservaUsuarioPorId(reservaId, empleadoIds, emailNormalizado)
    if (!reservaUsuario.success || !reservaUsuario.reserva) {
      return {
        success: false,
        error: reservaUsuario.error || "Reserva no encontrada o no autorizada"
      }
    }
    const reserva = reservaUsuario.reserva as any

    // Solo permitir cancelar reservas activas o pendientes
    if (!(reserva.estado === 'activa' || reserva.estado === 'pendiente')) {
      return {
        success: false,
        error: "Solo se pueden cancelar reservas activas o pendientes"
      }
    }

    const updateData: any = { estado: "cancelada" }
    const obs = observacion?.trim()
    if (obs) {
      const anterior = reserva.observaciones ? String(reserva.observaciones).trim() : ""
      updateData.observaciones = anterior ? `${anterior}\n${obs}` : obs
    }
    const q = queja?.trim()
    if (q) {
      const anteriorQuejas = reserva.quejas ? String(reserva.quejas).trim() : ""
      updateData.quejas = anteriorQuejas ? `${anteriorQuejas}\n${q}` : q
    }
    if (estadoLimpieza && ["bien", "regular", "mal"].includes(estadoLimpieza)) {
      updateData.limpieza = estadoLimpieza
    }

    // Actualizar el estado de la reserva a cancelada
    const { error: updateError } = await supabase
      .from("reservas")
      .update(updateData)
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

export async function completarReserva(
  reservaId: number,
  observacion?: string,
  queja?: string,
  estadoLimpieza?: "bien" | "regular" | "mal"
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: 'Usuario no autenticado' }
    }
    const empleadosSesion = await obtenerEmpleadosSesion(session)
    if (!empleadosSesion.success || empleadosSesion.empleados.length === 0) {
      return { success: false, error: empleadosSesion.error || 'No se encontró el empleado asociado a este usuario' }
    }
    const emailNormalizado = normalizarEmail(String(session.user.email || ""))
    const empleadoIds = empleadosSesion.empleados.map((e) => e.id)
    const reservaUsuario = await obtenerReservaUsuarioPorId(reservaId, empleadoIds, emailNormalizado)
    if (!reservaUsuario.success || !reservaUsuario.reserva) {
      return { success: false, error: reservaUsuario.error || 'Reserva no encontrada o no autorizada' }
    }
    const reserva = reservaUsuario.reserva as any
    if (reserva.estado !== 'activa' && reserva.estado !== 'vencida') {
      return { success: false, error: 'Sólo se pueden completar reservas activas o vencidas' }
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
      .from('reservas')
      .update(updateData)
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

export async function ampliarReservaTemporal(reservaId: number, nuevaFechaFin: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "Usuario no autenticado" }
    }

    const empleadosSesion = await obtenerEmpleadosSesion(session)
    if (!empleadosSesion.success || empleadosSesion.empleados.length === 0) {
      return { success: false, error: empleadosSesion.error || "No se encontró el empleado asociado a este usuario" }
    }
    const emailNormalizado = normalizarEmail(String(session.user.email || ""))
    const empleadoIds = empleadosSesion.empleados.map((e) => e.id)

    const reservaUsuario = await obtenerReservaUsuarioPorId(reservaId, empleadoIds, emailNormalizado)
    if (!reservaUsuario.success || !reservaUsuario.reserva) {
      return { success: false, error: reservaUsuario.error || "Reserva no encontrada o no autorizada" }
    }
    const reserva = reservaUsuario.reserva as any

    if (!(reserva.estado === "pendiente" || reserva.estado === "activa")) {
      return { success: false, error: "Solo se pueden ampliar reservas pendientes o activas" }
    }

    const fechaInicio = new Date(reserva.fecha_inicio)
    const fechaFinActual = new Date(reserva.fecha_fin)
    const fechaFinNueva = new Date(nuevaFechaFin)

    if (reserva.estado === "activa" && fechaFinActual <= new Date()) {
      return { success: false, error: "No se pueden ampliar reservas activas ya vencidas" }
    }

    if (!Number.isFinite(fechaFinNueva.getTime())) {
      return { success: false, error: "La nueva fecha de fin no es válida" }
    }

    if (fechaFinNueva <= fechaFinActual) {
      return { success: false, error: "La nueva fecha de fin debe ser posterior a la actual" }
    }

    if (fechaFinNueva <= fechaInicio) {
      return { success: false, error: "La fecha de fin debe ser posterior a la fecha de inicio" }
    }

    const { data: otrasReservas, error: otrasError } = await supabase
      .from("reservas")
      .select("id, fecha_inicio, fecha_fin, bloqueo_desde")
      .eq("matricula", reserva.matricula)
      .in("estado", ["activa", "pendiente", "vencida"])
      .neq("id", reservaId)

    if (otrasError) {
      console.error("Error verificando reservas para ampliar:", otrasError)
      return { success: false, error: "Error al comprobar disponibilidad" }
    }

    const hayConflicto = (otrasReservas || []).some((r) => {
      const inicioBloqueo = r.bloqueo_desde ? new Date(r.bloqueo_desde) : new Date(r.fecha_inicio)
      const fin = new Date(r.fecha_fin)
      return inicioBloqueo < fechaFinNueva && fin > fechaInicio
    })

    if (hayConflicto) {
      return { success: false, error: "No se puede ampliar la reserva porque hay otra reserva en ese período" }
    }

    const { error: updateError } = await supabase
      .from("reservas")
      .update({ fecha_fin: fechaFinNueva.toISOString() })
      .eq("id", reservaId)

    if (updateError) {
      console.error("Error ampliando reserva:", updateError)
      return { success: false, error: "Error al ampliar la reserva" }
    }

    return { success: true, message: "Plazo de reserva ampliado" }
  } catch (error) {
    console.error("Error en ampliarReservaTemporal:", error)
    return { success: false, error: "Error inesperado al ampliar la reserva" }
  }
}

export async function verificarDisponibilidad(matricula: string, fechaInicio: string, fechaFin: string) {
  try {
    // Obtener reservas activas o pendientes del vehículo (pendiente = programada futura)
    const { data: reservasActivas, error } = await supabase
      .from('reservas')
      .select('id, fecha_inicio, fecha_fin, bloqueo_desde')
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
      const inicioBloqueo = r.bloqueo_desde ? new Date(r.bloqueo_desde) : inicio
      // Ventana de bloqueo: desde bloqueo_desde (o inicio) hasta fin
      const solapa = inicioBloqueo <= finSolicitado && fin >= inicioSolicitado
      // Reserva activa ya vencida pero no marcada (fin < ahora) -> sigue bloqueando
      const vencidaNoCompletada = fin < ahora && inicioBloqueo <= ahora
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

export async function obtenerBloqueosReservasPorMatricula(matricula: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "Usuario no autenticado" as const }
    }

    const { data, error } = await supabase
      .from("reservas")
      .select("fecha_inicio, fecha_fin, bloqueo_desde")
      .eq("matricula", matricula)
      .in("estado", ["activa", "pendiente", "vencida"])

    if (error) {
      console.error("Error obteniendo bloqueos de reservas:", error)
      return { success: false, error: "Error al obtener bloqueos de reservas" as const }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error en obtenerBloqueosReservasPorMatricula:", error)
    return { success: false, error: "Error inesperado al obtener bloqueos" as const }
  }
}

export async function obtenerEstadoReservasPorMatriculas(matriculas: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "Usuario no autenticado" as const }
    }

    const matriculasUnicas = Array.from(new Set((matriculas || []).filter(Boolean)))
    if (matriculasUnicas.length === 0) {
      return { success: true, data: {} as Record<string, any[]> }
    }

    const { data, error } = await supabase
      .from("reservas")
      .select("matricula, estado, fecha_inicio, fecha_fin, bloqueo_desde, margen_bloqueo, empleado_id")
      .in("matricula", matriculasUnicas)
      .in("estado", ["activa", "pendiente", "vencida"])

    if (error) {
      console.error("Error obteniendo estado de reservas por matrículas:", error)
      return { success: false, error: "Error al obtener estado de reservas" as const }
    }

    const agrupado = (data || []).reduce<Record<string, any[]>>((acc, row) => {
      if (!acc[row.matricula]) acc[row.matricula] = []
      acc[row.matricula].push(row)
      return acc
    }, {})

    return { success: true, data: agrupado }
  } catch (error) {
    console.error("Error en obtenerEstadoReservasPorMatriculas:", error)
    return { success: false, error: "Error inesperado al obtener estado de reservas" as const }
  }
}

// Activar reservas pendientes cuyo inicio ya llegó (cron)
export async function activarReservasPendientes(opciones?: { manual?: boolean }) {
  try {
    const ahora = new Date()
    const umbralAviso = new Date(ahora.getTime() + 30 * 60 * 1000) // 30 minutos adelante

    // Buscar reservas en estado pendiente con fecha_inicio <= ahora + 30m
    // Nota: reducimos el SELECT para evitar fallar si ciertos campos no existen todavía (ej: whatsapp)
    const { data: pendientes, error } = await supabase
      .from('reservas')
      .select('id, fecha_inicio, fecha_fin, matricula, empleado_id, notificacion_inicio_reserva_enviada, fecha_notificacion_inicio_reserva, coches(marca,modelo), empleados(email,nombre,apellidos,movil)')
      .eq('estado', 'pendiente')
      .lte('fecha_inicio', umbralAviso.toISOString())

    if (error) {
      console.error('Error consultando reservas pendientes para activar:', error)
      return { success: false, error: 'Error consultando reservas pendientes', details: error.message }
    }

    if (!pendientes || pendientes.length === 0) {
      return { success: true, activadas: 0 }
    }

    const ids: number[] = []
  let emailsEnviados = 0
  let avisosPreviosEnviados = 0
  let whatsappsEnviados = 0
  let whatsappsErrores = 0
  for (const r of pendientes) {
      try {
        const fechaInicio = new Date(r.fecha_inicio)
        const fechaFin = new Date(r.fecha_fin)

        // Activar si ya empezó o está dentro de los próximos 30 minutos
        if (fechaInicio <= umbralAviso) {
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
        if (email && coche && !(r as any).notificacion_inicio_reserva_enviada) {
          const resEmail = await enviarEmailInicioReserva(
            email,
            nombre,
            { matricula: r.matricula, marca: coche.marca, modelo: coche.modelo },
            fechaInicio,
            fechaFin
          )
          if (resEmail.success) {
            emailsEnviados++
            await supabase
              .from('reservas')
              .update({ 
                notificacion_inicio_reserva_enviada: true,
                fecha_notificacion_inicio_reserva: new Date().toISOString()
              })
              .eq('id', r.id)
          }
        }
        // Envío de WhatsApp solo en ejecución manual (no cron) y si hay teléfono
        if (opciones?.manual) {
          // Obtener teléfono del empleado si existe
          const telefono = (r as any).empleados?.movil || null
          if (telefono) {
            const telefonoTrim = String(telefono).trim()
            // Validar formato básico: dígitos opcional + y longitud mínima 7
            if (/^\+?\d{7,15}$/.test(telefonoTrim.replace(/\s|-/g,''))) {
              const msg = `✅ Inicio de tu reserva (${r.matricula})\nInicio: ${new Date(r.fecha_inicio).toLocaleString('es-ES',{ hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}\nFin previsto: ${new Date(r.fecha_fin).toLocaleString('es-ES',{ hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}\nRecuerda marcarla completada al devolver el vehículo.`
              console.log('[ActivarPendientes] Intentando WhatsApp a', telefonoTrim, 'reserva', r.id)
              const wa = await enviarWhatsappInicioReserva(telefonoTrim, msg)
              if ((wa as any).success) {
                whatsappsEnviados++
                console.log('[ActivarPendientes] WhatsApp OK reserva', r.id)
              } else {
                whatsappsErrores++
                console.warn('[ActivarPendientes] WhatsApp fallo reserva', r.id, (wa as any).error)
              }
            } else {
              console.log('ℹ️ Número móvil inválido/ausente para WhatsApp, se omite:', telefono)
            }
          }
        }

          continue
        }

      } catch (e) {
        console.error('Error procesando activación individual', r.id, e)
      }
    }

  return { success: true, activadas: ids.length, ids, emailsEnviados, avisosPreviosEnviados, whatsappsEnviados, whatsappsErrores }
  } catch (error) {
  console.error('Error en activarReservasPendientes:', error)
  return { success: false, error: 'Error inesperado activando reservas', details: error instanceof Error ? error.message : 'desconocido' }
  }
}
