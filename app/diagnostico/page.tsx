"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

export default function DiagnosticoPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Obtener todos los coches
        const { data: coches, error: cochesError } = await supabase.from("coches").select("*")

        if (cochesError) throw new Error(cochesError.message)

        // Obtener todos los empleados
        const { data: empleados, error: empleadosError } = await supabase.from("empleados").select("*")

        if (empleadosError) throw new Error(empleadosError.message)

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

        setData({
          estadisticas: {
            total: coches.length,
            donantes: donantesCount,
            asignados: asignadosCount,
            disponibles: disponiblesCount,
          },
          coches: cochesConDetalles,
          empleados,
        })
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Diagnóstico del Sistema</h1>
          <div className="p-8 text-center">Cargando datos...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Diagnóstico del Sistema</h1>
          <div className="p-8 text-center bg-red-100 text-red-800 rounded-lg">Error al cargar datos: {error}</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Diagnóstico del Sistema</h1>
          <div className="p-8 text-center">No se encontraron datos</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Diagnóstico del Sistema</h1>

        {/* Estadísticas */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Vehículos</p>
                <p className="text-2xl font-bold">{data.estadisticas.total}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold">{data.estadisticas.disponibles}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Asignados</p>
                <p className="text-2xl font-bold">{data.estadisticas.asignados}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">Donantes</p>
                <p className="text-2xl font-bold">{data.estadisticas.donantes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de vehículos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detalle de Vehículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead>Valor asignadoa</TableHead>
                    <TableHead>Donante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.coches.map((coche: any) => (
                    <TableRow key={coche.matricula}>
                      <TableCell>{coche.matricula}</TableCell>
                      <TableCell>
                        {coche.marca} {coche.modelo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            coche.estado === "Donante"
                              ? "bg-amber-100 text-amber-800"
                              : coche.estado === "Asignado"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                          }
                        >
                          {coche.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{coche.empleadoAsignado}</TableCell>
                      <TableCell>
                        <code className="bg-gray-100 p-1 rounded text-xs">
                          {coche.asignadoa === null
                            ? "null"
                            : coche.asignadoa === undefined
                              ? "undefined"
                              : coche.asignadoa === ""
                                ? '""'
                                : JSON.stringify(coche.asignadoa)}
                        </code>
                      </TableCell>
                      <TableCell>{coche.donante ? "Sí" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de empleados */}
        <Card>
          <CardHeader>
            <CardTitle>Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.empleados.map((empleado: any) => (
                    <TableRow key={empleado.id}>
                      <TableCell>{empleado.id}</TableCell>
                      <TableCell>{empleado.nombre}</TableCell>
                      <TableCell>{empleado.apellidos}</TableCell>
                      <TableCell>{empleado.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
