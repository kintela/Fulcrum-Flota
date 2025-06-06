import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { crearCoche, obtenerEmpleados } from "@/app/actions/coches"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function NuevoCochePage() {
  const empleados = await obtenerEmpleados()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/coches" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="h-5 w-5 mr-1" />
            Volver a Coches
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Coche</h1>
            <p className="text-gray-600">Registra un nuevo vehículo en la flota</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={crearCoche} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matrícula */}
                <div>
                  <label htmlFor="matricula" className="block text-sm font-medium text-gray-700 mb-2">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    id="matricula"
                    name="matricula"
                    required
                    placeholder="1234ABC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-2">
                    Marca *
                  </label>
                  <select
                    id="marca"
                    name="marca"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar marca</option>
                    <option value="Toyota">Toyota</option>
                    <option value="Ford">Ford</option>
                    <option value="Volkswagen">Volkswagen</option>
                    <option value="Nissan">Nissan</option>
                    <option value="Hyundai">Hyundai</option>
                    <option value="Renault">Renault</option>
                    <option value="Peugeot">Peugeot</option>
                    <option value="Citroën">Citroën</option>
                    <option value="Seat">Seat</option>
                    <option value="BMW">BMW</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="Audi">Audi</option>
                  </select>
                </div>

                {/* Modelo */}
                <div>
                  <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    id="modelo"
                    name="modelo"
                    required
                    placeholder="Corolla"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <select
                    id="color"
                    name="color"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar color</option>
                    <option value="Blanco">Blanco</option>
                    <option value="Negro">Negro</option>
                    <option value="Gris">Gris</option>
                    <option value="Azul">Azul</option>
                    <option value="Rojo">Rojo</option>
                    <option value="Verde">Verde</option>
                    <option value="Amarillo">Amarillo</option>
                    <option value="Plata">Plata</option>
                    <option value="Marrón">Marrón</option>
                  </select>
                </div>

                {/* Kilómetros */}
                <div>
                  <label htmlFor="kms" className="block text-sm font-medium text-gray-700 mb-2">
                    Kilómetros
                  </label>
                  <input
                    type="number"
                    id="kms"
                    name="kms"
                    min="0"
                    defaultValue="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Combustible */}
                <div>
                  <label htmlFor="combustible" className="block text-sm font-medium text-gray-700 mb-2">
                    Combustible *
                  </label>
                  <select
                    id="combustible"
                    name="combustible"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar combustible</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="GLP">GLP</option>
                  </select>
                </div>

                {/* Asignado a */}
                <div>
                  <label htmlFor="asignado_a" className="block text-sm font-medium text-gray-700 mb-2">
                    Asignado a
                  </label>
                  <select
                    id="asignado_a"
                    name="asignado_a"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {empleados.map((empleado: any) => (
                      <option key={empleado.id} value={empleado.nombre}>
                        {empleado.nombre} - {empleado.departamento}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    id="estado"
                    name="estado"
                    required
                    defaultValue="Disponible"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Activo">Activo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Fuera de servicio">Fuera de servicio</option>
                  </select>
                </div>

                {/* Fecha Seguro */}
                <div>
                  <label htmlFor="fecha_seguro" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha vencimiento seguro
                  </label>
                  <input
                    type="date"
                    id="fecha_seguro"
                    name="fecha_seguro"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Fecha ITV */}
                <div>
                  <label htmlFor="fecha_itv" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha vencimiento ITV
                  </label>
                  <input
                    type="date"
                    id="fecha_itv"
                    name="fecha_itv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="es_donante"
                    name="es_donante"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="es_donante" className="ml-2 block text-sm text-gray-700">
                    Es vehículo donante
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="es_alquiler"
                    name="es_alquiler"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="es_alquiler" className="ml-2 block text-sm text-gray-700">
                    Es vehículo de alquiler
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link
                  href="/coches"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Crear Coche
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
