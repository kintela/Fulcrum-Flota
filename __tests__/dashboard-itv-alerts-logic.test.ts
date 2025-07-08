import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals"

// Función extraída de la lógica del dashboard para poder testearla
function calculateITVAlertsWithAptoLogic(itvs: any[]) {
  const today = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  const itvAlerts = (itvs || []).filter((itv) => {
    // Skip donor vehicles
    if (itv.coches?.donante === true) return false

    const fechaProximaRevision = new Date(itv.fechaproximarevision)

    // Si la ITV ya se realizó con resultado "Apto"
    if (itv.fecharevision && itv.resultado === "Apto") {
      // Solo mostrar alerta si la próxima revisión está dentro de 30 días
      return fechaProximaRevision <= thirtyDaysFromNow
    }

    // Para ITVs no realizadas o con otros resultados, mostrar si están dentro de 30 días
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

describe("Dashboard ITV Alerts Logic with Apto Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock current date to have consistent tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2024-01-15")) // Fixed date for testing
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should NOT show alerts for ITVs with Apto result when next revision is more than 30 days away", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1234ABC",
        fecharevision: "2023-12-01", // ITV realizada hace 45 días
        resultado: "Apto",
        fechaproximarevision: "2024-03-01", // Próxima revisión en 46 días (más de 30)
        coches: { matricula: "1234ABC", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })

  it("should show alerts for ITVs with Apto result when next revision is within 30 days", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1234ABC",
        fecharevision: "2023-12-01", // ITV realizada hace 45 días
        resultado: "Apto",
        fechaproximarevision: "2024-02-10", // Próxima revisión en 26 días (dentro de 30)
        coches: { matricula: "1234ABC", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles).toHaveLength(1)
    expect(alerts.detalles[0].matricula).toBe("1234ABC")
  })

  it("should show alerts for ITVs with Apto result when next revision is overdue", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1234ABC",
        fecharevision: "2022-12-01", // ITV realizada hace más de 1 año
        resultado: "Apto",
        fechaproximarevision: "2024-01-10", // Próxima revisión vencida hace 5 días
        coches: { matricula: "1234ABC", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(1)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(1)
    expect(alerts.detalles[0].matricula).toBe("1234ABC")
  })

  it("should show alerts for ITVs without fecharevision (not yet performed) when within 30 days", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1234ABC",
        fecharevision: null, // ITV no realizada
        resultado: null,
        fechaproximarevision: "2024-02-10", // Próxima revisión en 26 días
        coches: { matricula: "1234ABC", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles).toHaveLength(1)
  })

  it("should show alerts for ITVs with No Apto result regardless of when next revision is", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1234ABC",
        fecharevision: "2023-12-01",
        resultado: "No Apto",
        fechaproximarevision: "2024-03-01", // Próxima revisión en 46 días (más de 30)
        coches: { matricula: "1234ABC", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles).toHaveLength(1)
  })

  it("should show alerts for ITVs with Apto Con Observaciones result when within 30 days", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1234ABC",
        fecharevision: "2023-12-01",
        resultado: "Apto Con Observaciones",
        fechaproximarevision: "2024-02-10", // Próxima revisión en 26 días
        coches: { matricula: "1234ABC", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles).toHaveLength(1)
  })

  it("should exclude donor vehicles from alerts even with Apto result and overdue next revision", () => {
    const itvs = [
      {
        id: 1,
        matricula: "DONOR1",
        fecharevision: "2022-12-01",
        resultado: "Apto",
        fechaproximarevision: "2024-01-10", // Vencida hace 5 días
        coches: { matricula: "DONOR1", donante: true },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })

  it("should handle mixed scenarios correctly", () => {
    const itvs = [
      {
        id: 1,
        matricula: "APTO_LEJANA",
        fecharevision: "2023-12-01",
        resultado: "Apto",
        fechaproximarevision: "2024-03-01", // 46 días (no debe aparecer)
        coches: { matricula: "APTO_LEJANA", donante: false },
      },
      {
        id: 2,
        matricula: "APTO_CERCANA",
        fecharevision: "2023-12-01",
        resultado: "Apto",
        fechaproximarevision: "2024-02-10", // 26 días (debe aparecer)
        coches: { matricula: "APTO_CERCANA", donante: false },
      },
      {
        id: 3,
        matricula: "APTO_VENCIDA",
        fecharevision: "2022-12-01",
        resultado: "Apto",
        fechaproximarevision: "2024-01-10", // Vencida (debe aparecer)
        coches: { matricula: "APTO_VENCIDA", donante: false },
      },
      {
        id: 4,
        matricula: "NO_APTO",
        fecharevision: "2023-12-01",
        resultado: "No Apto",
        fechaproximarevision: "2024-03-01", // 46 días pero No Apto (debe aparecer)
        coches: { matricula: "NO_APTO", donante: false },
      },
      {
        id: 5,
        matricula: "SIN_REALIZAR",
        fecharevision: null,
        resultado: null,
        fechaproximarevision: "2024-02-05", // 21 días (debe aparecer)
        coches: { matricula: "SIN_REALIZAR", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(4) // Todos excepto APTO_LEJANA
    expect(alerts.vencidas).toBe(1) // Solo APTO_VENCIDA
    expect(alerts.proximasVencer).toBe(3) // APTO_CERCANA, NO_APTO, SIN_REALIZAR

    const alertMatriculas = alerts.detalles.map((itv: any) => itv.matricula)
    expect(alertMatriculas).toContain("APTO_CERCANA")
    expect(alertMatriculas).toContain("APTO_VENCIDA")
    expect(alertMatriculas).toContain("NO_APTO")
    expect(alertMatriculas).toContain("SIN_REALIZAR")
    expect(alertMatriculas).not.toContain("APTO_LEJANA")
  })

  it("should handle edge case: Apto ITV with next revision exactly 30 days away", () => {
    const itvs = [
      {
        id: 1,
        matricula: "EDGE30",
        fecharevision: "2023-12-01",
        resultado: "Apto",
        fechaproximarevision: "2024-02-14", // Exactamente 30 días
        coches: { matricula: "EDGE30", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(1)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(1)
    expect(alerts.detalles[0].matricula).toBe("EDGE30")
  })

  it("should handle edge case: Apto ITV with next revision exactly 31 days away", () => {
    const itvs = [
      {
        id: 1,
        matricula: "EDGE31",
        fecharevision: "2023-12-01",
        resultado: "Apto",
        fechaproximarevision: "2024-02-15", // Exactamente 31 días (no debe aparecer)
        coches: { matricula: "EDGE31", donante: false },
      },
    ]

    const alerts = calculateITVAlertsWithAptoLogic(itvs)

    expect(alerts.total).toBe(0)
    expect(alerts.vencidas).toBe(0)
    expect(alerts.proximasVencer).toBe(0)
    expect(alerts.detalles).toHaveLength(0)
  })
})
