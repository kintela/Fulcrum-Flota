import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

                  <div>
                    <Label htmlFor="anio">Año</Label>
                    <Input
                      id="anio"
                      name="anio"
                      type="number"
                      placeholder="2023"
                      min="1990"
                      max="2025"
                      className="mt-1"
                    />
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
                    <Select name="combustible">
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona el combustible" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasolina">Gasolina</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                        <SelectItem value="electrico">Eléctrico</SelectItem>
                        <SelectItem value="gas">Gas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="numero_bastidor">Número de Bastidor</Label>
                    <Input id="numero_bastidor" name="numero_bastidor" placeholder="VIN123456789" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="precio_compra">Precio de Compra (€)</Label>
                    <Input
                      id="precio_compra"
                      name="precio_compra"
                      type="number"
                      step="0.01"
                      placeholder="15000.00"
                      min="0"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_compra">Fecha de Compra</Label>
                    <Input id="fecha_compra" name="fecha_compra" type="date" className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Fechas importantes */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Fechas Importantes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fecha_seguro">Vencimiento Seguro</Label>
                    <Input id="fecha_seguro" name="fecha_seguro" type="date" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="fecha_itv">Vencimiento ITV</Label>
                    <Input id="fecha_itv" name="fecha_itv" type="date" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="fecha_revision">Próxima Revisión</Label>
                    <Input id="fecha_revision" name="fecha_revision" type="date" className="mt-1" />
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
