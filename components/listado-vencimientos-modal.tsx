"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Clock, ListChecks, Search } from "lucide-react"

import { obtenerListadoVencimientos } from "@/app/actions/listado-vencimientos"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  calcularEstadoPlazo,
  coincideBusqueda,
  filtrarPorAlquiler,
  formatearFecha,
  ORDEN_INICIAL,
  ordenarFilas,
  siguienteOrden,
  type ColumnaOrden,
  type FilaVencimiento,
  type FiltroAlquiler,
  type Orden,
} from "@/lib/listado-vencimientos"

const OPCIONES_FILTRO: Array<{ value: FiltroAlquiler; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "alquiler", label: "Alquiler" },
  { value: "no_alquiler", label: "No alquiler" },
]

const COLUMNAS: Array<{ columna: ColumnaOrden; label: string }> = [
  { columna: "matricula", label: "Matrícula" },
  { columna: "modelo", label: "Modelo" },
  { columna: "asignado", label: "Asignado a" },
  { columna: "seguro", label: "Seguro" },
  { columna: "solred", label: "Solred" },
  { columna: "itv", label: "ITV" },
]

function SinDato({ texto }: { texto: string }) {
  return <span className="text-gray-400 italic">{texto}</span>
}

function CeldaFecha({ fecha, textoSinDato, hoy }: { fecha: string | null; textoSinDato: string; hoy: Date }) {
  const texto = formatearFecha(fecha)
  if (!texto) return <SinDato texto={textoSinDato} />

  const plazo = calcularEstadoPlazo(fecha, hoy)

  if (plazo?.estado === "vencida") {
    const aviso = `Vencida hace ${Math.abs(plazo.dias)} ${Math.abs(plazo.dias) === 1 ? "día" : "días"}`
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-red-600" title={aviso}>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        {texto}
        <span className="sr-only">({aviso})</span>
      </span>
    )
  }

  if (plazo?.estado === "proxima") {
    const aviso = plazo.dias === 0 ? "Vence hoy" : `Vence en ${plazo.dias} ${plazo.dias === 1 ? "día" : "días"}`
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-amber-600" title={aviso}>
        <Clock className="h-4 w-4" aria-hidden="true" />
        {texto}
        <span className="sr-only">({aviso})</span>
      </span>
    )
  }

  return <span>{texto}</span>
}

export function ListadoVencimientosModal() {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filas, setFilas] = useState<FilaVencimiento[]>([])
  const [filtro, setFiltro] = useState<FiltroAlquiler>("todos")
  const [texto, setTexto] = useState("")
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL)

  // Cada apertura recarga los datos y vuelve al estado inicial (RF-9, RF-14).
  useEffect(() => {
    if (!abierto) return

    let cancelado = false
    setFiltro("todos")
    setTexto("")
    setOrden(ORDEN_INICIAL)
    setError(null)
    setCargando(true)

    obtenerListadoVencimientos()
      .then((resultado) => {
        if (cancelado) return
        if (resultado.success) {
          setFilas(resultado.filas ?? [])
        } else {
          setFilas([])
          setError(resultado.error || "No se pudo cargar el listado")
        }
      })
      .catch(() => {
        if (!cancelado) {
          setFilas([])
          setError("No se pudo cargar el listado")
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [abierto])

  const hoy = useMemo(() => new Date(), [abierto]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = useMemo(
    () =>
      ordenarFilas(
        filas.filter((fila) => filtrarPorAlquiler(fila, filtro) && coincideBusqueda(fila, texto)),
        orden,
      ),
    [filas, filtro, texto, orden],
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 px-4 py-2 rounded-md"
      >
        <ListChecks className="h-5 w-5 mr-2" />
        Listados
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-6xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Listado de vencimientos</DialogTitle>
            <DialogDescription>
              Caducidad del seguro, de la tarjeta Solred y próxima ITV de la flota activa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div role="group" aria-label="Filtrar por alquiler" className="inline-flex rounded-md border border-gray-300 overflow-hidden w-fit">
              {OPCIONES_FILTRO.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  aria-pressed={filtro === opcion.value}
                  onClick={() => setFiltro(opcion.value)}
                  className={`px-3 py-1.5 text-sm border-r last:border-r-0 border-gray-300 ${
                    filtro === opcion.value ? "bg-blue-600 text-white" : "bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-[300px]">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  placeholder="Buscar por matrícula, modelo, persona..."
                  aria-label="Buscar en el listado"
                  className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!cargando && !error && (
                <span className="text-sm text-gray-500 whitespace-nowrap">{visibles.length} vehículos</span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {cargando ? (
              <p className="py-8 text-center text-gray-500">Cargando…</p>
            ) : error ? (
              <p className="py-8 text-center text-red-600">{error}</p>
            ) : visibles.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No hay vehículos que coincidan con el filtro.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNAS.map(({ columna, label }) => {
                      const activa = orden.columna === columna
                      const Icono = !activa ? ArrowUpDown : orden.sentido === "asc" ? ArrowUp : ArrowDown
                      return (
                        <TableHead
                          key={columna}
                          aria-sort={activa ? (orden.sentido === "asc" ? "ascending" : "descending") : "none"}
                          className="whitespace-nowrap"
                        >
                          <button
                            type="button"
                            onClick={() => setOrden((actual) => siguienteOrden(actual, columna))}
                            className={`inline-flex items-center gap-1 hover:text-gray-900 ${activa ? "text-gray-900 font-semibold" : ""}`}
                          >
                            {label}
                            <Icono className={`h-3.5 w-3.5 ${activa ? "" : "opacity-40"}`} aria-hidden="true" />
                          </button>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((fila) => (
                    <TableRow key={fila.matricula}>
                      <TableCell className="font-medium whitespace-nowrap">{fila.matricula}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fila.modelo ?? <SinDato texto="Sin datos" />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fila.asignado ?? <SinDato texto="Sin asignar" />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <CeldaFecha fecha={fila.seguro} textoSinDato="Sin seguro" hoy={hoy} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <CeldaFecha fecha={fila.solred} textoSinDato="Sin tarjeta" hoy={hoy} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <CeldaFecha fecha={fila.itv} textoSinDato="Sin datos" hoy={hoy} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
