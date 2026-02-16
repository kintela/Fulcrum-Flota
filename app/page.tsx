import { supabaseServer as supabase } from "@/lib/supabase-server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import DashboardClient from "./dashboard-client"
import { obtenerFotosCoche } from "@/lib/storage"

async function getDashboardData(userRole: string, userEmail?: string) {
  try {
    // Primero obtener el empleado por email para obtener su ID real
    let empleadoActual = null
    if (userRole === 'usuario' && userEmail) {
      const { data: empleadoData, error: empleadoError } = await supabase
        .from("empleados")
        .select("*")
        .eq('email', userEmail)
        .single()
      
      if (empleadoError) {
        console.error("Error fetching empleado by email:", empleadoError)
      } else {
        empleadoActual = empleadoData
      }
    }

    // Obtener coches - si es usuario, solo los asignados a él PARA LAS ESTADÍSTICAS
    let cochesQuery = supabase.from("coches").select("*")
    let cochesFiltrados = []
    
    if (userRole === 'usuario' && empleadoActual) {
      // Para usuarios regulares, solo mostrar coches asignados a ellos para estadísticas
      const { data: cochesUsuario, error: cochesUsuarioError } = await cochesQuery.eq('asignadoa', empleadoActual.id)
      if (cochesUsuarioError) {
        console.error("Error fetching coches usuario:", cochesUsuarioError)
      }
      cochesFiltrados = cochesUsuario || []
    }
    
    // SIEMPRE obtener TODOS los coches para el mapa
    const { data: todosLosCoches, error: cochesError } = await supabase.from("coches").select("*")

    if (cochesError) {
      console.error("Error fetching todos los coches:", cochesError)
    }

    // Obtener empleados - SIEMPRE obtener para el mapa y alertas
    const { data: empleados, error: empleadosError } = await supabase.from("empleados").select("*")
    if (empleadosError) {
      console.error("Error fetching empleados:", empleadosError)
    }

    // Añadir primera foto a todos los coches
    const cochesConFotos = await Promise.all(
      (todosLosCoches || []).map(async (coche) => {
        try {
          const fotos = await obtenerFotosCoche(coche.matricula)
          const primeraFoto = fotos.success && fotos.fotos && fotos.fotos.length > 0 ? fotos.fotos[0] : null
          return { ...coche, primeraFoto }
        } catch {
          return { ...coche, primeraFoto: null }
        }
      })
    )


    // Obtener TODOS los registros de ITVs con información del vehículo
    let itvsQuery = supabase
      .from("itvs")
      .select(`
    *,
    coches!inner (
      matricula,
      marca,
      modelo,
      donante,
      asignadoa
    )
  `)
      .order("id", { ascending: false }) // Ordenar por ID descendente para obtener el más reciente

    // Si es usuario regular, filtrar solo sus coches
    if (userRole === 'usuario' && empleadoActual) {
      itvsQuery = itvsQuery.eq('coches.asignadoa', empleadoActual.id)
    }

    const { data: allItvs, error: itvsError } = await itvsQuery

    if (itvsError) {
      console.error("Error fetching ITVs:", itvsError)
    }

    // Filtrar para obtener solo el registro más reciente de cada vehículo
    const latestItvs = []
    const processedMatriculas = new Set()

    if (allItvs) {
      // Ordenar por fecha de revisión (los que tienen fecha primero, luego por ID descendente)
      const sortedItvs = allItvs.sort((a, b) => {
        // Si ambos tienen fecharevision, ordenar por fecha descendente
        if (a.fecharevision && b.fecharevision) {
          return new Date(b.fecharevision).getTime() - new Date(a.fecharevision).getTime()
        }
        // Si solo uno tiene fecharevision, ese va primero
        if (a.fecharevision && !b.fecharevision) return -1
        if (!a.fecharevision && b.fecharevision) return 1
        // Si ninguno tiene fecharevision, ordenar por ID descendente
        return b.id - a.id
      })

      for (const itv of sortedItvs) {
        if (!processedMatriculas.has(itv.matricula)) {
          latestItvs.push(itv)
          processedMatriculas.add(itv.matricula)
        }
      }
    }

    // Calcular alertas de ITVs usando solo los registros más recientes
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const itvAlerts = latestItvs.filter((itv) => {
      // Skip donor vehicles
      if (itv.coches?.donante === true) return false

      const fechaProximaRevision = new Date(itv.fechaproximarevision)

      // Si la ITV ya se realizó con resultado "Apto"
      if (itv.fecharevision && itv.resultado === "Apto") {
        // Si la fechaproximarevision ya pasó, NO mostrar alerta (la ITV se pasó correctamente)
        if (fechaProximaRevision < today) {
          return false
        }
        // Solo mostrar alerta si la próxima revisión está dentro de 30 días
        return fechaProximaRevision <= thirtyDaysFromNow
      }

      // Para ITVs no realizadas o con otros resultados, usar la fecha de próxima revisión
      return fechaProximaRevision <= thirtyDaysFromNow
    })

    // Para categorizar vencidas vs próximas a vencer, usar siempre fechaproximarevision
    const itvVencidas = itvAlerts.filter((itv) => {
      const fechaProximaRevision = new Date(itv.fechaproximarevision)
      return fechaProximaRevision < today
    })

    const itvProximasVencer = itvAlerts.filter((itv) => {
      const fechaProximaRevision = new Date(itv.fechaproximarevision)
      return fechaProximaRevision >= today && fechaProximaRevision <= thirtyDaysFromNow
    })

    // Also modify the SOLRED alerts calculation to exclude donor vehicles
    let solredQuery = supabase
      .from("solred_coches")
      .select(`
    *,
    tarjetassolred!inner (
      numero_tarjeta,
      fechavencimiento
    ),
    coches!inner (
      matricula,
      marca,
      modelo,
      donante,
      asignadoa
    )
  `)
      .eq("activa", true)

    // Si es usuario regular, filtrar solo sus coches
    if (userRole === 'usuario' && empleadoActual) {
      solredQuery = solredQuery.eq('coches.asignadoa', empleadoActual.id)
    }

    const { data: tarjetasSolred, error: tarjetasError } = await solredQuery

    if (tarjetasError) {
      console.error("Error fetching tarjetas SOLRED:", tarjetasError)
    }

    // Calcular alertas de tarjetas SOLRED
    const solredAlerts = (tarjetasSolred || []).filter((asignacion) => {
      // Skip donor vehicles
      if (asignacion.coches?.donante === true) return false

      if (!asignacion.tarjetassolred?.fechavencimiento) return false
      const fechaVencimiento = new Date(asignacion.tarjetassolred.fechavencimiento)
      return fechaVencimiento <= thirtyDaysFromNow
    })

    const solredVencidas = solredAlerts.filter((asignacion) => {
      const fechaVencimiento = new Date(asignacion.tarjetassolred.fechavencimiento)
      return fechaVencimiento < today
    })

    const solredProximasVencer = solredAlerts.filter((asignacion) => {
      const fechaVencimiento = new Date(asignacion.tarjetassolred.fechavencimiento)
      return fechaVencimiento >= today && fechaVencimiento <= thirtyDaysFromNow
    })

    // Obtener alquileres próximos a vencer (2 meses o menos)
    let alquileresQuery = supabase
      .from("alquileres")
      .select(`
        *,
        coches!inner (
          matricula,
          marca,
          modelo,
          donante,
          asignadoa
        )
      `)
      .order("fecha_fin", { ascending: true })

    // Si es usuario regular, filtrar solo sus coches
    if (userRole === 'usuario' && empleadoActual) {
      alquileresQuery = alquileresQuery.eq('coches.asignadoa', empleadoActual.id)
    }

    const { data: alquileres, error: alquileresError } = await alquileresQuery

    if (alquileresError) {
      console.error("Error fetching alquileres:", alquileresError)
    }

    // Calcular alertas de alquileres (2 meses = 60 días)
    const sixtyDaysFromNow = new Date()
    sixtyDaysFromNow.setDate(today.getDate() + 60)

    const alquilerAlerts = (alquileres || []).filter((alquiler) => {
      // Skip donor vehicles
      if (alquiler.coches?.donante === true) return false

      if (!alquiler.fecha_fin) return false
      const fechaFin = new Date(alquiler.fecha_fin)
      return fechaFin <= sixtyDaysFromNow
    })

    const alquileresVencidos = alquilerAlerts.filter((alquiler) => {
      const fechaFin = new Date(alquiler.fecha_fin)
      return fechaFin < today
    })

    const alquileresProximosVencer = alquilerAlerts.filter((alquiler) => {
      const fechaFin = new Date(alquiler.fecha_fin)
      return fechaFin >= today && fechaFin <= sixtyDaysFromNow
    })

    return {
      coches: userRole === 'usuario' ? cochesFiltrados : cochesConFotos,
      todosLosCoches: cochesConFotos, // Para el mapa
      empleados: empleados || [],
      itvAlerts: {
        total: itvAlerts.length,
        vencidas: itvVencidas.length,
        proximasVencer: itvProximasVencer.length,
        detalles: itvAlerts,
      },
      solredAlerts: {
        total: solredAlerts.length,
        vencidas: solredVencidas.length,
        proximasVencer: solredProximasVencer.length,
        detalles: solredAlerts,
      },
      alquilerAlerts: {
        total: alquilerAlerts.length,
        vencidos: alquileresVencidos.length,
        proximosVencer: alquileresProximosVencer.length,
        detalles: alquilerAlerts,
      },
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    return {
      coches: [],
      todosLosCoches: [],
      empleados: [],
      itvAlerts: {
        total: 0,
        vencidas: 0,
        proximasVencer: 0,
        detalles: [],
      },
      solredAlerts: {
        total: 0,
        vencidas: 0,
        proximasVencer: 0,
        detalles: [],
      },
      alquilerAlerts: {
        total: 0,
        vencidos: 0,
        proximosVencer: 0,
        detalles: [],
      },
    }
  }
}

export default async function HomePage() {
  // Obtener información del usuario logueado
  const session = await getServerSession(authOptions)
  
  // Si no hay sesión, redirigir o mostrar mensaje
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No autorizado</h1>
          <p className="text-gray-600">Debes iniciar sesión para ver esta página.</p>
        </div>
      </div>
    )
  }

  const userRole = session.user.role || 'usuario'
  const userEmail = session.user.email || ''

  const { coches, todosLosCoches, empleados, itvAlerts, solredAlerts, alquilerAlerts } = await getDashboardData(userRole, userEmail)

  return (
    <DashboardClient 
      coches={coches}
      todosLosCoches={todosLosCoches}
      empleados={empleados}
      itvAlerts={itvAlerts}
      solredAlerts={solredAlerts}
      alquilerAlerts={alquilerAlerts}
      userRole={userRole}
      userEmail={userEmail}
    />
  )
}
