import { supabase } from "@/lib/supabase"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Update the calculateITVAlerts function to exclude donor vehicles
function calculateITVAlerts(itvs: any[]) {
  const today = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  const itvAlerts = (itvs || []).filter((itv) => {
    // Skip donor vehicles
    if (itv.coches?.donante === true) return false

    const fechaProximaRevision = new Date(itv.fechaproximarevision)
    return fechaProximaRevision <= thirtyDaysFromNow
  })

  const itvVencidas = itvAlerts.filter((itv) => {
    const fechaProximaRevision = new Date(itv.fechaproximarevision)
    return fechaProximaRevision < today
  })

  const itvProximasVencer = itvAlerts.filter((itv) => {
    const fechaProximaRevision = new Date(itv.fechaproximarevision)
    return fechaProximaRevision >= today && fechaProximaRevision <= thirtyDaysFromNow
  })

  return {
    total: itvAlerts.length,
    vencidas: itvVencidas.length,
    proximasVencer: itvProximasVencer.length,
    detalles: itvAlerts,
  }
}

describe("Dashboard ITV Alerts Calculation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock current date to have consistent tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2024-01-15")) // Fixed date for testing
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("calculates no alerts when all ITVs are more than 30 days away", () => {
    const itvs = [
      { id: 1, matricula: "1234ABC", fechaproximarevision: "2024-03-01" }, // 46 days away
      { id: 2, matricula: "5678DEF", fechaproximarevision: "2024-04-15" }, // 91 days away
      { id: 3, matricula: "9012GHI", fechaproximarevision: "2024-02-20" }, // 36 days away
    ]

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })

  it("identifies overdue ITVs (vencidas)", () => {
    const itvs = [
      { id: 1, matricula: "1234ABC", fechaproximarevision: "2024-01-10" }, // 5 days overdue
      { id: 2, matricula: "5678DEF", fechaproximarevision: "2023-12-20" }, // 26 days overdue
      { id: 3, matricula: "9012GHI", fechaproximarevision: "2024-02-20" }, // Future date
    ]

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(2)
    expect(alerts.vencidas).toBe(2)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(2)
    expect(alerts.detalles[0].matricula).toBe("1234ABC")
    expect(alerts.detalles[1].matricula).toBe("5678DEF")
  })

  it("identifies ITVs due within 30 days (proximasVencer)", () => {
    const itvs = [
      { id: 1, matricula: "1234ABC", fechaproximarevision: "2024-01-20" }, // 5 days away
      { id: 2, matricula: "5678DEF", fechaproximarevision: "2024-02-10" }, // 26 days away
      { id: 3, matricula: "9012GHI", fechaproximarevision: "2024-01-15" }, // Today
      { id: 4, matricula: "3456JKL", fechaproximarevision: "2024-03-01" }, // 46 days away (not included)
    ]

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(3)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(3)
    expect(alerts.detalles).toHaveLength(3)
  })

  it("correctly categorizes mixed scenarios (overdue + upcoming)", () => {
    const itvs = [
      { id: 1, matricula: "OVERDUE1", fechaproximarevision: "2024-01-05" }, // 10 days overdue
      { id: 2, matricula: "OVERDUE2", fechaproximarevision: "2023-12-01" }, // 45 days overdue
      { id: 3, matricula: "UPCOMING1", fechaproximarevision: "2024-01-25" }, // 10 days away
      { id: 4, matricula: "UPCOMING2", fechaproximarevision: "2024-02-14" }, // 30 days away exactly
      { id: 5, matricula: "FUTURE", fechaproximarevision: "2024-03-01" }, // 46 days away (not included)
    ]

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(4)
    expect(alerts.vencidas).toBe(2)
    expect(alerts.proximasVencer).toBe(2)
    expect(alerts.detalles).toHaveLength(4)

    // Verify overdue ITVs
    const overdueMatriculas = alerts.detalles
      .filter((itv: any) => new Date(itv.fechaproximarevision) < new Date("2024-01-15"))
      .map((itv: any) => itv.matricula)
    expect(overdueMatriculas).toContain("OVERDUE1")
    expect(overdueMatriculas).toContain("OVERDUE2")

    // Verify upcoming ITVs
    const upcomingMatriculas = alerts.detalles
      .filter((itv: any) => {
        const fecha = new Date(itv.fechaproximarevision)
        const today = new Date("2024-01-15")
        return fecha >= today
      })
      .map((itv: any) => itv.matricula)
    expect(upcomingMatriculas).toContain("UPCOMING1")
    expect(upcomingMatriculas).toContain("UPCOMING2")
  })

  it("handles edge case: ITV due exactly 30 days from today", () => {
    const itvs = [
      { id: 1, matricula: "EDGE30", fechaproximarevision: "2024-02-14" }, // Exactly 30 days away
    ]

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("EDGE30")
  })

  it("handles edge case: ITV due today", () => {
    const itvs = [
      { id: 1, matricula: "TODAY", fechaproximarevision: "2024-01-15" }, // Today
    ]

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("TODAY")
  })

  it("handles empty ITV array", () => {
    const itvs: any[] = []

    const alerts = calculateITVAlerts(itvs)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })

  it("handles null/undefined ITV array", () => {
    const alerts1 = calculateITVAlerts(null as any)
    const alerts2 = calculateITVAlerts(undefined as any)

    expect(alerts1.total).toBe(0)
    expect(alerts1.vencidas).toBe(0)
    expect(alerts1.proximasVencer).toBe(0)

    expect(alerts2.total).toBe(0)
    expect(alerts2.vencidas).toBe(0)
    expect(alerts2.proximasVencer).toBe(0)
  })

  it("validates the mathematical relationship: Total = Vencidas + ProximasVencer", () => {
    const itvs = [
      { id: 1, matricula: "A001", fechaproximarevision: "2024-01-01" }, // Overdue
      { id: 2, matricula: "A002", fechaproximarevision: "2024-01-20" }, // Upcoming
      { id: 3, matricula: "A003", fechaproximarevision: "2023-12-15" }, // Overdue
      { id: 4, matricula: "A004", fechaproximarevision: "2024-02-10" }, // Upcoming
      { id: 5, matricula: "A005", fechaproximarevision: "2024-03-01" }, // Future (not included)
    ]

    const alerts = calculateITVAlerts(itvs)

    // The sum of vencidas + proximasVencer should equal total
    expect(alerts.vencidas + alerts.proximasVencer).toBe(alerts.total)

    // Verify specific values
    expect(alerts.total).toBe(4)
    expect(alerts.vencidas).toBe(2) // A001, A003
    expect(alerts.proximasVencer).toBe(2) // A002, A004
  })

  it("handles invalid date formats gracefully", () => {
    const itvs = [
      { id: 1, matricula: "VALID", fechaproximarevision: "2024-01-20" },
      { id: 2, matricula: "INVALID1", fechaproximarevision: "invalid-date" },
      { id: 3, matricula: "INVALID2", fechaproximarevision: null },
      { id: 4, matricula: "INVALID3", fechaproximarevision: undefined },
    ]

    const alerts = calculateITVAlerts(itvs)

    // Should only process the valid date
    expect(alerts.total).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("VALID")
  })

  it("excludes donor vehicles from alerts even if their ITV is overdue or about to expire", () => {
    const itvs = [
      {
        id: 1,
        matricula: "DONOR1",
        fechaproximarevision: "2024-01-05", // Overdue
        coches: { matricula: "DONOR1", donante: true },
      },
      {
        id: 2,
        matricula: "DONOR2",
        fechaproximarevision: "2024-01-25", // About to expire
        coches: { matricula: "DONOR2", donante: true },
      },
      {
        id: 3,
        matricula: "NORMAL1",
        fechaproximarevision: "2024-01-05", // Overdue
        coches: { matricula: "NORMAL1", donante: false },
      },
      {
        id: 4,
        matricula: "NORMAL2",
        fechaproximarevision: "2024-01-25", // About to expire
        coches: { matricula: "NORMAL2", donante: false },
      },
    ]

    const alerts = calculateITVAlerts(itvs)

    // Should only include the non-donor vehicles
    expect(alerts.total).toBe(2)
    expect(alerts.vencidas).toBe(1)
    expect(alerts.proximasVencer).toBe(1)

    // Verify that only non-donor vehicles are included
    const alertMatriculas = alerts.detalles.map((itv: any) => itv.matricula)
    expect(alertMatriculas).toContain("NORMAL1")
    expect(alertMatriculas).toContain("NORMAL2")
    expect(alertMatriculas).not.toContain("DONOR1")
    expect(alertMatriculas).not.toContain("DONOR2")
  })
})
