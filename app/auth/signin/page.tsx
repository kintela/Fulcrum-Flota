"use client"

import { signIn } from "next-auth/react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Car } from "lucide-react"

export default function SignIn() {
  const router = useRouter()
  const { status } = useSession()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      try {
        const url = new URL(callbackUrl, window.location.origin)
        const isSameOrigin = url.origin === window.location.origin
        const targetPath = `${url.pathname}${url.search}${url.hash}` || "/"

        if (isSameOrigin) {
          router.replace(targetPath)
          window.location.replace(targetPath)
          return
        }
      } catch (error) {
        console.error("Error resolving callback URL:", error)
      }

      router.replace("/")
      window.location.replace("/")
    }
  }, [callbackUrl, router, status])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("azure-ad", {
        callbackUrl,
        redirect: true,
      })
    } catch (error) {
      console.error("Error during sign in:", error)
      setIsLoading(false)
    }
  }

  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-sm text-gray-600">Redirigiendo...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Car className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accede a Flota Fulcrum
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Utiliza tu cuenta de Office 365 para acceder al sistema
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">
              {error === "Configuration" && "Hay un problema con la configuración del servidor."}
              {error === "AccessDenied" && "Acceso denegado. Contacta con el administrador."}
              {error === "Verification" && "El token ha expirado o ya ha sido utilizado."}
              {error !== "Configuration" && error !== "AccessDenied" && error !== "Verification" && 
                "Ha ocurrido un error durante el inicio de sesión."
              }
            </div>
          </div>
        )}

        <div>
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Iniciando sesión...
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21">
                  <path 
                    fill="currentColor" 
                    d="M11.345 8.138h8.203v2.07h-8.203v2.07l-3.105-3.105 3.105-3.105v2.07z M19.553 1.035v18.93h-9.656v-2.07h7.586v-14.79h-7.586v-2.07h9.656z"
                  />
                </svg>
                Iniciar sesión con Office 365
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Este sistema está restringido a empleados autorizados de Fulcrum.
            El acceso está controlado por Azure Active Directory.
          </p>
        </div>
      </div>
    </div>
  )
}
