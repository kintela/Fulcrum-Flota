import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Si está en una ruta de auth, permitir acceso
    if (pathname.startsWith('/auth')) {
      return NextResponse.next()
    }

    // Si está en una ruta de cron, permitir acceso (se verifica el token dentro del endpoint)
    if (pathname.startsWith('/api/cron')) {
      return NextResponse.next()
    }

    // Si no hay token y no está en una ruta de auth, redirigir al login
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acceso a rutas de auth sin token
        if (req.nextUrl.pathname.startsWith('/auth')) {
          return true
        }
        // Permitir acceso a rutas de cron sin token (se verifica dentro del endpoint)
        if (req.nextUrl.pathname.startsWith('/api/cron')) {
          return true
        }
        // Para todas las demás rutas, requerir token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - api/cron (cron job API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
