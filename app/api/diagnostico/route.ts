import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Obtener todos los coches
    const { data: coches, error: cochesError } = await supabase.from("coches").select("*")

    if (cochesError) {
      return NextResponse.json({ error: cochesError.message }, { status: 500 })
    }

    // Obtener todos los empleados
    const { data: empleados, error: empleadosError } = await supabase.from("empleados").select("*")

    if (empleadosError) {
      return NextResponse.json({ error: empleadosError.message }, { status: 500 })
    }

    // Crear mapa de empleados para búsqueda rápida
    const empleadosMap = new Map()
    empleados.forEach((empleado) => {
      empleadosMap.set(empleado.id, empleado)
    })

    // Procesar datos para diagnóstico
    const cochesConDetalles = coches.map((coche) => {
      // Buscar el empleado asociado si asignadoa es un número
      let empleadoInfo = null
      if (coche.asignadoa && !isNaN(Number(coche.asignadoa))) {
        empleadoInfo = empleadosMap.get(Number(coche.asignadoa))
      }

      return {
        ...coche,
        estado: coche.donante
          ? "Donante"
          : coche.asignadoa !== null && coche.asignadoa !== undefined && coche.asignadoa !== ""
            ? "Asignado"
            : "Disponible",
        empleadoAsignado: empleadoInfo
          ? `${empleadoInfo.nombre} ${empleadoInfo.apellidos} (ID: ${empleadoInfo.id})`
          : coche.asignadoa || "No asignado",
      }
    })

    // Calcular estadísticas
    const donantesCount = coches.filter((c) => c.donante === true).length
    const asignadosCount = coches.filter(
      (c) => !c.donante && c.asignadoa !== null && c.asignadoa !== undefined && c.asignadoa !== "",
    ).length
    const disponiblesCount = coches.filter(
      (c) => !c.donante && (c.asignadoa === null || c.asignadoa === undefined || c.asignadoa === ""),
    ).length

    return NextResponse.json({
      estadisticas: {
        total: coches.length,
        donantes: donantesCount,
        asignados: asignadosCount,
        disponibles: disponiblesCount,
      },
      coches: cochesConDetalles,
      empleados,
    })
  } catch (error) {
    console.error("Error en diagnóstico:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
