import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

function hasNextAuthSessionCookie(req: Parameters<Parameters<typeof withAuth>[0]>[0]) {
  return req.cookies.getAll().some(({ name }) =>
    name.startsWith("next-auth.session-token") ||
    name.startsWith("__Secure-next-auth.session-token")
  )
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl
    const hasSessionCookie = hasNextAuthSessionCookie(req)

    // Si está en una ruta de auth, permitir acceso
    if (pathname.startsWith('/auth')) {
      return NextResponse.next()
    }

    // Si está en una ruta de cron, permitir acceso (se verifica el token dentro del endpoint)
    if (pathname.startsWith('/api/cron')) {
      return NextResponse.next()
    }

    // Si está en una ruta de debug, permitir acceso sin autenticación
    if (pathname.startsWith('/api/debug') || pathname.startsWith('/api/public')) {
      return NextResponse.next()
    }

    // Si no hay token y no está en una ruta de auth, redirigir al login
    if (!token && !hasSessionCookie) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const hasSessionCookie = hasNextAuthSessionCookie(req)

        // Permitir acceso a rutas de auth sin token
        if (req.nextUrl.pathname.startsWith('/auth')) {
          return true
        }
        // Permitir acceso a rutas de cron sin token (se verifica dentro del endpoint)
        if (req.nextUrl.pathname.startsWith('/api/cron')) {
          return true
        }
        // Permitir acceso a rutas de debug sin token
        if (req.nextUrl.pathname.startsWith('/api/debug') || req.nextUrl.pathname.startsWith('/api/public')) {
          return true
        }
        // Para todas las demás rutas, requerir token
        return !!token || hasSessionCookie
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
     * - api/debug (debug API routes)
     * - api/public (public API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/cron|api/debug|api/public|_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
