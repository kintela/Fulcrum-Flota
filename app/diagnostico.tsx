"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DiagnosticoPage() {
  const [coches, setCoches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    donantes: 0,
    asignados: 0,
    disponibles: 0,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch("/api/diagnostico", { cache: "no-store" })
        const body = await response.json()
        if (!response.ok) {
          throw new Error(body?.error || "Error cargando diagnóstico")
        }
        const data = body.coches || []

        setCoches(data || [])

        // Calcular estadísticas
        const total = data?.length || 0
        const donantes = data?.filter((c) => c.donante === true).length || 0
        const asignados =
          data?.filter((c) => !c.donante && c.asignadoa !== null && c.asignadoa !== undefined && c.asignadoa !== "")
            .length || 0
        const disponibles = total - donantes - asignados

        setStats({
          total,
          donantes,
          asignados,
          disponibles,
        })
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Página de Diagnóstico</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estadísticas Calculadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Coches</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Donantes</p>
                <p className="text-2xl font-bold">{stats.donantes}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Asignados</p>
                <p className="text-2xl font-bold">{stats.asignados}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold">{stats.disponibles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos Crudos de Coches</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando datos...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Matrícula</th>
                      <th className="border p-2 text-left">Marca/Modelo</th>
                      <th className="border p-2 text-left">Donante</th>
                      <th className="border p-2 text-left">Asignado a</th>
                      <th className="border p-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coches.map((coche) => {
                      const isDonante = coche.donante === true
                      const isAsignado =
                        !isDonante &&
                        coche.asignadoa !== null &&
                        coche.asignadoa !== undefined &&
                        coche.asignadoa !== ""

                      let estado = "Disponible"
                      if (isDonante) estado = "Donante"
                      else if (isAsignado) estado = "Asignado"

                      return (
                        <tr key={coche.matricula} className="hover:bg-gray-50">
                          <td className="border p-2">{coche.matricula}</td>
                          <td className="border p-2">
                            {coche.marca} {coche.modelo}
                          </td>
                          <td className="border p-2">
                            {isDonante ? (
                              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm">Sí</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">No</span>
                            )}
                          </td>
                          <td className="border p-2">
                            {coche.asignadoa ? (
                              <span className="font-medium">{coche.asignadoa}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border p-2">
                            <span
                              className={`px-2 py-1 rounded text-sm ${
                                isDonante
                                  ? "bg-amber-100 text-amber-800"
                                  : isAsignado
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {estado}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
