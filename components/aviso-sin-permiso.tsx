"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShieldAlert, X } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const PARAM_AVISO = "aviso"
export const VALOR_SIN_PERMISO = "sin-permiso"
export const MENSAJE_SIN_PERMISO = "No tienes permiso para acceder a esa página"

/**
 * Muestra el aviso de acceso denegado cuando la URL trae `?aviso=sin-permiso`
 * (spec 017, RF-2) y quita el parámetro de inmediato para que no reaparezca al
 * recargar o navegar (RF-5).
 */
export function AvisoSinPermiso() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (searchParams.get(PARAM_AVISO) !== VALOR_SIN_PERMISO) return

    setVisible(true)

    const restantes = new URLSearchParams(searchParams.toString())
    restantes.delete(PARAM_AVISO)
    const query = restantes.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [searchParams, router, pathname])

  if (!visible) return null

  return (
    <div className="max-w-7xl mx-auto px-8 pt-6">
      <Alert variant="destructive" className="relative bg-white pr-12">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Acceso denegado</AlertTitle>
        <AlertDescription>{MENSAJE_SIN_PERMISO}</AlertDescription>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Cerrar aviso"
          className="absolute right-3 top-3 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  )
}
