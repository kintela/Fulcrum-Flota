import TarjetasAdminPage from "@/components/tarjetas-admin-page"
import { requerirAdminPagina } from "@/lib/autorizacion"

export default async function TarjetasPage() {
  // Spec 017: solo administradores (redirige con aviso si no lo es).
  await requerirAdminPagina()

  return <TarjetasAdminPage />
}
