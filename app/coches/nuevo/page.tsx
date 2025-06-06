import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { crearCoche } from "./actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NuevoCochePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/coches" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
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
                {/* Información básica */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="matricula">Matrícula *</Label>
                    <Input id="matricula" name="matricula" placeholder="1234ABC" required className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="marca">Marca *</Label>
                    <Input id="marca" name="marca" placeholder="Toyota" required className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="modelo">Modelo *</Label>
                    <Input id="modelo" name="modelo" placeholder="Corolla" required className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input id="color" name="color" placeholder="Blanco" className="mt-1" />
                  </div>
                </div>

                {/* Información técnica */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="kilometros">Kilómetros</Label>
                    <Input
                      id="kilometros"
                      name="kilometros"
                      type="number"
                      placeholder="25000"
                      min="0"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="combustible">Tipo de Combustible</Label>
                    <select
                      name="combustible"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecciona el combustible</option>
                      <option value="gasolina">Gasolina</option>
                      <option value="diesel">Diesel</option>
                      <option value="hibrido">Híbrido</option>
                      <option value="electrico">Eléctrico</option>
                      <option value="gas">Gas</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Opciones especiales */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Opciones Especiales</h3>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="es_donante" name="es_donante" />
                    <Label htmlFor="es_donante">Vehículo donante</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="es_alquiler" name="es_alquiler" />
                    <Label htmlFor="es_alquiler">Vehículo de alquiler</Label>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="border-t pt-6">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  placeholder="Notas adicionales sobre el vehículo..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-6">
                <Link
                  href="/coches"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Crear Coche
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
