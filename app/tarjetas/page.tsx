import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import TarjetasAdminPage from "@/components/tarjetas-admin-page"
import { authOptions } from "@/lib/auth"

export default async function TarjetasPage() {
  const session = await getServerSession(authOptions)
  const role = String(session?.user?.role || "").toLowerCase()
  const isAdmin = role === "administrador" || role === "admin"

  if (!session?.user?.email || !isAdmin) {
    redirect("/")
  }

  return <TarjetasAdminPage />
}
