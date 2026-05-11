"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

interface TarjetaSolredInfo {
  numero_tarjeta?: string | null
  pin?: string | null
  fechavencimiento?: string | null
}

interface TarjetaViatInfo {
  id: string | number
  fechacaducidad?: string | null
}

interface SeguroActivoInfo {
  fecha_vencimiento?: string | null
  telefono_asistencia1?: string | null
}

export interface CocheFicha {
  matricula: string
  marca: string
  modelo: string
  color?: string | null
  kms?: number | null
  combustible?: string | null
  empleadoNombre?: string | null
  alquiler?: boolean | null
  proximaRevisionITV?: string | null
  tarjetaSolred?: TarjetaSolredInfo | null
  tarjetaViat?: TarjetaViatInfo | null
  seguroActivo?: SeguroActivoInfo | null
}

export async function obtenerFichaCoche(matricula: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "Usuario no autenticado" as const }
    }

    const matriculaNormalizada = matricula?.trim().toUpperCase()

    if (!matriculaNormalizada) {
      return { success: false, error: "Matrícula no válida" as const }
    }

    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("*")
      .eq("matricula", matriculaNormalizada)
      .single()

    if (cocheError || !coche) {
      return { success: false, error: "No se pudo cargar el coche" as const }
    }

    let empleadoNombre: string | null = null
    let empleadoId: number | null = null

    if (coche.asignadoa !== null && coche.asignadoa !== undefined && coche.asignadoa !== "") {
      if (typeof coche.asignadoa === "number") {
        empleadoId = coche.asignadoa
      } else if (typeof coche.asignadoa === "string") {
        if (/^\d+$/.test(coche.asignadoa)) {
          empleadoId = Number.parseInt(coche.asignadoa, 10)
        } else {
          empleadoNombre = coche.asignadoa
        }
      }
    }

    if (empleadoId !== null) {
      const { data: empleadoData } = await supabase
        .from("empleados")
        .select("nombre, apellidos")
        .eq("id", empleadoId)
        .single()

      if (empleadoData) {
        empleadoNombre = `${empleadoData.nombre} ${empleadoData.apellidos}`.trim()
      }
    }

    let tarjetaViat: TarjetaViatInfo | null = null
    const { data: viatData, error: viatError } = await supabase
      .from("viat_coches")
      .select("viat_id, viats(id, fechacaducidad)")
      .eq("matricula", matriculaNormalizada)
      .is("fecha_desasignacion", null)
      .limit(1)
      .single()

    if (!viatError && viatData) {
      tarjetaViat = (viatData.viats as TarjetaViatInfo | null) ?? ({ id: viatData.viat_id } as TarjetaViatInfo)
    }

    const { data: itvData } = await supabase
      .from("itvs")
      .select("fechaproximarevision, fecharevision")
      .eq("matricula", matriculaNormalizada)
      .order("fechaproximarevision", { ascending: false })
      .order("fecharevision", { ascending: false })
      .limit(1)

    const proximaRevisionITV = itvData?.[0]?.fechaproximarevision ?? null

    const { data: solredData } = await supabase
      .from("solred_coches")
      .select("tarjetassolred(numero_tarjeta, pin, fechavencimiento)")
      .eq("matricula", matriculaNormalizada)
      .eq("activa", true)
      .single()

    const tarjetaSolred = (solredData?.tarjetassolred as TarjetaSolredInfo | null) ?? null

    const { data: seguroData } = await supabase
      .from("seguros")
      .select("fecha_vencimiento, telefono_asistencia1")
      .eq("matricula", matriculaNormalizada)
      .eq("activo", true)
      .single()

    const ficha: CocheFicha = {
      matricula: coche.matricula,
      marca: coche.marca,
      modelo: coche.modelo,
      color: coche.color ?? null,
      kms: coche.kms ?? null,
      combustible: coche.combustible ?? null,
      empleadoNombre,
      alquiler: coche.alquiler ?? null,
      proximaRevisionITV,
      tarjetaSolred,
      tarjetaViat,
      seguroActivo: seguroData ?? null,
    }

    return { success: true, ficha }
  } catch (error) {
    console.error("Error en obtenerFichaCoche:", error)
    return { success: false, error: "Error inesperado al cargar la ficha del coche" as const }
  }
}

export async function eliminarCoche(matricula: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return { success: false, error: "Usuario no autenticado" as const }
    }

    const { data: empleado, error: empleadoError } = await supabase
      .from("empleados")
      .select("role")
      .eq("email", session.user.email)
      .single()

    const roleValue = String(empleado?.role || "").toLowerCase()
    const isAdmin = roleValue === "admin" || roleValue === "administrador"

    if (empleadoError || !empleado || !isAdmin) {
      return {
        success: false,
        error: "Acceso no autorizado - Solo administradores pueden eliminar coches" as const,
      }
    }

    const matriculaNormalizada = (matricula || "").trim().toUpperCase()
    if (!matriculaNormalizada) {
      return { success: false, error: "Matrícula no válida" as const }
    }

    const { data: cocheExistente, error: cocheError } = await supabase
      .from("coches")
      .select("matricula, eliminado")
      .eq("matricula", matriculaNormalizada)
      .maybeSingle()

    if (cocheError || !cocheExistente) {
      return { success: false, error: "El coche no existe" as const }
    }

    if (cocheExistente.eliminado === true) {
      return { success: true as const }
    }

    const { error: logicalDeleteError } = await supabase
      .from("coches")
      .update({
        eliminado: true,
        fecha_eliminacion: new Date().toISOString(),
        eliminado_por: session.user.email,
      })
      .eq("matricula", matriculaNormalizada)
      .eq("eliminado", false)

    if (logicalDeleteError) {
      if (
        logicalDeleteError.message?.toLowerCase().includes("eliminado") ||
        logicalDeleteError.message?.toLowerCase().includes("fecha_eliminacion") ||
        logicalDeleteError.message?.toLowerCase().includes("eliminado_por")
      ) {
        return {
          success: false,
          error:
            "Faltan las columnas de borrado lógico en coches (eliminado, fecha_eliminacion, eliminado_por)." as const,
        }
      }

      return {
        success: false,
        error: `Error al eliminar el coche: ${logicalDeleteError.message}` as const,
      }
    }

    revalidatePath("/coches")
    revalidatePath("/")

    return { success: true as const }
  } catch (error) {
    console.error("Error en eliminarCoche:", error)
    return { success: false, error: "Error inesperado al eliminar el coche" as const }
  }
}
