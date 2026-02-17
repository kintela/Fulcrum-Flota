import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Plus, Filter, Users, Calendar, AlertTriangle, Clock, CreditCard, Truck, Search } from "lucide-react"
import Link from "next/link"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { obtenerFotosCoche } from "@/lib/storage"
import { CarThumbnail } from "@/components/car-thumbnail"

// Tipo para los parámetros de búsqueda
interface SearchParams {
  filter?: string
  q?: string
}

// Función para calcular el estado de la fecha de ITV
function getITVStatus(date: string): { isUrgent: boolean; isOverdue: boolean; daysRemaining: number } {
  const targetDate = new Date(date)
  const today = new Date()
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    isUrgent: diffDays <= 30 && diffDays >= 0, // Próxima a vencer (30 días o menos)
    isOverdue: diffDays < 0, // Ya vencida
    daysRemaining: diffDays,
  }
}

// Función para formatear fecha
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function normalizarTexto(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function extraerValoresBuscables(value: unknown, values: string[]) {
  if (value === null || value === undefined) {
    return
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    values.push(String(value))
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extraerValoresBuscables(item, values))
    return
  }

  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => extraerValoresBuscables(item, values))
  }
}

function coincideBusquedaLibre(coche: Record<string, unknown>, query: string): boolean {
  const queryNormalizada = normalizarTexto(query)
  if (!queryNormalizada) {
    return true
  }

  const values: string[] = []
  extraerValoresBuscables(coche, values)

  return values.some((value) => normalizarTexto(value).includes(queryNormalizada))
}

function buildCochesHref(filter?: string, q?: string): string {
  const params = new URLSearchParams()
  const textoBusqueda = q?.trim()

  if (filter) {
    params.set("filter", filter)
  }

  if (textoBusqueda) {
    params.set("q", textoBusqueda)
  }

  const queryString = params.toString()
  return queryString ? `/coches?${queryString}` : "/coches"
}

async function getCoches(filter?: string, q?: string) {
  try {
    // Primero obtenemos todos los empleados para crear un mapa
    const { data: empleados } = await supabase.from("empleados").select("id, nombre, apellidos")

    const empleadosMap = new Map()
    if (empleados) {
      empleados.forEach((emp) => {
        empleadosMap.set(emp.id.toString(), `${emp.nombre} ${emp.apellidos}`)
      })
    }

    // Obtenemos TODOS los coches sin filtros iniciales para evitar problemas de conversión de tipos
    const { data: coches, error } = await supabase.from("coches").select("*").order("matricula", { ascending: true })

    if (error) {
      console.error("Error fetching coches:", error)
      return []
    }

    // Aplicamos los filtros en JavaScript en lugar de SQL para evitar problemas de conversión
    let cochesFiltrados = [...(coches || [])]

    if (filter === "assigned") {
      // Coches asignados: tienen valor en asignadoa y no son donantes
      cochesFiltrados = cochesFiltrados.filter(
        (coche) =>
          coche.asignadoa !== null &&
          coche.asignadoa !== undefined &&
          coche.asignadoa !== "" &&
          coche.donante === false,
      )
    } else if (filter === "available") {
      // Coches disponibles: sin valor en asignadoa y no son donantes
      cochesFiltrados = cochesFiltrados.filter(
        (coche) =>
          (coche.asignadoa === null || coche.asignadoa === undefined || coche.asignadoa === "") &&
          coche.donante === false,
      )
    } else if (filter === "rental") {
      // Coches de alquiler
      cochesFiltrados = cochesFiltrados.filter((coche) => coche.alquiler === true)
    } else if (filter === "donor") {
      // Coches donantes
      cochesFiltrados = cochesFiltrados.filter((coche) => coche.donante === true)
    }

    // Obtener ITVs para todos los coches - usando los nombres correctos de las columnas
    const { data: itvs } = await supabase
      .from("itvs")
      .select("matricula, fechaproximarevision")
      .order("fecharevision", { ascending: false })

    // Crear un mapa de próximas revisiones por matrícula
    const proximasRevisionesMap = new Map()
    if (itvs) {
      itvs.forEach((itv) => {
        if (!proximasRevisionesMap.has(itv.matricula)) {
          proximasRevisionesMap.set(itv.matricula, itv.fechaproximarevision)
        }
      })
    }

    // Obtener tarjetas SOLRED asignadas para todos los coches
    const { data: tarjetasSolred } = await supabase
      .from("solred_coches")
      .select(`
        matricula,
        numero_tarjeta,
        tarjetassolred (
          numero_tarjeta,
          pin,
          fechavencimiento
        )
      `)
      .eq("activa", true)

    // Crear un mapa de tarjetas por matrícula
    const tarjetasMap = new Map()
    if (tarjetasSolred) {
      tarjetasSolred.forEach((relacion) => {
        tarjetasMap.set(relacion.matricula, relacion.tarjetassolred)
      })
    }

    // Obtener tarjetas ViaT activas asignadas por matrícula
    const { data: tarjetasViat } = await supabase
      .from("viat_coches")
      .select(`
        matricula,
        viat_id,
        viats (
          id,
          fechacaducidad
        )
      `)
      .is("fecha_desasignacion", null)

    // Crear un mapa de tarjetas ViaT por matrícula
    const viatMap = new Map()
    if (tarjetasViat) {
      tarjetasViat.forEach((relacion) => {
        if (relacion.matricula) {
          const matriculaNormalizada = String(relacion.matricula).trim().toUpperCase()
          viatMap.set(matriculaNormalizada, relacion.viats || { id: relacion.viat_id })
        }
      })
    }

    // Obtener seguros activos para todos los coches
    const { data: segurosActivos } = await supabase.from("seguros").select("*").eq("activo", true)

    // Crear un mapa de seguros por matrícula
    const segurosMap = new Map()
    if (segurosActivos) {
      segurosActivos.forEach((seguro) => {
        segurosMap.set(seguro.matricula, seguro)
      })
    }

    // Enriquecer los coches con los nombres de empleados, próximas revisiones, tarjetas SOLRED y ViaT
    const cochesConEmpleados = cochesFiltrados.map((coche) => {
      const proximaRevision = proximasRevisionesMap.get(coche.matricula)
      const tarjetaSolred = tarjetasMap.get(coche.matricula)
      const seguroActivo = segurosMap.get(coche.matricula)

      // Determinar el nombre del empleado asignado
      let empleadoNombre = null
      const tarjetaViat = viatMap.get(String(coche.matricula).trim().toUpperCase()) || null

      // Solo procesamos asignadoa si no es null, undefined o cadena vacía
      if (coche.asignadoa !== null && coche.asignadoa !== undefined && coche.asignadoa !== "") {
        // Si es un número, usamos directamente
        if (typeof coche.asignadoa === "number") {
          empleadoNombre = empleadosMap.get(coche.asignadoa.toString()) || `ID: ${coche.asignadoa}`
        }
        // Si es string, intentamos buscar en el mapa o usamos el valor directamente
        else if (typeof coche.asignadoa === "string") {
          // Intentamos convertir a número si parece ser un ID
          if (/^\d+$/.test(coche.asignadoa)) {
            empleadoNombre = empleadosMap.get(coche.asignadoa) || `ID: ${coche.asignadoa}`
          } else {
            // Si no es un número, usamos el texto directamente
            empleadoNombre = coche.asignadoa
          }
        }
      }

      return {
        ...coche,
        empleadoNombre,
        proximaRevisionITV: proximaRevision || null,
        tarjetaSolred,
        tarjetaViat,
        seguroActivo,
      }
    })

    // Búsqueda libre por cualquier valor serializable del coche enriquecido
    const textoBusqueda = q?.trim()
    const cochesTrasBusqueda = textoBusqueda
      ? cochesConEmpleados.filter((coche) => coincideBusquedaLibre(coche as Record<string, unknown>, textoBusqueda))
      : cochesConEmpleados

    // Obtener primera foto para cada coche
    const cochesConFotos = await Promise.all(
      cochesTrasBusqueda.map(async (coche) => {
        let primeraFoto = null
        try {
          const resultado = await obtenerFotosCoche(coche.matricula)
          if (resultado.success && resultado.fotos && resultado.fotos.length > 0) {
            primeraFoto = resultado.fotos[0]
          }
        } catch (error) {
          // Silenciar errores de fotos para no interrumpir la carga de la página
        }

        return {
          ...coche,
          primeraFoto,
        }
      }),
    )

    return cochesConFotos
  } catch (error) {
    console.error("Error en getCoches:", error)
    return []
  }
}

export default async function CochesPage({ searchParams }: { searchParams: SearchParams }) {
  // Obtener el filtro de los parámetros de búsqueda
  const filter = searchParams.filter
  const q = searchParams.q?.trim() || ""
  const coches = await getCoches(filter, q)
  const hasSearch = q.length > 0

  // Determinar el título según el filtro
  let title = "Gestión de Coches"
  let subtitle = `Administra la flota de vehículos (${coches.length} vehículos)`

  if (filter === "assigned") {
    title = "Coches Asignados"
    subtitle = `Vehículos asignados a empleados (${coches.length} vehículos)`
  } else if (filter === "available") {
    title = "Coches Disponibles"
    subtitle = `Vehículos disponibles (${coches.length} vehículos)`
  } else if (filter === "rental") {
    title = "Coches de Alquiler"
    subtitle = `Vehículos de alquiler (${coches.length} vehículos)`
  } else if (filter === "donor") {
    title = "Coches Donantes"
    subtitle = `Vehículos donantes para piezas (${coches.length} vehículos)`
  }

  if (hasSearch) {
    subtitle = `${subtitle} · búsqueda: "${q}"`
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            {filter && (
              <Link
                href={buildCochesHref(undefined, q)}
                className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
              >
                <Filter className="h-5 w-5 mr-2" />
                Quitar filtros
              </Link>
            )}
            <Link
              href="/coches/nuevo"
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Coche
            </Link>
          </div>
        </div>

        {/* Filtros rápidos + búsqueda libre */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-6">
          {!filter && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildCochesHref("assigned", q)}
                className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1.5 rounded-md text-sm flex items-center"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Ver asignados
              </Link>
              <Link
                href={buildCochesHref("available", q)}
                className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-md text-sm flex items-center"
              >
                <Car className="h-4 w-4 mr-1.5" />
                Ver disponibles
              </Link>
              <Link
                href={buildCochesHref("rental", q)}
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1.5 rounded-md text-sm flex items-center"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Ver alquileres
              </Link>
              <Link
                href={buildCochesHref("donor", q)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-md text-sm flex items-center"
              >
                <Car className="h-4 w-4 mr-1.5" />
                Ver donantes
              </Link>
            </div>
          )}

          <form action="/coches" method="get" className="w-full xl:w-auto flex flex-col sm:flex-row gap-2">
            {filter && <input type="hidden" name="filter" value={filter} />}
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Filtrar por matrícula, marca, empleado, ViaT, PIN..."
                className="h-9 w-full sm:w-[360px] rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 whitespace-nowrap"
            >
              Buscar
            </button>
            {hasSearch && (
              <Link
                href={buildCochesHref(filter)}
                className="h-9 px-3 rounded-md bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 inline-flex items-center justify-center whitespace-nowrap"
              >
                Limpiar
              </Link>
            )}
          </form>
        </div>

        {coches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter || hasSearch ? "No hay vehículos que coincidan con el filtro" : "No hay vehículos registrados"}
              </h3>
              <p className="text-gray-600 mb-4">
                {filter || hasSearch
                  ? "Prueba con otro filtro o agrega nuevos vehículos a la flota."
                  : "Comienza agregando tu primer vehículo a la flota."}
              </p>
              <div className="flex justify-center gap-4">
                {(filter || hasSearch) && (
                  <Link
                    href="/coches"
                    className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    <Filter className="h-5 w-5 mr-2" />
                    Ver todos los coches
                  </Link>
                )}
                <Link
                  href="/coches/nuevo"
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {filter || hasSearch ? "Agregar Vehículo" : "Agregar Primer Coche"}
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coches.map((coche) => {
              const empleadoAsignado = coche.empleadoNombre

              // Calcular el estado de la ITV
              const itvStatus = coche.proximaRevisionITV ? getITVStatus(coche.proximaRevisionITV) : null

              return (
                <Card key={coche.matricula} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{coche.matricula}</CardTitle>
                        <p className="text-gray-600">
                          {coche.marca} {coche.modelo}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <CarThumbnail
                          src={coche.primeraFoto}
                          alt={`Foto de ${coche.matricula}`}
                          matricula={coche.matricula}
                        />
                        {empleadoAsignado ? (
                          <p className="text-sm text-blue-600 font-medium text-right mt-1">{empleadoAsignado}</p>
                        ) : (
                          <p className="text-sm text-gray-400 mt-1">Sin asignar</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {coche.color && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Color:</span>
                          <span>{coche.color}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Kilómetros:</span>
                        <span>{coche.kms?.toLocaleString() || 0} km</span>
                      </div>
                      {coche.combustible && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Combustible:</span>
                          <span>{coche.combustible}</span>
                        </div>
                      )}
                      {/* Próxima revisión ITV */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Próxima ITV:</span>
                        <div className="flex items-center">
                          {coche.proximaRevisionITV ? (
                            <>
                              {itvStatus?.isOverdue && <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />}
                              {itvStatus?.isUrgent && !itvStatus?.isOverdue && (
                                <Clock className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              <span
                                className={
                                  itvStatus?.isOverdue || itvStatus?.isUrgent ? "text-red-600 font-semibold" : ""
                                }
                              >
                                {formatDate(coche.proximaRevisionITV)}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Sin datos</span>
                          )}
                        </div>
                      </div>
                      {/* Tarjeta SOLRED */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tarjeta SOLRED:</span>
                        <div className="flex items-center">
                          {coche.tarjetaSolred ? (
                            <>
                              <CreditCard className="h-4 w-4 text-blue-600 mr-1" />
                              <span className="text-blue-600 font-semibold">PIN: {coche.tarjetaSolred.pin}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Sin tarjeta</span>
                          )}
                        </div>
                      </div>
                      {/* Tarjeta ViaT */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tarjeta ViaT:</span>
                        <div className="flex items-center">
                          {coche.tarjetaViat ? (
                            <>
                              <Truck className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-green-600 font-semibold">{coche.tarjetaViat.id}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Sin tarjeta</span>
                          )}
                        </div>
                      </div>
                      {/* Seguro */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Seguro:</span>
                        <div className="flex items-center">
                          {coche.seguroActivo ? (
                            <div className="text-right">
                              <div className="flex items-center">
                                <span
                                  className={
                                    new Date(coche.seguroActivo.fecha_vencimiento) < new Date()
                                      ? "text-red-600 font-semibold"
                                      : "text-blue-600 font-semibold"
                                  }
                                >
                                  {formatDate(coche.seguroActivo.fecha_vencimiento)}
                                </span>
                              </div>
                              {coche.seguroActivo.telefono_asistencia1 && (
                                <span className="text-xs text-gray-600">
                                  Tel: {coche.seguroActivo.telefono_asistencia1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Sin seguro</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {coche.donante && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm">Donante</span>
                      )}
                      {coche.alquiler && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">Alquiler</span>
                      )}
                      {/* Badges de estado ITV */}
                      {itvStatus?.isOverdue && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          ITV VENCIDA
                        </span>
                      )}
                      {itvStatus?.isUrgent && !itvStatus?.isOverdue && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          ITV Urgente ({Math.abs(itvStatus.daysRemaining)} días)
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/coches/detalle/${encodeURIComponent(coche.matricula)}`}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                      >
                        Ver detalles
                      </Link>
                      <Link
                        href={`/coches/editar/${encodeURIComponent(coche.matricula)}`}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm"
                      >
                        Editar
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
