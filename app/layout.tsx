import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { getAuthSession } from "@/lib/get-session"
import AuthProvider from "@/components/auth-provider"
import Header from "@/components/header"
import PwaRegister from "@/components/pwa-register"

// SCHEDULER DESHABILITADO - Solo se ejecuta manualmente o con Vercel Cron
// import "@/lib/init-scheduler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  applicationName: "Flota Fulcrum",
  title: "Gestión de Flota Fulcrum",
  description: "Sistema de gestión de flota de vehículos para Fulcrum",
  generator: "v0.dev",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flota Fulcrum",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getAuthSession()

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider session={session}>
          <PwaRegister />
          <Header />
          <main className="pt-16">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
