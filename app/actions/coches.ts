"use server"

import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface TarjetaSolredInfo {
  numero_tarjeta?: string | null
  pin?: string | null
  fechavencimiento?: string | null
}

interface TarjetaViatInfo {
  id: number
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

    if (!matricula) {
      return { success: false, error: "Matrícula no válida" as const }
    }

    const { data: coche, error: cocheError } = await supabase
      .from("coches")
      .select("*")
      .eq("matricula", matricula)
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
    if (empleadoId !== null) {
      const { data: viatData } = await supabase
        .from("viat_empleados")
        .select("viats(id, fechacaducidad)")
        .eq("empleado_id", empleadoId)
        .single()

      if (viatData?.viats) {
        tarjetaViat = viatData.viats as TarjetaViatInfo
      }
    }

    const { data: itvData } = await supabase
      .from("itvs")
      .select("fechaproximarevision, fecharevision")
      .eq("matricula", matricula)
      .order("fecharevision", { ascending: false })
      .limit(1)

    const proximaRevisionITV = itvData?.[0]?.fechaproximarevision ?? null

    const { data: solredData } = await supabase
      .from("solred_coches")
      .select("tarjetassolred(numero_tarjeta, pin, fechavencimiento)")
      .eq("matricula", matricula)
      .eq("activa", true)
      .single()

    const tarjetaSolred = (solredData?.tarjetassolred as TarjetaSolredInfo | null) ?? null

    const { data: seguroData } = await supabase
      .from("seguros")
      .select("fecha_vencimiento, telefono_asistencia1")
      .eq("matricula", matricula)
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
