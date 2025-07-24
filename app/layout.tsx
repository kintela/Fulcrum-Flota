import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { getAuthSession } from "@/lib/get-session"
import AuthProvider from "@/components/auth-provider"
import Header from "@/components/header"

// SCHEDULER DESHABILITADO - Solo se ejecuta manualmente o con Vercel Cron
// import "@/lib/init-scheduler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Gestión de Flota Fulcrum",
  description: "Sistema de gestión de flota de vehículos para Fulcrum",
  generator: "v0.dev",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" }
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  },
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
          <Header />
          <main className="pt-16">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
