"use client"

import { UbicacionEditor } from "./ubicacion-editor"
import { useRouter } from "next/navigation"

interface UbicacionEditorWrapperProps {
  matricula: string
  latitud?: number | null
  longitud?: number | null
  direccion_actual?: string | null
}

export function UbicacionEditorWrapper({ 
  matricula, 
  latitud, 
  longitud, 
  direccion_actual 
}: UbicacionEditorWrapperProps) {
  const router = useRouter()

  const handleUbicacionGuardada = () => {
    // Refresca la página para mostrar los datos actualizados
    router.refresh()
  }

  return (
    <UbicacionEditor
      matricula={matricula}
      latitud={latitud}
      longitud={longitud}
      direccion_actual={direccion_actual}
      onUbicacionGuardada={handleUbicacionGuardada}
    />
  )
}
