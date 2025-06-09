"use client"

import { useEffect, useState } from "react"

export default function Home() {
  const [cochesArray, setCochesArray] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCoches()
  }, [])

  const fetchCoches = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/coches")
      const data = await res.json()
      setCochesArray(data)
    } catch (error) {
      console.error("Error fetching coches:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  const totalCoches = cochesArray.length
  const cochesDisponibles = cochesArray.filter((c) => !c.empleado_id && !c.asignadoa).length
  const cochesEnTaller = cochesArray.filter((c) => c.taller).length
  const cochesDadosDeBaja = cochesArray.filter((c) => c.dado_de_baja).length
  const cochesAsignados = cochesArray.filter((c) => c.empleado_id || c.asignadoa).length

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard de Gestión de Vehículos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow-md rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Total de Vehículos</h2>
          <p className="text-3xl font-bold">{totalCoches}</p>
        </div>

        <div className="bg-white shadow-md rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Vehículos Disponibles</h2>
          <p className="text-3xl font-bold">{cochesDisponibles}</p>
        </div>

        <div className="bg-white shadow-md rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Vehículos Asignados</h2>
          <p className="text-3xl font-bold">{cochesAsignados}</p>
        </div>

        <div className="bg-white shadow-md rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Vehículos en Taller</h2>
          <p className="text-3xl font-bold">{cochesEnTaller}</p>
        </div>

        <div className="bg-white shadow-md rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Vehículos Dados de Baja</h2>
          <p className="text-3xl font-bold">{cochesDadosDeBaja}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Listado de Vehículos</h2>
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Marca
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Modelo
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Matrícula
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Empleado ID
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Asignado A
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Taller
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Dado de Baja
              </th>
            </tr>
          </thead>
          <tbody>
            {cochesArray.map((coche) => (
              <tr key={coche.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{coche.marca}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{coche.modelo}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{coche.matricula}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{coche.empleado_id || "N/A"}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{coche.asignadoa || "N/A"}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{coche.taller ? "Sí" : "No"}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {coche.dado_de_baja ? "Sí" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
