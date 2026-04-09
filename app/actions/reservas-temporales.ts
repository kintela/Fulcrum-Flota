"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { enviarEmailInicioReserva } from "@/lib/email"
import {
  asegurarCodigoAccesoReserva,
  marcarEmailCodigoReservaEnviado,
  obtenerCasilleroActivoPorMatricula,
  resolverCasilleroReserva,
  revocarCodigoAccesoReserva,
} from "@/lib/reservas-casilleros"
import {
  RESERVA_ACTIVACION_ANTELACION_MINUTOS,
  getReservaActivacionDesde,
  getReservaBloqueoDesde,
  isReservaListaParaActivacion,
} from "@/lib/reservas-access-window"
import { sendWhatsAppMessage, formatSpanishPhone } from "@/lib/whatsapp"
import { canUserAccessReservationVehicle } from "@/lib/reserva-test-vehicles"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

// Helper para envío WhatsApp inicio (manual únicamente)
async function enviarWhatsappInicioReserva(destino: string, mensaje: string) {
  const to = formatSpanishPhone(destino)
  return await sendWhatsAppMessage({ to, message: mensaje })
}

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

async function procesarInicioReservaActiva(params: {
  reservaId: number
  matricula: string
  casilleroId?: number | null
  accesoDesde?: Date
  fechaInicio: Date
  fechaFin: Date
  empleadoEmail?: string | null
  empleadoNombre?: string | null
  empleadoMovil?: string | null
  vehiculo?: { marca?: string | null; modelo?: string | null } | null
  manualWhatsapp?: boolean
  accesoPreparado?: Awaited<ReturnType<typeof asegurarCodigoAccesoReserva>>
}) {
  try {
    const acceso =
      params.accesoPreparado ||
      (await (async () => {
        const casillero = await resolverCasilleroReserva({
          matricula: params.matricula,
          casilleroId: params.casilleroId,
        })

        if (!casillero) {
          return null
        }

        return await asegurarCodigoAccesoReserva({
          reservaId: params.reservaId,
          matricula: params.matricula,
          fechaInicio: params.accesoDesde || params.fechaInicio,
          fechaFin: params.fechaFin,
          casilleroId: casillero.id,
        })
      })())

    let emailEnviado = false
    let whatsappsEnviados = 0
    let whatsappsErrores = 0
    let emailError: string | null = null

    if (params.empleadoEmail) {
      const resEmail = await enviarEmailInicioReserva(
        params.empleadoEmail,
        params.empleadoNombre || "",
        {
          matricula: params.matricula,
          marca: params.vehiculo?.marca || "",
          modelo: params.vehiculo?.modelo || "",
        },
        params.fechaInicio,
        params.fechaFin,
        acceso
          ? {
              casilleroNombre: acceso.casillero.nombre,
              codigoAcceso: acceso.codigo.codigoAcceso,
              keypadInstruction: acceso.keypadInstruction,
            }
          : undefined,
      )

      if (resEmail.success) {
        emailEnviado = true
        if (acceso) {
          await marcarEmailCodigoReservaEnviado(params.reservaId)
        }
      } else {
        emailError = resEmail.error || "No se pudo enviar el email de inicio de reserva"
      }
    } else {
      emailError = "El empleado no tiene email configurado"
    }

    if (params.manualWhatsapp && params.empleadoMovil) {
      const telefonoTrim = String(params.empleadoMovil).trim()
      if (/^\+?\d{7,15}$/.test(telefonoTrim.replace(/\s|-/g, ""))) {
        const msg =
          `✅ Inicio de tu reserva (${params.matricula})\n` +
          (acceso
            ? `Casillero: ${acceso.casillero.nombre}\n` +
              `Código: ${acceso.codigo.codigoAcceso}\n` +
              `Apertura: ${acceso.keypadInstruction}\n`
            : "") +
          `Inicio: ${params.fechaInicio.toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}\n` +
          `Fin previsto: ${params.fechaFin.toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`

        const wa = await enviarWhatsappInicioReserva(telefonoTrim, msg)
        if ((wa as any).success) {
          whatsappsEnviados += 1
        } else {
          whatsappsErrores += 1
        }
      }
    }

    return {
      success: true as const,
      acceso,
      accesoCreado: acceso?.created || false,
      emailEnviado,
      emailError,
      whatsappsEnviados,
      whatsappsErrores,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Error inesperado preparando el acceso a la reserva",
      emailEnviado: false,
      whatsappsEnviados: 0,
      whatsappsErrores: 0,
    }
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

    if (!canUserAccessReservationVehicle(data.matricula, session.user.email)) {
      return {
        success: false,
        error: "Este vehículo de pruebas solo está disponible para Roberto Quintela"
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
      .select("matricula, marca, modelo, donante, eliminado")
      .eq('matricula', data.matricula)
      .single()
    
    if (cocheError || !coche) {
      return {
        success: false,
        error: "Vehículo no encontrado"
      }
    }

    if (coche.eliminado === true) {
      return {
        success: false,
        error: "Este vehículo está eliminado y no se puede reservar"
      }
    }

    // Verificar que no sea un vehículo donante
    if (coche.donante) {
      return {
        success: false,
        error: "No se pueden reservar vehículos donantes"
      }
    }

    const casillero = await obtenerCasilleroActivoPorMatricula(data.matricula)

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

    const bloqueoDesde = getReservaBloqueoDesde(fechaInicio)
    const estadoInicial = bloqueoDesde > ahora ? "pendiente" : "activa"

    // Crear la reserva temporal
    const { data: reserva, error: reservaError } = await supabase
      .from("reservas")
      .insert([
        {
          matricula: data.matricula,
          empleado_id: empleado.id,
          casillero_id: casillero?.id || null,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          bloqueo_desde: bloqueoDesde.toISOString(),
          margen_bloqueo: RESERVA_ACTIVACION_ANTELACION_MINUTOS,
          observaciones: data.observaciones || null,
          estado: estadoInicial,
        },
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

    let message = `Reserva temporal creada exitosamente para el vehículo ${data.matricula}`

    if (estadoInicial === "activa") {
      const inicioReserva = await procesarInicioReservaActiva({
        reservaId: reserva.id,
        matricula: data.matricula,
        casilleroId: casillero?.id || null,
        accesoDesde: bloqueoDesde,
        fechaInicio,
        fechaFin,
        empleadoEmail: empleado.email || session.user.email,
        empleadoNombre: [empleado.nombre, empleado.apellidos].filter(Boolean).join(" ").trim(),
        vehiculo: { marca: coche.marca, modelo: coche.modelo },
        manualWhatsapp: false,
      })

      if (!inicioReserva.success) {
        await supabase.from("reservas").delete().eq("id", reserva.id)
        return {
          success: false,
          error: `No se pudo preparar el inicio de esta reserva: ${inicioReserva.error}`
        }
      }

      if (!inicioReserva.emailEnviado) {
        message += casillero
          ? ". El código se generó, pero el email de inicio no se pudo enviar todavía."
          : ". La reserva no tiene casillero asociado y el email de inicio todavía no se pudo enviar."
      } else if (!casillero) {
        message += ". Este vehículo no tiene casillero asociado, así que no se ha generado ningún código de acceso."
      }
    } else {
      message += casillero
        ? `. El código y el email de acceso se enviarán automáticamente cuando queden ${RESERVA_ACTIVACION_ANTELACION_MINUTOS} minutos para el inicio.`
        : `. El email de inicio se enviará automáticamente cuando queden ${RESERVA_ACTIVACION_ANTELACION_MINUTOS} minutos para el inicio. Como este vehículo no tiene casillero asociado, la reserva seguirá sin código de acceso.`
    }

    return {
      success: true,
      message,
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
    try {
      await revocarCodigoAccesoReserva({
        reservaId,
        motivoFin: "cancelada",
        origen: "app",
      })
    } catch (error) {
      console.error("Error revocando código al cancelar reserva:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "No se pudo anular el código del casillero"
      }
    }

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

    try {
      await revocarCodigoAccesoReserva({
        reservaId,
        motivoFin: "completada",
        origen: "app",
      })
    } catch (error) {
      console.error("Error revocando código al completar reserva:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "No se pudo anular el código del casillero"
      }
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

export async function ampliarReservaTemporal(reservaId: number, nuevaFechaFin: string, nuevaFechaInicio?: string) {
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
      return { success: false, error: "Solo se pueden modificar reservas pendientes o activas" }
    }

    const fechaInicioNueva = nuevaFechaInicio ? new Date(nuevaFechaInicio) : new Date(reserva.fecha_inicio)
    const fechaFinActual = new Date(reserva.fecha_fin)
    const fechaFinNueva = new Date(nuevaFechaFin)

    if (reserva.estado === "activa" && fechaFinActual <= new Date()) {
      return { success: false, error: "No se pueden modificar reservas activas ya vencidas" }
    }

    if (!Number.isFinite(fechaInicioNueva.getTime())) {
      return { success: false, error: "La nueva fecha de inicio no es válida" }
    }

    if (!Number.isFinite(fechaFinNueva.getTime())) {
      return { success: false, error: "La nueva fecha de fin no es válida" }
    }

    if (fechaFinNueva <= fechaInicioNueva) {
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
      return inicioBloqueo < fechaFinNueva && fin > fechaInicioNueva
    })

    if (hayConflicto) {
      return { success: false, error: "No se puede modificar la reserva porque hay otra reserva en ese período" }
    }

    const { error: updateError } = await supabase
      .from("reservas")
      .update({
        fecha_inicio: fechaInicioNueva.toISOString(),
        fecha_fin: fechaFinNueva.toISOString(),
      })
      .eq("id", reservaId)

    if (updateError) {
      console.error("Error modificando reserva:", updateError)
      return { success: false, error: "Error al modificar la reserva" }
    }

    return { success: true, message: "Plazo de reserva modificado" }
  } catch (error) {
    console.error("Error en ampliarReservaTemporal:", error)
    return { success: false, error: "Error inesperado al modificar la reserva" }
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

    const conflictos = (reservasActivas || []).filter(r => {
      const inicio = new Date(r.fecha_inicio)
      const fin = new Date(r.fecha_fin)
      const inicioBloqueo = r.bloqueo_desde ? new Date(r.bloqueo_desde) : inicio
      // Solape estricto: permite reservas contiguas (p. ej. una termina a las 18:00 y otra empieza a las 18:00)
      const solapa = inicioBloqueo < finSolicitado && fin > inicioSolicitado
      return solapa
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

    const ahoraIso = new Date().toISOString()

    const { data, error } = await supabase
      .from("reservas")
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        bloqueo_desde,
        empleados (
          nombre,
          apellidos,
          movil
        )
      `)
      .eq("matricula", matricula)
      .in("estado", ["activa", "pendiente"])
      .gt("fecha_fin", ahoraIso)
      .order("fecha_inicio", { ascending: true })

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

// Activar reservas pendientes cuando entran en su ventana de acceso.
// La reserva pasa a "activa" cuando faltan 30 minutos para el inicio real.
export async function activarReservasPendientes(opciones?: {
  manual?: boolean
  referenceTime?: Date | string
  targetReservaId?: number | null
  forceWindowBypass?: boolean
}) {
  try {
    const ahora = opciones?.referenceTime ? new Date(opciones.referenceTime) : new Date()
    const targetReservaId =
      typeof opciones?.targetReservaId === "number" && Number.isInteger(opciones.targetReservaId)
        ? opciones.targetReservaId
        : null
    const forceWindowBypass = opciones?.forceWindowBypass === true

    // Buscar reservas pendientes y decidir en código cuáles ya deben activarse.
    // Usamos bloqueo_desde cuando exista; si no, caemos al cálculo fecha_inicio - 30 minutos.
    let query = supabase
      .from('reservas')
      .select('id, estado, fecha_inicio, fecha_fin, bloqueo_desde, margen_bloqueo, matricula, empleado_id, casillero_id, notificacion_inicio_reserva_enviada, fecha_notificacion_inicio_reserva, coches(marca,modelo), empleados(email,nombre,apellidos,movil)')
      .in('estado', ['pendiente', 'activa'])

    if (targetReservaId !== null) {
      query = query.eq("id", targetReservaId)
    }

    const { data: pendientes, error } = await query

    if (error) {
      console.error('Error consultando reservas pendientes para activar:', error)
      return { success: false, error: 'Error consultando reservas pendientes', details: error.message }
    }

    if (targetReservaId !== null && (!pendientes || pendientes.length === 0)) {
      return {
        success: false,
        error: `La reserva ${targetReservaId} no está pendiente o ya no existe`,
        targetReservaId,
      }
    }

    if (!pendientes || pendientes.length === 0) {
      return { success: true, activadas: 0 }
    }

    const ids: number[] = []
    let emailsEnviados = 0
    let avisosPreviosEnviados = 0
    let whatsappsEnviados = 0
    let whatsappsErrores = 0
    let codigosGenerados = 0
    let erroresAcceso = 0
    const detalles: string[] = []

    for (const r of pendientes) {
      try {
        const fechaInicio = new Date(r.fecha_inicio)
        const fechaFin = new Date(r.fecha_fin)
        const accesoDesde = getReservaActivacionDesde(r)
        const estadoReserva = String((r as any).estado || "")
        const notificacionEnviada = Boolean((r as any).notificacion_inicio_reserva_enviada)
        const esPendiente = estadoReserva === "pendiente"
        const esActivaSinNotificar = estadoReserva === "activa" && !notificacionEnviada

        if (!esPendiente && !esActivaSinNotificar) {
          continue
        }

        const shouldActivateNow = forceWindowBypass || isReservaListaParaActivacion(r, ahora)

        if (esPendiente && !shouldActivateNow) {
          detalles.push(
            `Reserva ${r.id} (${r.matricula}) fuera de ventana de activación para ${ahora.toLocaleString("es-ES")}`,
          )
          continue
        }

        if (esPendiente && forceWindowBypass && !isReservaListaParaActivacion(r, ahora)) {
          detalles.push(
            `Reserva ${r.id} (${r.matricula}) forzada manualmente fuera de ventana para ${ahora.toLocaleString("es-ES")}`,
          )
        }

        let accesoReserva: Awaited<ReturnType<typeof asegurarCodigoAccesoReserva>> | null = null

        if (esPendiente) {
          const casillero = await resolverCasilleroReserva({
            matricula: r.matricula,
            casilleroId: (r as any).casillero_id || null,
          })

          if (casillero) {
            accesoReserva = await asegurarCodigoAccesoReserva({
              reservaId: r.id,
              matricula: r.matricula,
              fechaInicio: accesoDesde,
              fechaFin,
              casilleroId: casillero.id,
            })
          } else {
            detalles.push(`Reserva ${r.id} (${r.matricula}) sin casillero asociado: se activará y avisará sin código de acceso`)
          }

          const { data: reservaActivada, error: upErr } = await supabase
            .from('reservas')
            .update({ estado: 'activa' })
            .eq('id', r.id)
            .eq('estado', 'pendiente')
            .select('id')
            .maybeSingle()

          if (upErr) {
            if (accesoReserva?.created) {
              await revocarCodigoAccesoReserva({ reservaId: r.id, motivoFin: "error", origen: "system" })
            }
            detalles.push(`Reserva ${r.id} (${r.matricula}): error actualizando a activa`)
            console.error('Error activando reserva', r.id, upErr)
            continue
          }

          if (!reservaActivada) {
            const { data: reservaActual } = await supabase
              .from("reservas")
              .select("estado")
              .eq("id", r.id)
              .maybeSingle()

            if (accesoReserva?.created && reservaActual?.estado !== "activa") {
              await revocarCodigoAccesoReserva({ reservaId: r.id, motivoFin: "error", origen: "system" })
            }

            detalles.push(`Reserva ${r.id} (${r.matricula}): dejó de estar pendiente durante la simulación`)
            console.log('ℹ️ Reserva', r.id, 'ya no está pendiente (posible cancelación o activación concurrente), se omite aviso de inicio')
            continue
          }

          ids.push(r.id)
        }

        const empleado = (r as any).empleados
        const coche = (r as any).coches
        const inicioReserva = await procesarInicioReservaActiva({
          reservaId: r.id,
          matricula: r.matricula,
          casilleroId: (r as any).casillero_id || null,
          accesoDesde,
          fechaInicio,
          fechaFin,
          empleadoEmail: empleado?.email || null,
          empleadoNombre: [empleado?.nombre, empleado?.apellidos].filter(Boolean).join(" ").trim(),
          empleadoMovil: empleado?.movil || null,
          vehiculo: { marca: coche?.marca, modelo: coche?.modelo },
          manualWhatsapp: Boolean(opciones?.manual),
          accesoPreparado: accesoReserva || undefined,
        })

        if (!inicioReserva.success) {
          erroresAcceso++
          detalles.push(`Reserva ${r.id} (${r.matricula}): ${inicioReserva.error}`)
          console.error("Error preparando acceso de reserva activada:", r.id, inicioReserva.error)
          continue
        }

        if (inicioReserva.accesoCreado) {
          codigosGenerados++
        }

        if (inicioReserva.emailEnviado) {
          emailsEnviados++
          await supabase
            .from('reservas')
            .update({ 
              notificacion_inicio_reserva_enviada: true,
              fecha_notificacion_inicio_reserva: new Date().toISOString()
            })
            .eq('id', r.id)
        } else if (inicioReserva.emailError) {
          detalles.push(`Reserva ${r.id} (${r.matricula}): email no enviado: ${inicioReserva.emailError}`)
        }

        whatsappsEnviados += inicioReserva.whatsappsEnviados || 0
        whatsappsErrores += inicioReserva.whatsappsErrores || 0
      } catch (e) {
        erroresAcceso++
        detalles.push(
          `Reserva ${r.id} (${r.matricula}): ${e instanceof Error ? e.message : "Error inesperado en la simulación"}`,
        )
        console.error('Error procesando activación individual', r.id, e)
      }
    }

    return {
      success: true,
      activadas: ids.length,
      targetReservaId,
      forceWindowBypass,
      ids,
      emailsEnviados,
      avisosPreviosEnviados,
      whatsappsEnviados,
      whatsappsErrores,
      codigosGenerados,
      erroresAcceso,
      detalles,
    }
  } catch (error) {
    console.error('Error en activarReservasPendientes:', error)
    return {
      success: false,
      error: 'Error inesperado activando reservas',
      details: error instanceof Error ? error.message : 'desconocido',
    }
  }
}
