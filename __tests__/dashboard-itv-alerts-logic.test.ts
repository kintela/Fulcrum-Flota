import { describe, it, expect } from "@jest/globals"

// Función auxiliar para simular la lógica de filtrado de ITVs
function filterItvAlerts(itvs: any[], today: Date) {
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  // Filtrar para obtener solo el registro más reciente de cada vehículo
  const latestItvs = []
  const processedMatriculas = new Set()

  // Ordenar por fecha de revisión (los que tienen fecha primero, luego por ID descendente)
  const sortedItvs = [...itvs].sort((a, b) => {
    // Si ambos tienen fecharevision, ordenar por fecha descendente
    if (a.fecharevision && b.fecharevision) {
      return new Date(b.fecharevision).getTime() - new Date(a.fecharevision).getTime()
    }
    // Si solo uno tiene fecharevision, ese va primero
    if (a.fecharevision && !b.fecharevision) return -1
    if (!a.fecharevision && b.fecharevision) return 1
    // Si ninguno tiene fecharevision, ordenar por ID descendente
    return b.id - a.id
  })

  for (const itv of sortedItvs) {
    if (!processedMatriculas.has(itv.matricula)) {
      latestItvs.push(itv)
      processedMatriculas.add(itv.matricula)
    }
  }

  return latestItvs.filter((itv) => {
    // Skip donor vehicles
    if (itv.coches?.donante === true) return false

    const fechaProximaRevision = new Date(itv.fechaproximarevision)

    // Si la ITV ya se realizó con resultado "Apto"
    if (itv.fecharevision && itv.resultado === "Apto") {
      // Si la fechaproximarevision ya pasó, NO mostrar alerta (la ITV se pasó correctamente)
      if (fechaProximaRevision < today) {
        return false
      }
      // Solo mostrar alerta si la próxima revisión está dentro de 30 días
      return fechaProximaRevision <= thirtyDaysFromNow
    }

    // Para ITVs no realizadas o con otros resultados, usar la fecha de próxima revisión
    return fechaProximaRevision <= thirtyDaysFromNow
  })
}

describe("Dashboard ITV Alerts Logic with Apto Result Handling", () => {
  const today = new Date("2025-07-08") // Fecha fija para las pruebas

  it("should NOT show alert for ITV with Apto result and overdue fechaproximarevision", () => {
    const itvs = [
      {
        id: 1,
        matricula: "7234-DXK",
        fecharevision: "2025-06-15", // ITV realizada
        fechaproximarevision: "2025-07-01", // Fecha ya pasada
        resultado: "Apto", // Resultado Apto
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // NO debe aparecer alerta porque tiene resultado Apto y la fecha ya pasó
    expect(alerts).toHaveLength(0)
  })

  it("should show alert for ITV without fecharevision and overdue fechaproximarevision", () => {
    const itvs = [
      {
        id: 1,
        matricula: "8269-DTC",
        fecharevision: null, // ITV no realizada
        fechaproximarevision: "2025-07-01", // Fecha ya pasada
        resultado: null,
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // SÍ debe aparecer alerta porque no tiene fecharevision (no se ha realizado)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].matricula).toBe("8269-DTC")
  })

  it("should show alert for ITV with No Apto result and overdue fechaproximarevision", () => {
    const itvs = [
      {
        id: 1,
        matricula: "1111-AAA",
        fecharevision: "2025-06-15",
        fechaproximarevision: "2025-07-01", // Fecha ya pasada
        resultado: "No Apto", // Resultado No Apto
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // SÍ debe aparecer alerta porque el resultado es No Apto
    expect(alerts).toHaveLength(1)
    expect(alerts[0].matricula).toBe("1111-AAA")
  })

  it("should show alert for ITV with Apto result but fechaproximarevision within 30 days", () => {
    const itvs = [
      {
        id: 1,
        matricula: "2222-BBB",
        fecharevision: "2025-06-15",
        fechaproximarevision: "2025-07-15", // Dentro de 30 días
        resultado: "Apto",
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // SÍ debe aparecer alerta porque está dentro de 30 días
    expect(alerts).toHaveLength(1)
    expect(alerts[0].matricula).toBe("2222-BBB")
  })

  it("should handle mixed scenarios correctly", () => {
    const itvs = [
      {
        id: 1,
        matricula: "7234-DXK",
        fecharevision: "2025-06-15",
        fechaproximarevision: "2025-07-01", // Apto + vencida = NO alerta
        resultado: "Apto",
        coches: { donante: false },
      },
      {
        id: 2,
        matricula: "8269-DTC",
        fecharevision: null,
        fechaproximarevision: "2025-07-01", // Sin realizar + vencida = SÍ alerta
        resultado: null,
        coches: { donante: false },
      },
      {
        id: 3,
        matricula: "1111-AAA",
        fecharevision: "2025-06-15",
        fechaproximarevision: "2025-07-01", // No Apto + vencida = SÍ alerta
        resultado: "No Apto",
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // Solo deben aparecer 8269-DTC y 1111-AAA
    expect(alerts).toHaveLength(2)
    const matriculas = alerts.map((alert) => alert.matricula)
    expect(matriculas).toContain("8269-DTC")
    expect(matriculas).toContain("1111-AAA")
    expect(matriculas).not.toContain("7234-DXK")
  })
})
