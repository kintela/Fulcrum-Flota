"use client"

import { useSession } from "next-auth/react"
import type { UserRole } from "@/lib/roles"
import { ReactNode } from "react"
import { Shield, AlertCircle } from "lucide-react"

interface RoleGuardProps {
  children: ReactNode
  requiredRole?: UserRole
  fallback?: ReactNode
  adminOnly?: boolean
}

export default function RoleGuard({ 
  children, 
  requiredRole, 
  fallback, 
  adminOnly = false 
}: RoleGuardProps) {
  const { data: session, status } = useSession()

  // Mostrar loading mientras se carga la sesión
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Verificando permisos...</span>
      </div>
    )
  }

  // Usuario no autenticado
  if (status === "unauthenticated") {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
        <span className="text-gray-600">Acceso no autorizado</span>
      </div>
    )
  }

  const userRole = session?.user?.role
  const isAdmin = userRole === 'administrador' || userRole === 'admin'

  // Si se requiere solo admin
  if (adminOnly && !isAdmin) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
        <Shield className="w-12 h-12 text-yellow-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Acceso Restringido
        </h3>
        <p className="text-gray-600 text-center">
          Esta funcionalidad solo está disponible para administradores.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Tu rol actual: <span className="capitalize font-medium">{userRole || 'Sin rol asignado'}</span>
        </p>
      </div>
    )
  }

  // Si se requiere un rol específico
  if (requiredRole && userRole !== requiredRole && !isAdmin) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
        <Shield className="w-12 h-12 text-yellow-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Permisos Insuficientes
        </h3>
        <p className="text-gray-600 text-center">
          Esta funcionalidad requiere rol de <span className="capitalize font-medium">{requiredRole}</span>.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Tu rol actual: <span className="capitalize font-medium">{userRole || 'Sin rol asignado'}</span>
        </p>
      </div>
    )
  }

  // Si el usuario no tiene rol asignado
  if (!userRole) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sin Rol Asignado
        </h3>
        <p className="text-gray-600 text-center">
          Tu usuario no tiene un rol asignado en el sistema.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Contacta con un administrador para que te asigne los permisos correspondientes.
        </p>
      </div>
    )
  }

  // Usuario autorizado
  return <>{children}</>
}

// Hook personalizado para usar roles en componentes
export function useUserRole() {
  const { data: session } = useSession()
  
  return {
    role: session?.user?.role || null,
    isAdmin: session?.user?.role === 'administrador' || session?.user?.role === 'admin',
    isUser: session?.user?.role === 'usuario',
    empleadoId: session?.user?.empleadoId || null,
    hasRole: (role: UserRole) =>
      session?.user?.role === role || session?.user?.role === 'administrador' || session?.user?.role === 'admin'
  }
}
