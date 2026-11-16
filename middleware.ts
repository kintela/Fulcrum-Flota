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

    if (!token && !hasSessionCookie) {
      // Spec 018 (RF-13): los endpoints /api responden 401 JSON en lugar de redirigir al login.
      // /api/auth y /api/cron no pasan por aquí (excluidos en el matcher).
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
      }

      // Si no hay token y no está en una ruta de auth, redirigir al login
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
        // Las peticiones /api pasan a la función para que responda 401 JSON (no redirección)
        if (req.nextUrl.pathname.startsWith('/api/')) {
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
     * - api/cron (cron job API routes; se autentican con CRON_SECRET o sesión de administrador)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - PWA public assets
     */
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|favicon.png|manifest.webmanifest|sw.js|offline.html|icons/).*)",
  ],
}
