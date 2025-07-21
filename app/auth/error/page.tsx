"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Car } from "lucide-react"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "Hay un problema con la configuración del servidor."
      case "AccessDenied":
        return "Acceso denegado. No tienes permisos para acceder a esta aplicación."
      case "Verification":
        return "El enlace de verificación ha expirado o ya ha sido utilizado."
      case "Default":
        return "Ha ocurrido un error durante el proceso de autenticación."
      default:
        return "Ha ocurrido un error inesperado."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Car className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Error de Autenticación
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            No se pudo completar el proceso de inicio de sesión
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">
            {getErrorMessage(error)}
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Intentar de nuevo
          </Link>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Si el problema persiste, contacta con el administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
