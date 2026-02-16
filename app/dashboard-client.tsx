"use client"

import { useState, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Car, Users, AlertTriangle, CreditCard, Calendar, Navigation, MapPin } from "lucide-react"
import Link from "next/link"
import { MapaCoches } from "@/components/mapa-coches"
import { MisReservas } from "@/components/mis-reservas"

function DashboardStats({
  coches,
  empleados,
  itvAlerts,
  solredAlerts,
  alquilerAlerts,
  userRole,
  mapFunctions,
}: {
  coches: any[]
  empleados: any[]
  itvAlerts: any
  solredAlerts: any
  alquilerAlerts: any
  userRole: string
  mapFunctions?: {
    zoomToVehicle: (matricula: string) => void
    activateLocationMode: (matricula: string) => void
    cancelLocationMode: () => void
  } | null
}) {
  // Solo mostrar estadísticas detalladas a administradores
  if (userRole !== 'administrador') {
    const totalAlertasUsuario =
      Number(itvAlerts?.total ?? 0) + Number(solredAlerts?.total ?? 0) + Number(alquilerAlerts?.total ?? 0)

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Mis Coches Asignados */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mis Coches</p>
                <p className="text-2xl font-bold text-gray-900">{coches.length}</p>
              </div>
            </div>
            
            {/* Lista de vehículos del usuario */}
            {coches.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {coches.filter(c => !c.donante).map((coche) => (
                  <div key={coche.matricula} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <span className="font-medium text-gray-800">{coche.matricula}</span>
                    <div className="flex gap-1">
                      {coche.latitud && coche.longitud ? (
                        <button
                          onClick={() => mapFunctions?.zoomToVehicle(coche.matricula)}
                          className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                          title="Ver en mapa"
                          disabled={!mapFunctions}
                        >
                          <Navigation className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => mapFunctions?.activateLocationMode(coche.matricula)}
                          className="p-1 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors"
                          title="Ubicar vehículo"
                          disabled={!mapFunctions}
                        >
                          <MapPin className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mis Alertas */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${totalAlertasUsuario > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <AlertTriangle className={`h-6 w-6 ${totalAlertasUsuario > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mis Alertas</p>
                <p className={`text-2xl font-bold ${totalAlertasUsuario > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {totalAlertasUsuario}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estadísticas completas para administradores
  // Contar donantes
  const donantesCount = coches.filter((c) => c.donante === true).length

  // Contar asignados (sin incluir donantes)
  const asignadosReal = coches.filter(
    (c) => !c.donante && c.asignadoa !== null && c.asignadoa !== undefined && c.asignadoa !== "",
  ).length

  // Contar disponibles (sin incluir donantes)
  const disponiblesReal = coches.filter(
    (c) => !c.donante && (c.asignadoa === null || c.asignadoa === undefined || c.asignadoa === ""),
  ).length

  const totalCoches = coches.length

  const stats = {
    totalCoches: totalCoches,
    cochesAsignados: asignadosReal,
    cochesDisponibles: disponiblesReal,
    totalEmpleados: empleados.length,
    donorVehicles: donantesCount,
    totalAlertas: itvAlerts.total + solredAlerts.total + alquilerAlerts.total,
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      {/* 1. Total Coches */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Coches</p>
              <Link href="/coches" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                {stats.totalCoches}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Donantes */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-amber-50">
              <Car className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Donantes</p>
              <Link
                href="/coches?filter=donor"
                className="text-2xl font-bold text-gray-900 hover:text-amber-600 transition-colors"
              >
                {stats.donorVehicles}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Asignados */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Asignados</p>
              <Link
                href="/coches?filter=assigned"
                className="text-2xl font-bold text-gray-900 hover:text-orange-600 transition-colors"
              >
                {stats.cochesAsignados}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Disponibles */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50">
              <Car className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Disponibles</p>
              <Link
                href="/coches?filter=available"
                className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors"
              >
                {stats.cochesDisponibles}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Empleados */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Empleados</p>
              <Link
                href="/empleados"
                className="text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
              >
                {stats.totalEmpleados}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Alertas Totales */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stats.totalAlertas > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <AlertTriangle className={`h-6 w-6 ${stats.totalAlertas > 0 ? "text-red-600" : "text-gray-400"}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Alertas</p>
              <p className={`text-2xl font-bold ${stats.totalAlertas > 0 ? "text-red-600" : "text-gray-900"}`}>
                {stats.totalAlertas}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AlertsSection({ itvAlerts, coches, empleados }: { itvAlerts: any; coches: any[]; empleados: any[] }) {
  if (itvAlerts.total === 0) {
    return null
  }

  // Crear mapa de coches para obtener información adicional
  const cochesMap = new Map()
  coches.forEach((coche) => {
    cochesMap.set(coche.matricula, coche)
  })

  // Crear mapa de empleados para búsqueda rápida
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getDaysUntilDate = (dateString: string) => {
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Función para obtener información del empleado asignado
  const getEmpleadoInfo = (coche: any) => {
    if (!coche || !coche.asignadoa) return null

    // Si asignadoa es un número o string numérico, buscar en el mapa de empleados
    const empleadoId = Number(coche.asignadoa)
    if (!isNaN(empleadoId)) {
      return empleadosMap.get(empleadoId)
    }

    // Si es un string no numérico, devolverlo directamente
    if (typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") {
      return { nombre: coche.asignadoa, apellidos: "" }
    }

    return null
  }

  return (
    <Card className="mb-8 border-yellow-200 bg-yellow-50">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center text-yellow-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Alertas de ITV ({itvAlerts.total})
        </h2>

        {itvAlerts.vencidas > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-700 mb-2">ITVs Vencidas ({itvAlerts.vencidas})</h3>
            <div className="space-y-2">
              {itvAlerts.detalles
                .filter((itv: any) => new Date(itv.fechaproximarevision) < new Date())
                .map((itv: any) => {
                  const coche = cochesMap.get(itv.matricula) || itv.coches
                  const daysOverdue = Math.abs(getDaysUntilDate(itv.fechaproximarevision))
                  const empleadoInfo = getEmpleadoInfo(coche)

                  return (
                    <div key={itv.id} className="p-3 bg-red-100 border border-red-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-red-800">
                            {itv.matricula} - {coche ? `${coche.marca} ${coche.modelo}` : "Información no disponible"}
                            {empleadoInfo && (
                              <span className="ml-2 text-red-700 font-normal">
                                (Asignado a: {empleadoInfo.nombre} {empleadoInfo.apellidos})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-red-600">
                            ITV vencida hace {daysOverdue} días (venció el {formatDate(itv.fechaproximarevision)})
                          </p>
                        </div>
                        <Link
                          href={`/coches/detalle/${coche?.matricula || itv.matricula}`}
                          className="text-red-600 hover:text-red-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {itvAlerts.proximasVencer > 0 && (
          <div>
            <h3 className="font-semibold text-yellow-700 mb-2">ITVs Próximas a Vencer ({itvAlerts.proximasVencer})</h3>
            <div className="space-y-2">
              {itvAlerts.detalles
                .filter((itv: any) => {
                  const fecha = new Date(itv.fechaproximarevision)
                  const today = new Date()
                  return fecha >= today
                })
                .map((itv: any) => {
                  const coche = cochesMap.get(itv.matricula) || itv.coches
                  const daysUntil = getDaysUntilDate(itv.fechaproximarevision)
                  const empleadoInfo = getEmpleadoInfo(coche)

                  return (
                    <div key={itv.id} className="p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-yellow-800">
                            {itv.matricula} - {coche ? `${coche.marca} ${coche.modelo}` : "Información no disponible"}
                            {empleadoInfo && (
                              <span className="ml-2 text-yellow-700 font-normal">
                                (Asignado a: {empleadoInfo.nombre} {empleadoInfo.apellidos})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-yellow-600">
                            ITV en {daysUntil} días ({formatDate(itv.fechaproximarevision)})
                          </p>
                        </div>
                        <Link
                          href={`/coches/detalle/${coche?.matricula || itv.matricula}`}
                          className="text-yellow-600 hover:text-yellow-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SolredAlertsSection({ solredAlerts, empleados }: { solredAlerts: any; empleados: any[] }) {
  if (solredAlerts.total === 0) {
    return null
  }

  // Crear mapa de empleados para búsqueda rápida
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getDaysUntilDate = (dateString: string) => {
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Función para obtener información del empleado asignado
  const getEmpleadoInfo = (coche: any) => {
    if (!coche || !coche.asignadoa) return null

    // Si asignadoa es un número o string numérico, buscar en el mapa de empleados
    const empleadoId = Number(coche.asignadoa)
    if (!isNaN(empleadoId)) {
      return empleadosMap.get(empleadoId)
    }

    // Si es un string no numérico, devolverlo directamente
    if (typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") {
      return { nombre: coche.asignadoa, apellidos: "" }
    }

    return null
  }

  return (
    <Card className="mb-8 border-orange-200 bg-orange-50">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center text-orange-800">
          <CreditCard className="h-5 w-5 mr-2" />
          Alertas de Tarjetas SOLRED ({solredAlerts.total})
        </h2>

        {solredAlerts.vencidas > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-700 mb-2">Tarjetas Vencidas ({solredAlerts.vencidas})</h3>
            <div className="space-y-2">
              {solredAlerts.detalles
                .filter((asignacion: any) => new Date(asignacion.tarjetassolred.fechavencimiento) < new Date())
                .map((asignacion: any) => {
                  const daysOverdue = Math.abs(getDaysUntilDate(asignacion.tarjetassolred.fechavencimiento))
                  const empleadoInfo = getEmpleadoInfo(asignacion.coches)

                  return (
                    <div key={asignacion.id} className="p-3 bg-red-100 border border-red-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-red-800">
                            {asignacion.matricula} -{" "}
                            {asignacion.coches
                              ? `${asignacion.coches.marca} ${asignacion.coches.modelo}`
                              : "Información no disponible"}
                            {empleadoInfo && (
                              <span className="ml-2 text-red-700 font-normal">
                                (Asignado a: {empleadoInfo.nombre} {empleadoInfo.apellidos})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-red-600">
                            Tarjeta {asignacion.tarjetassolred.numero_tarjeta} vencida hace {daysOverdue} días (venció
                            el {formatDate(asignacion.tarjetassolred.fechavencimiento)})
                          </p>
                        </div>
                        <Link
                          href={`/coches/detalle/${asignacion.matricula}`}
                          className="text-red-600 hover:text-red-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {solredAlerts.proximasVencer > 0 && (
          <div>
            <h3 className="font-semibold text-orange-700 mb-2">
              Tarjetas Próximas a Vencer ({solredAlerts.proximasVencer})
            </h3>
            <div className="space-y-2">
              {solredAlerts.detalles
                .filter((asignacion: any) => {
                  const fecha = new Date(asignacion.tarjetassolred.fechavencimiento)
                  const today = new Date()
                  return fecha >= today
                })
                .map((asignacion: any) => {
                  const daysUntil = getDaysUntilDate(asignacion.tarjetassolred.fechavencimiento)
                  const empleadoInfo = getEmpleadoInfo(asignacion.coches)

                  return (
                    <div key={asignacion.id} className="p-3 bg-orange-100 border border-orange-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-orange-800">
                            {asignacion.matricula} -{" "}
                            {asignacion.coches
                              ? `${asignacion.coches.marca} ${asignacion.coches.modelo}`
                              : "Información no disponible"}
                            {empleadoInfo && (
                              <span className="ml-2 text-orange-700 font-normal">
                                (Asignado a: {empleadoInfo.nombre} {empleadoInfo.apellidos})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-orange-600">
                            Tarjeta {asignacion.tarjetassolred.numero_tarjeta} vence en {daysUntil} días (
                            {formatDate(asignacion.tarjetassolred.fechavencimiento)})
                          </p>
                        </div>
                        <Link
                          href={`/coches/detalle/${asignacion.matricula}`}
                          className="text-orange-600 hover:text-orange-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AlquilerAlertsSection({ alquilerAlerts, empleados }: { alquilerAlerts: any; empleados: any[] }) {
  if (alquilerAlerts.total === 0) {
    return null
  }

  // Crear mapa de empleados para búsqueda rápida
  const empleadosMap = new Map()
  empleados.forEach((empleado) => {
    empleadosMap.set(empleado.id, empleado)
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getDaysUntilDate = (dateString: string) => {
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Función para obtener información del empleado asignado
  const getEmpleadoInfo = (coche: any) => {
    if (!coche || !coche.asignadoa) return null

    // Si asignadoa es un número o string numérico, buscar en el mapa de empleados
    const empleadoId = Number(coche.asignadoa)
    if (!isNaN(empleadoId)) {
      return empleadosMap.get(empleadoId)
    }

    // Si es un string no numérico, devolverlo directamente
    if (typeof coche.asignadoa === "string" && coche.asignadoa.trim() !== "") {
      return { nombre: coche.asignadoa, apellidos: "" }
    }

    return null
  }

  return (
    <Card className="mb-8 border-purple-200 bg-purple-50">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center text-purple-800">
          <Calendar className="h-5 w-5 mr-2" />
          Alertas de Alquileres ({alquilerAlerts.total})
        </h2>

        {alquilerAlerts.vencidos > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-700 mb-2">Alquileres Vencidos ({alquilerAlerts.vencidos})</h3>
            <div className="space-y-2">
              {alquilerAlerts.detalles
                .filter((alquiler: any) => new Date(alquiler.fecha_fin) < new Date())
                .map((alquiler: any) => {
                  const daysOverdue = Math.abs(getDaysUntilDate(alquiler.fecha_fin))
                  const empleadoInfo = getEmpleadoInfo(alquiler.coches)

                  return (
                    <div key={alquiler.id} className="p-3 bg-red-100 border border-red-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-red-800">
                            {alquiler.matricula} -{" "}
                            {alquiler.coches
                              ? `${alquiler.coches.marca} ${alquiler.coches.modelo}`
                              : "Información no disponible"}
                            {empleadoInfo && (
                              <span className="ml-2 text-red-700 font-normal">
                                (Asignado a: {empleadoInfo.nombre} {empleadoInfo.apellidos})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-red-600">
                            Alquiler de {alquiler.compania} vencido hace {daysOverdue} días (venció el{" "}
                            {formatDate(alquiler.fecha_fin)})
                          </p>
                          {alquiler.importe_anual && (
                            <p className="text-sm text-red-600">Importe anual: {alquiler.importe_anual}€</p>
                          )}
                        </div>
                        <Link
                          href={`/coches/detalle/${alquiler.matricula}`}
                          className="text-red-600 hover:text-red-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {alquilerAlerts.proximosVencer > 0 && (
          <div>
            <h3 className="font-semibold text-purple-700 mb-2">
              Alquileres Próximos a Vencer ({alquilerAlerts.proximosVencer})
            </h3>
            <div className="space-y-2">
              {alquilerAlerts.detalles
                .filter((alquiler: any) => {
                  const fecha = new Date(alquiler.fecha_fin)
                  const today = new Date()
                  return fecha >= today
                })
                .map((alquiler: any) => {
                  const daysUntil = getDaysUntilDate(alquiler.fecha_fin)
                  const empleadoInfo = getEmpleadoInfo(alquiler.coches)

                  return (
                    <div key={alquiler.id} className="p-3 bg-purple-100 border border-purple-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-purple-800">
                            {alquiler.matricula} -{" "}
                            {alquiler.coches
                              ? `${alquiler.coches.marca} ${alquiler.coches.modelo}`
                              : "Información no disponible"}
                            {empleadoInfo && (
                              <span className="ml-2 text-purple-700 font-normal">
                                (Asignado a: {empleadoInfo.nombre} {empleadoInfo.apellidos})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-purple-600">
                            Alquiler de {alquiler.compania} vence en {daysUntil} días ({formatDate(alquiler.fecha_fin)})
                          </p>
                          {alquiler.importe_anual && (
                            <p className="text-sm text-purple-600">Importe anual: {alquiler.importe_anual}€</p>
                          )}
                        </div>
                        <Link
                          href={`/coches/detalle/${alquiler.matricula}`}
                          className="text-purple-600 hover:text-purple-800 text-sm underline"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardClient({
  coches,
  todosLosCoches,
  empleados,
  itvAlerts,
  solredAlerts,
  alquilerAlerts,
  userRole,
  userEmail,
}: {
  coches: any[]
  todosLosCoches: any[]
  empleados: any[]
  itvAlerts: any
  solredAlerts: any
  alquilerAlerts: any
  userRole: string
  userEmail: string
}) {
  const [mapFunctions, setMapFunctions] = useState<{
    zoomToVehicle: (matricula: string) => void
    activateLocationMode: (matricula: string) => void
    cancelLocationMode: () => void
  } | null>(null)
  
  // Estado para rastrear el coche que está siendo cancelado
  const [cocheEnCancelacion, setCocheEnCancelacion] = useState<string | null>(null)
  
  // Estado para las reservas del usuario (se actualizará desde MisReservas)
  const [misReservas, setMisReservas] = useState<Array<{ matricula: string; id: number; estado: string }>>([])
  const [reservasRefreshToken, setReservasRefreshToken] = useState(0)
  const [ubicacionOverrides, setUbicacionOverrides] = useState<Record<string, { latitud: number; longitud: number; direccion_actual?: string }>>({})

  const handleReservasChange = (reservas: Array<{ matricula: string; id: number; estado: string }>) => {
    setMisReservas(reservas)
  }
  const handleReservaCreada = () => {
    setReservasRefreshToken((prev) => prev + 1)
  }
  const handleUbicacionInicial = (matricula: string, ubicacion: { latitud: number; longitud: number; direccion_actual?: string }) => {
    setUbicacionOverrides((prev) => ({ ...prev, [matricula]: ubicacion }))
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'administrador' ? 'Dashboard' : 'Mi Dashboard'}
          </h1>
          <p className="text-gray-600">
            {userRole === 'administrador' ? 'Resumen general de la flota' : 'Resumen de mis vehículos asignados'}
          </p>
        </div>

        <Suspense fallback={<div>Cargando estadísticas...</div>}>
          <DashboardStats
            coches={coches}
            empleados={empleados}
            itvAlerts={itvAlerts}
            solredAlerts={solredAlerts}
            alquilerAlerts={alquilerAlerts}
            userRole={userRole}
            mapFunctions={mapFunctions}
          />
        </Suspense>

        <Suspense fallback={<div>Cargando alertas...</div>}>
          <AlertsSection itvAlerts={itvAlerts} coches={coches} empleados={empleados} />
        </Suspense>

        <Suspense fallback={<div>Cargando alertas SOLRED...</div>}>
          <SolredAlertsSection solredAlerts={solredAlerts} empleados={empleados} />
        </Suspense>

        <Suspense fallback={<div>Cargando alertas de alquileres...</div>}>
          <AlquilerAlertsSection alquilerAlerts={alquilerAlerts} empleados={empleados} />
        </Suspense>

        {/* Mis Reservas - Visible para todos los usuarios */}
        <Suspense fallback={<div>Cargando reservas...</div>}>
          <MisReservas 
            onCocheEnCancelacion={setCocheEnCancelacion}
            onReservasChange={handleReservasChange}
            refreshToken={reservasRefreshToken}
            onUbicacionInicial={handleUbicacionInicial}
          />
        </Suspense>

        {/* Mapa de vehículos - Visible para todos los usuarios */}
        <Suspense fallback={<div>Cargando mapa...</div>}>
          <MapaCoches 
            coches={todosLosCoches} 
            empleados={empleados} 
            userRole={userRole}
            userEmail={userEmail}
            miCocheMatricula={cocheEnCancelacion}
            misReservas={misReservas}
            onFunctionsReady={setMapFunctions}
            onReservaCreada={handleReservaCreada}
            locationOverrides={ubicacionOverrides}
          />
        </Suspense>
      </div>
    </div>
  )
}
