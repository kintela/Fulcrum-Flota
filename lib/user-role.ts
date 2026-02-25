export enum RolUsuario {
  USUARIO = "usuario",
  ADMINISTRADOR = "administrador",
}

export type UserRole = RolUsuario

export const ROL_USUARIO_POR_DEFECTO: UserRole = RolUsuario.USUARIO

export const OPCIONES_ROL_USUARIO = [
  { value: RolUsuario.USUARIO, label: "Usuario" },
  { value: RolUsuario.ADMINISTRADOR, label: "Administrador" },
] as const

const ROLES_USUARIO_VALIDOS = new Set<string>(Object.values(RolUsuario))
const ALIAS_ADMIN_LEGACY = "admin"

export function parseRolUsuario(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null
  }

  const role = value.trim().toLowerCase()
  if (!role) {
    return null
  }

  if (role === ALIAS_ADMIN_LEGACY) {
    return RolUsuario.ADMINISTRADOR
  }

  return ROLES_USUARIO_VALIDOS.has(role) ? (role as UserRole) : null
}

export function normalizarRolUsuario(
  value: unknown,
  fallback: UserRole = ROL_USUARIO_POR_DEFECTO,
): UserRole {
  return parseRolUsuario(value) ?? fallback
}

export function esRolAdministrador(value: unknown): boolean {
  return parseRolUsuario(value) === RolUsuario.ADMINISTRADOR
}
