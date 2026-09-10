import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Archive, ArrowLeft, Car, Calendar, CreditCard, MapPin, User, Wrench } from "lucide-react"
import Link from "next/link"
import { supabaseServer as supabase } from "@/lib/supabase-server"
import { AlquilerManager } from "@/components/alquiler-manager"
import { CocheUbicacionMapa } from "@/components/coche-ubicacion-mapa"
import { FotosManager } from "@/components/fotos-manager"
import { ITVManager } from "@/components/itv-manager"
import { MantenimientoManager } from "@/components/mantenimiento-manager"
import { SeguroManager } from "@/components/seguro-manager"
import { ViatManager } from "@/components/viat-manager"
import { RestoreCocheButton } from "@/components/restore-coche-button"

async function getCoche(id: string) {
  if (!id || id === "undefined") {
    return null
  }

  try {
    // Consulta básica sin join para evitar problemas de relación
    const { data, error } = await supabase.from("coches").select("*").eq("matricula", id).single()

    if (error) {
      console.error("Error al obtener coche:", error)
      return null
    }

    const empleadoId = data.asignadoa

    if (empleadoId) {
      const { data: empleadoData, error: empleadoError } = await supabase
        .from("empleados")
        .select("id, nombre, apellidos")
        .eq("id", empleadoId)
        .single()

      if (!empleadoError && empleadoData) {
        // Añadimos los datos del empleado al objeto del coche
        data.empleados = empleadoData
      } else {
        console.error("Error al obtener empleado:", empleadoError)
      }
    }

    // Obtener información de la tarjeta SOLRED
    const { data: solredData, error: solredError } = await supabase
      .from("solred_coches")
      .select(`
        numero_tarjeta,
        tarjetassolred (
          numero_tarjeta,
          pin,
          fechavencimiento
        )
      `)
      .eq("matricula", id)
      .eq("activa", true)
      .single()

    if (!solredError && solredData) {
      data.tarjeta_solred = solredData
    }

    return data
  } catch (error) {
    console.error("Error en getCoche:", error)
    return null
  }
}

interface CocheDetailPageProps {
  params: { id: string }
}

export default async function CocheDetailPage({ params }: CocheDetailPageProps) {
  const coche = await getCoche(params.id)

  if (!coche) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Coche no encontrado</h1>
          <p className="text-gray-600 mb-8">No se pudo encontrar el coche con matrícula {params.id}</p>
          <Link href="/coches" className="text-blue-600 hover:underline">
            Volver a la lista de coches
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3 md:items-center">
          <div className="flex justify-start">
            <Link
              href={coche.eliminado ? "/coches?filter=deleted" : "/coches"}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {coche.eliminado ? "Volver a coches dados de baja" : "Volver a Coches"}
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{coche.matricula}</h1>
            <p className="text-gray-600">
              {coche.marca} {coche.modelo}
            </p>
            {coche.eliminado && (
              <span className="mt-2 inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                <Archive className="mr-1.5 h-4 w-4" />
                Dado de baja
              </span>
            )}
          </div>
          <div className="flex justify-start md:justify-end">
            {coche.eliminado ? (
              <RestoreCocheButton matricula={coche.matricula} />
            ) : (
              <Link
                href={`/coches/editar/${encodeURIComponent(coche.matricula)}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Editar Coche
              </Link>
            )}
          </div>
        </div>

        {coche.eliminado && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-gray-500">Fecha de baja: </span>
                <span className="font-medium">
                  {coche.fecha_eliminacion
                    ? new Date(coche.fecha_eliminacion).toLocaleString("es-ES")
                    : "Sin datos"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Dado de baja por: </span>
                <span className="font-medium">{coche.eliminado_por || "Sin datos"}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Matrícula:</span>
                <span className="font-medium">{coche.matricula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Marca:</span>
                <span>{coche.marca}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modelo:</span>
                <span>{coche.modelo}</span>
              </div>
              {coche.color && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Color:</span>
                  <span>{coche.color}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Combustible:</span>
                <span>{coche.combustible}</span>
              </div>
              {coche.fechamatriculacion && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha matriculación:</span>
                  <span>{new Date(coche.fechamatriculacion).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información técnica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Información Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Kilómetros:</span>
                <span>{coche.kms?.toLocaleString() || 0} km</span>
              </div>
              {coche.cv && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Potencia (CV):</span>
                  <span>{coche.cv} CV</span>
                </div>
              )}
              {coche.kw && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Potencia (kW):</span>
                  <span>{coche.kw} kW</span>
                </div>
              )}
              {coche.cc && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cilindrada:</span>
                  <span>{coche.cc} cc</span>
                </div>
              )}
              {coche.preciocompra && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Precio compra:</span>
                  <span>{coche.preciocompra.toLocaleString()} €</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asignación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Asignación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coche.alquiler ? (
                <div className="text-center py-4">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                    Vehículo de Alquiler
                  </span>
                </div>
              ) : coche.empleados ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Empleado:</span>
                    <span className="font-medium">
                      {coche.empleados.nombre} {coche.empleados.apellidos}
                    </span>
                  </div>
                  {coche.fecha_asignacion && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha asignación:</span>
                      <span>{new Date(coche.fecha_asignacion).toLocaleDateString()}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <span className="text-gray-500">Sin asignar</span>
                </div>
              )}

              {coche.donante && (
                <div className="text-center mt-2">
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Vehículo Donante</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta SOLRED */}
          {coche.tarjeta_solred && coche.tarjeta_solred.tarjetassolred && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Tarjeta SOLRED
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Número de Tarjeta:</span>
                  <span>{coche.tarjeta_solred.numero_tarjeta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PIN:</span>
                  <span className="font-medium">{coche.tarjeta_solred.tarjetassolred.pin}</span>
                </div>
                {coche.tarjeta_solred.tarjetassolred.fechavencimiento && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha de Vencimiento:</span>
                    <span>{new Date(coche.tarjeta_solred.tarjetassolred.fechavencimiento).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Extras y observaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {coche.extras && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Extras y Equipamiento:</h4>
                  <p className="text-gray-600 text-sm">{coche.extras}</p>
                </div>
              )}

              {coche.observaciones_asignacion && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Observaciones de Asignación:</h4>
                  <p className="text-gray-600 text-sm">{coche.observaciones_asignacion}</p>
                </div>
              )}

              {coche.asignadoa && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">ID de asignación:</h4>
                  <p className="text-gray-600 text-sm">{coche.asignadoa}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ubicación actual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Ubicación Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coche.direccion_actual ? (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Dirección:</span>
                  <span className="text-right">{coche.direccion_actual}</span>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500">Sin dirección disponible</div>
              )}

              {(coche.latitud || coche.longitud) && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Coordenadas:</span>
                  <span className="text-right">
                    {coche.latitud ?? "-"}, {coche.longitud ?? "-"}
                  </span>
                </div>
              )}

              {coche.ultima_ubicacion && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Última actualización:</span>
                  <span className="text-right">{new Date(coche.ultima_ubicacion).toLocaleString("es-ES")}</span>
                </div>
              )}

              {coche.latitud && coche.longitud && (
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps?q=${coche.latitud},${coche.longitud}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver en Google Maps
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fotos del vehículo */}
        <div className="mt-6">
          <FotosManager matricula={coche.matricula} isEditing={false} />
        </div>

        {/* Tarjeta ViaT */}
        <div className="mt-6">
          <ViatManager matricula={coche.matricula} isEditing={false} />
        </div>

        {/* ITV */}
        <div className="mt-6">
          <ITVManager matricula={coche.matricula} isEditing={false} />
        </div>

        {/* Seguros */}
        <div className="mt-6">
          <SeguroManager matricula={coche.matricula} isEditing={false} />
        </div>

        {/* Alquileres */}
        <div className="mt-6">
          <AlquilerManager matricula={coche.matricula} isEditing={false} />
        </div>

        {/* Mantenimientos */}
        <div className="mt-6">
          <MantenimientoManager matricula={coche.matricula} isEditing={false} />
        </div>

        {/* Mapa */}
        <div className="mt-6">
          <CocheUbicacionMapa
            matricula={coche.matricula}
            latitud={coche.latitud}
            longitud={coche.longitud}
            direccion={coche.direccion_actual}
          />
        </div>
      </div>
    </div>
  )
}
