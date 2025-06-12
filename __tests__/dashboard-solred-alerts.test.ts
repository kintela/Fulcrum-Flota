import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Función auxiliar para calcular alertas de tarjetas SOLRED (extraída de la lógica del dashboard)
function calculateSolredAlerts(tarjetasAsignadas: any[]) {
  const today = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  const solredAlerts = (tarjetasAsignadas || []).filter((asignacion) => {
    if (!asignacion.tarjetassolred?.fechavencimiento) return false
    const fechaVencimiento = new Date(asignacion.tarjetassolred.fechavencimiento)
    return fechaVencimiento <= thirtyDaysFromNow
  })

  const solredVencidas = solredAlerts.filter((asignacion) => {
    const fechaVencimiento = new Date(asignacion.tarjetassolred.fechavencimiento)
    return fechaVencimiento < today
  })

  const solredProximasVencer = solredAlerts.filter((asignacion) => {
    const fechaVencimiento = new Date(asignacion.tarjetassolred.fechavencimiento)
    return fechaVencimiento >= today && fechaVencimiento <= thirtyDaysFromNow
  })

  return {
    total: solredAlerts.length,
    vencidas: solredVencidas.length,
    proximasVencer: solredProximasVencer.length,
    detalles: solredAlerts,
  }
}

describe("Dashboard SOLRED Alerts Calculation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock current date to have consistent tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2024-01-15")) // Fixed date for testing
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("calculates no alerts when all SOLRED cards are more than 30 days away from expiration", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "1234ABC",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-03-01" }, // 46 days away
        coches: { matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" },
      },
      {
        id: 2,
        matricula: "5678DEF",
        tarjetassolred: { numero_tarjeta: "23456789012345678", fechavencimiento: "2024-04-15" }, // 91 days away
        coches: { matricula: "5678DEF", marca: "Honda", modelo: "Civic" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })

  it("identifies expired SOLRED cards (vencidas)", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "1234ABC",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-01-10" }, // 5 days overdue
        coches: { matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" },
      },
      {
        id: 2,
        matricula: "5678DEF",
        tarjetassolred: { numero_tarjeta: "23456789012345678", fechavencimiento: "2023-12-20" }, // 26 days overdue
        coches: { matricula: "5678DEF", marca: "Honda", modelo: "Civic" },
      },
      {
        id: 3,
        matricula: "9012GHI",
        tarjetassolred: { numero_tarjeta: "34567890123456789", fechavencimiento: "2024-02-20" }, // Future date
        coches: { matricula: "9012GHI", marca: "Ford", modelo: "Focus" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(2)
    expect(alerts.vencidas).toBe(2)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(2)
    expect(alerts.detalles[0].matricula).toBe("1234ABC")
    expect(alerts.detalles[1].matricula).toBe("5678DEF")
  })

  it("identifies SOLRED cards expiring within 30 days (proximasVencer)", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "1234ABC",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-01-20" }, // 5 days away
        coches: { matricula: "1234ABC", marca: "Toyota", modelo: "Corolla" },
      },
      {
        id: 2,
        matricula: "5678DEF",
        tarjetassolred: { numero_tarjeta: "23456789012345678", fechavencimiento: "2024-02-10" }, // 26 days away
        coches: { matricula: "5678DEF", marca: "Honda", modelo: "Civic" },
      },
      {
        id: 3,
        matricula: "9012GHI",
        tarjetassolred: { numero_tarjeta: "34567890123456789", fechavencimiento: "2024-01-15" }, // Today
        coches: { matricula: "9012GHI", marca: "Ford", modelo: "Focus" },
      },
      {
        id: 4,
        matricula: "3456JKL",
        tarjetassolred: { numero_tarjeta: "45678901234567890", fechavencimiento: "2024-03-01" }, // 46 days away (not included)
        coches: { matricula: "3456JKL", marca: "Nissan", modelo: "Sentra" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(3)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(3)
    expect(alerts.detalles).toHaveLength(3)
  })

  it("correctly categorizes mixed scenarios (expired + upcoming)", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "OVERDUE1",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-01-05" }, // 10 days overdue
        coches: { matricula: "OVERDUE1", marca: "Toyota", modelo: "Corolla" },
      },
      {
        id: 2,
        matricula: "OVERDUE2",
        tarjetassolred: { numero_tarjeta: "23456789012345678", fechavencimiento: "2023-12-01" }, // 45 days overdue
        coches: { matricula: "OVERDUE2", marca: "Honda", modelo: "Civic" },
      },
      {
        id: 3,
        matricula: "UPCOMING1",
        tarjetassolred: { numero_tarjeta: "34567890123456789", fechavencimiento: "2024-01-25" }, // 10 days away
        coches: { matricula: "UPCOMING1", marca: "Ford", modelo: "Focus" },
      },
      {
        id: 4,
        matricula: "UPCOMING2",
        tarjetassolred: { numero_tarjeta: "45678901234567890", fechavencimiento: "2024-02-14" }, // 30 days away exactly
        coches: { matricula: "UPCOMING2", marca: "Nissan", modelo: "Sentra" },
      },
      {
        id: 5,
        matricula: "FUTURE",
        tarjetassolred: { numero_tarjeta: "56789012345678901", fechavencimiento: "2024-03-01" }, // 46 days away (not included)
        coches: { matricula: "FUTURE", marca: "Mazda", modelo: "3" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(4)
    expect(alerts.vencidas).toBe(2)
    expect(alerts.proximasVencer).toBe(2)
    expect(alerts.detalles).toHaveLength(4)

    // Verify expired cards
    const overdueMatriculas = alerts.detalles
      .filter((asignacion: any) => new Date(asignacion.tarjetassolred.fechavencimiento) < new Date("2024-01-15"))
      .map((asignacion: any) => asignacion.matricula)
    expect(overdueMatriculas).toContain("OVERDUE1")
    expect(overdueMatriculas).toContain("OVERDUE2")

    // Verify upcoming cards
    const upcomingMatriculas = alerts.detalles
      .filter((asignacion: any) => {
        const fecha = new Date(asignacion.tarjetassolred.fechavencimiento)
        const today = new Date("2024-01-15")
        return fecha >= today
      })
      .map((asignacion: any) => asignacion.matricula)
    expect(upcomingMatriculas).toContain("UPCOMING1")
    expect(upcomingMatriculas).toContain("UPCOMING2")
  })

  it("handles edge case: SOLRED card expiring exactly 30 days from today", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "EDGE30",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-02-14" }, // Exactly 30 days away
        coches: { matricula: "EDGE30", marca: "Toyota", modelo: "Corolla" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("EDGE30")
  })

  it("handles edge case: SOLRED card expiring today", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "TODAY",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-01-15" }, // Today
        coches: { matricula: "TODAY", marca: "Toyota", modelo: "Corolla" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("TODAY")
  })

  it("handles empty tarjetas array", () => {
    const tarjetasAsignadas: any[] = []

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })

  it("handles null/undefined tarjetas array", () => {
    const alerts1 = calculateSolredAlerts(null as any)
    const alerts2 = calculateSolredAlerts(undefined as any)

    expect(alerts1.total).toBe(0)
    expect(alerts1.vencidas).toBe(0)
    expect(alerts1.proximasVencer).toBe(0)

    expect(alerts2.total).toBe(0)
    expect(alerts2.vencidas).toBe(0)
    expect(alerts2.proximasVencer).toBe(0)
  })

  it("handles cards without expiration date", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "VALID",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-01-20" },
        coches: { matricula: "VALID", marca: "Toyota", modelo: "Corolla" },
      },
      {
        id: 2,
        matricula: "NO_DATE",
        tarjetassolred: { numero_tarjeta: "23456789012345678", fechavencimiento: null },
        coches: { matricula: "NO_DATE", marca: "Honda", modelo: "Civic" },
      },
      {
        id: 3,
        matricula: "NO_CARD",
        tarjetassolred: null,
        coches: { matricula: "NO_CARD", marca: "Ford", modelo: "Focus" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    // Should only process the valid card
    expect(alerts.total).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("VALID")
  })

  it("validates the mathematical relationship: Total = Vencidas + ProximasVencer", () => {
    const tarjetasAsignadas = [
      {
        id: 1,
        matricula: "A001",
        tarjetassolred: { numero_tarjeta: "12345678901234567", fechavencimiento: "2024-01-01" }, // Expired
        coches: { matricula: "A001", marca: "Toyota", modelo: "Corolla" },
      },
      {
        id: 2,
        matricula: "A002",
        tarjetassolred: { numero_tarjeta: "23456789012345678", fechavencimiento: "2024-01-20" }, // Upcoming
        coches: { matricula: "A002", marca: "Honda", modelo: "Civic" },
      },
      {
        id: 3,
        matricula: "A003",
        tarjetassolred: { numero_tarjeta: "34567890123456789", fechavencimiento: "2023-12-15" }, // Expired
        coches: { matricula: "A003", marca: "Ford", modelo: "Focus" },
      },
      {
        id: 4,
        matricula: "A004",
        tarjetassolred: { numero_tarjeta: "45678901234567890", fechavencimiento: "2024-02-10" }, // Upcoming
        coches: { matricula: "A004", marca: "Nissan", modelo: "Sentra" },
      },
      {
        id: 5,
        matricula: "A005",
        tarjetassolred: { numero_tarjeta: "56789012345678901", fechavencimiento: "2024-03-01" }, // Future (not included)
        coches: { matricula: "A005", marca: "Mazda", modelo: "3" },
      },
    ]

    const alerts = calculateSolredAlerts(tarjetasAsignadas)

    // The sum of vencidas + proximasVencer should equal total
    expect(alerts.vencidas + alerts.proximasVencer).toBe(alerts.total)

    // Verify specific values
    expect(alerts.total).toBe(4)
    expect(alerts.vencidas).toBe(2) // A001, A003
    expect(alerts.proximasVencer).toBe(2) // A002, A004
  })
})
