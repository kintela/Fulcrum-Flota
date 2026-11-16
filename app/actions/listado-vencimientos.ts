"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { esAdministradorPorSesion } from "@/lib/roles"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import type { FilaVencimiento } from "@/lib/listado-vencimientos"

// Listado de vencimientos de la flota (spec 016).
// Los criterios de selección (flota activa, coches de prueba, asignado, seguro activo,
// Solred activa y próxima ITV) reproducen los de `getCoches` en app/coches/page.tsx
// para mostrar los mismos valores que las tarjetas de la página de coches.

// Misma excepción que la página de coches para ver matrículas de prueba "0000-".
const EMAIL_EXCEPCION_COCHES_PRUEBA = "rquintela@fulcrum.es"

export interface ResultadoListadoVencimientos {
  success: boolean
  error?: string
  filas?: FilaVencimiento[]
}

interface CocheListado {
  matricula: string
  marca: string | null
  modelo: string | null
  asignadoa: string | number | null
  alquiler: boolean | null
  donante: boolean | null
}

function esCochePruebaOculto(matricula: unknown): boolean {
  return String(matricula ?? "")
    .trim()
    .toUpperCase()
    .startsWith("0000-")
}

function textoONull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const texto = String(value).trim()
  return texto === "" ? null : texto
}

function resolverAsignado(asignadoa: unknown, empleadosMap: Map<string, string>): string | null {
  if (asignadoa === null || asignadoa === undefined || asignadoa === "") return null
  if (typeof asignadoa === "number") {
    return empleadosMap.get(asignadoa.toString()) || `ID: ${asignadoa}`
  }
  if (typeof asignadoa === "string") {
    if (/^\d+$/.test(asignadoa)) {
      return empleadosMap.get(asignadoa) || `ID: ${asignadoa}`
    }
    return asignadoa
  }
  return null
}

function relacionUnica<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function obtenerListadoVencimientos(): Promise<ResultadoListadoVencimientos> {
  try {
    const session = await getServerSession(authOptions)
    const email = String(session?.user?.email || "").trim().toLowerCase()

    if (!email) {
      return { success: false, error: "Usuario no autenticado" }
    }

    if (!(await esAdministradorPorSesion(session))) {
      return { success: false, error: "No autorizado" }
    }

    const [cochesRes, empleadosRes, segurosRes, solredRes, itvsRes] = await Promise.all([
      supabase
        .from("coches")
        .select("matricula, marca, modelo, asignadoa, alquiler, donante")
        .eq("eliminado", false)
        .order("matricula", { ascending: true }),
      supabase.from("empleados").select("id, nombre, apellidos"),
      supabase.from("seguros").select("matricula, fecha_vencimiento").eq("activo", true),
      supabase
        .from("solred_coches")
        .select("matricula, tarjetassolred ( fechavencimiento )")
        .eq("activa", true),
      supabase
        .from("itvs")
        .select("matricula, fechaproximarevision, fecharevision")
        .order("fechaproximarevision", { ascending: false })
        .order("fecharevision", { ascending: false }),
    ])

    if (cochesRes.error || !cochesRes.data) {
      console.error("Error al obtener coches para el listado de vencimientos:", cochesRes.error)
      return { success: false, error: "No se pudo cargar el listado de vehículos" }
    }

    for (const [nombre, res] of [
      ["empleados", empleadosRes],
      ["seguros", segurosRes],
      ["solred_coches", solredRes],
      ["itvs", itvsRes],
    ] as const) {
      if (res.error) {
        console.error(`Error al obtener ${nombre} para el listado de vencimientos:`, res.error)
      }
    }

    const empleadosMap = new Map<string, string>()
    for (const emp of (empleadosRes.data ?? []) as Array<{ id: number; nombre: string; apellidos: string }>) {
      empleadosMap.set(emp.id.toString(), `${emp.nombre} ${emp.apellidos}`)
    }

    // Como en la página: si hay varios activos para una matrícula, gana el último recorrido.
    const segurosMap = new Map<string, string | null>()
    for (const seguro of (segurosRes.data ?? []) as Array<{ matricula: string; fecha_vencimiento: string | null }>) {
      segurosMap.set(seguro.matricula, seguro.fecha_vencimiento ?? null)
    }

    const solredMap = new Map<string, string | null>()
    for (const relacion of (solredRes.data ?? []) as Array<{
      matricula: string
      tarjetassolred: { fechavencimiento: string | null } | Array<{ fechavencimiento: string | null }> | null
    }>) {
      solredMap.set(relacion.matricula, relacionUnica(relacion.tarjetassolred)?.fechavencimiento ?? null)
    }

    // Como en la página: el primer registro por matrícula (orden desc) es la próxima revisión.
    const itvMap = new Map<string, string | null>()
    for (const itv of (itvsRes.data ?? []) as Array<{ matricula: string; fechaproximarevision: string | null }>) {
      if (!itvMap.has(itv.matricula)) {
        itvMap.set(itv.matricula, itv.fechaproximarevision ?? null)
      }
    }

    const puedeVerCochesPrueba = email === EMAIL_EXCEPCION_COCHES_PRUEBA

    const filas: FilaVencimiento[] = (cochesRes.data as CocheListado[])
      .filter((coche) => coche.donante !== true)
      .filter((coche) => puedeVerCochesPrueba || !esCochePruebaOculto(coche.matricula))
      .map((coche) => ({
        matricula: coche.matricula,
        modelo: textoONull([coche.marca, coche.modelo].filter((v) => textoONull(v) !== null).join(" ")),
        asignado: resolverAsignado(coche.asignadoa, empleadosMap),
        alquiler: coche.alquiler === true,
        seguro: segurosMap.get(coche.matricula) ?? null,
        solred: solredMap.get(coche.matricula) ?? null,
        itv: itvMap.get(coche.matricula) ?? null,
      }))

    return { success: true, filas }
  } catch (error) {
    console.error("Error en obtenerListadoVencimientos:", error)
    return { success: false, error: "No se pudo cargar el listado de vehículos" }
  }
}
