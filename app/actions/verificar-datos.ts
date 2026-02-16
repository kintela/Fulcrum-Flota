"use server"

import { supabaseServer as supabase } from "@/lib/supabase-server"

export async function verificarDatos() {
  console.log("=== VERIFICANDO DATOS EN LAS TABLAS ===")
  
  try {
    // Verificar reservas temporales
    const { data: reservas, error: reservasError } = await supabase
      .from("reservas")
      .select("*")
    
    console.log("Reservas en tabla 'reservas':", reservas?.length || 0)
    if (reservas && reservas.length > 0) {
      console.log("Primera reserva:", reservas[0])
    }
    if (reservasError) {
      console.error("Error obteniendo reservas:", reservasError)
    }

    // Verificar coches asignados
    const { data: cochesAsignados, error: cochesError } = await supabase
      .from("coches")
      .select("*")
      .not("asignadoa", "is", null)
      .eq("donante", false)
    
    console.log("Coches asignados:", cochesAsignados?.length || 0)
    if (cochesAsignados && cochesAsignados.length > 0) {
      console.log("Primer coche asignado:", cochesAsignados[0])
    }
    if (cochesError) {
      console.error("Error obteniendo coches asignados:", cochesError)
    }

    // Verificar empleados
    const { data: empleados, error: empleadosError } = await supabase
      .from("empleados")
      .select("*")
    
    console.log("Empleados en tabla 'empleados':", empleados?.length || 0)
    if (empleadosError) {
      console.error("Error obteniendo empleados:", empleadosError)
    }

    return {
      success: true,
      reservas: reservas?.length || 0,
      cochesAsignados: cochesAsignados?.length || 0,
      empleados: empleados?.length || 0
    }

  } catch (error) {
    console.error("Error verificando datos:", error)
    return {
      success: false,
      error: error
    }
  }
}
