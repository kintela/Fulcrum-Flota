"use client"

import Link from "next/link"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Car, Calendar, Users, FileText, Menu, X, LogOut, User, Shield, UserCircle, WalletCards } from "lucide-react"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const roleActual = String(session?.user?.role || "").toLowerCase()
  const isAdmin = roleActual === "administrador" || roleActual === "admin"

  const menuItems = [
    { name: "Dashboard", href: "/", icon: <FileText className="w-5 h-5" /> },
    { name: "Coches", href: "/coches", icon: <Car className="w-5 h-5" /> },
    { name: "Reservas", href: "/reservas", icon: <Calendar className="w-5 h-5" /> },
    { name: "Tarjetas", href: "/tarjetas", icon: <WalletCards className="w-5 h-5" /> },
    { name: "Empleados", href: "/empleados", icon: <Users className="w-5 h-5" /> },
  ]

  // Filtrar menús según el rol del usuario
  const filteredMenuItems = isAdmin ? menuItems : []

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: "/auth/signin",
      redirect: true 
    })
  }

  // Si no hay sesión, no mostrar el header (se mostrará la página de login)
  if (status === "loading") {
    return (
      <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Car className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Flota Fulcrum</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Flota Fulcrum</span>
            </div>
          </div>

          {/* Desktop menu */}
          <nav className="hidden md:flex space-x-8 items-center">
            {/* Solo mostrar elementos de navegación para administradores */}
            {isAdmin && filteredMenuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}
            
            {/* User menu desktop - SIEMPRE visible para todos los usuarios */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {isAdmin ? (
                  <Shield className="w-5 h-5 text-blue-600" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="ml-2 max-w-32 truncate">{session?.user?.name || session?.user?.email}</span>
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">{session?.user?.name}</div>
                    <div className="text-gray-500 truncate">{session?.user?.email}</div>
                    {session?.user?.role && (
                      <div className="flex items-center mt-1">
                        {session.user.role === 'administrador' ? (
                          <Shield className="w-3 h-3 text-blue-600 mr-1" />
                        ) : (
                          <UserCircle className="w-3 h-3 text-gray-500 mr-1" />
                        )}
                        <span className="text-xs text-gray-500 capitalize">
                          {session.user.role}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => {
                if (isAdmin) {
                  setIsMenuOpen(!isMenuOpen)
                } else {
                  setIsUserMenuOpen(!isUserMenuOpen)
                }
              }}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Abrir menú</span>
              {isAdmin ? (
                isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />
              ) : (
                isUserMenuOpen ? <X className="block h-6 w-6" /> : <User className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - Solo para administradores */}
      {isMenuOpen && isAdmin && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}
            
            {/* User info mobile */}
            <div className="border-t pt-4 mt-4">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-gray-900">{session?.user?.name}</div>
                <div className="text-sm text-gray-500">{session?.user?.email}</div>
                {session?.user?.role && (
                  <div className="flex items-center mt-1">
                    <Shield className="w-3 h-3 text-blue-600 mr-1" />
                    <span className="text-xs text-gray-500 capitalize">
                      {session.user.role}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile user menu - Para usuarios no administradores */}
      {isUserMenuOpen && !isAdmin && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <div className="px-3 py-2">
              <div className="text-sm font-medium text-gray-900">{session?.user?.name}</div>
              <div className="text-sm text-gray-500">{session?.user?.email}</div>
              {session?.user?.role && (
                <div className="flex items-center mt-1">
                  <UserCircle className="w-3 h-3 text-gray-500 mr-1" />
                  <span className="text-xs text-gray-500 capitalize">
                    {session.user.role}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
