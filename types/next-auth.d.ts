import { DefaultSession } from "next-auth"
import type { UserRole } from "@/lib/roles"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    idToken?: string
    user: {
      id: string
      role?: UserRole | null
      empleadoId?: number
    } & DefaultSession["user"]
  }

  interface JWT {
    accessToken?: string
    idToken?: string
    role?: UserRole | null
    empleadoId?: number
  }
}
