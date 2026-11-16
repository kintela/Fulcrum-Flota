import type { ReactNode } from "react"
import { requerirAdminPagina } from "@/lib/autorizacion"

// Spec 017: la página de este segmento es un Client Component, así que la guarda
// de administrador se aplica aquí, en servidor, antes de renderizarla.
export default async function SoloAdministradorLayout({ children }: { children: ReactNode }) {
  await requerirAdminPagina()
  return <>{children}</>
}
