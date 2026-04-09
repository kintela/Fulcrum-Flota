const TEST_RESERVATION_MATRICULA_PREFIX = "0000"
const TEST_RESERVATION_ALLOWED_EMAIL = "rquintela@fulcrum.es"

function normalizeEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase()
}

function normalizeMatricula(matricula?: string | null) {
  return String(matricula || "").trim().toUpperCase()
}

export function isTestReservationVehicle(matricula?: string | null) {
  return normalizeMatricula(matricula).startsWith(TEST_RESERVATION_MATRICULA_PREFIX)
}

export function canUserReserveTestVehicle(userEmail?: string | null) {
  return normalizeEmail(userEmail) === TEST_RESERVATION_ALLOWED_EMAIL
}

export function canUserAccessReservationVehicle(matricula?: string | null, userEmail?: string | null) {
  return !isTestReservationVehicle(matricula) || canUserReserveTestVehicle(userEmail)
}
