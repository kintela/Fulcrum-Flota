import { describe, it, expect } from "@jest/globals"

// Función auxiliar para simular la lógica de filtrado de ITVs
function filterItvAlerts(itvs: any[], today: Date) {
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  // Filtrar para obtener solo el registro más reciente de cada vehículo
  const latestItvs = []
  const processedMatriculas = new Set()

  // Ordenar por fecharevision descendente
  const sortedItvs = [...itvs].sort((a, b) => {
    const dateA = a.fecharevision ? new Date(a.fecharevision).getTime() : 0
    const dateB = b.fecharevision ? new Date(b.fecharevision).getTime() : 0
    return dateB - dateA
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
      // Solo mostrar alerta si la próxima revisión está dentro de 30 días
      return fechaProximaRevision <= thirtyDaysFromNow
    }

    // Para ITVs no realizadas o con otros resultados, usar la fecha de próxima revisión
    return fechaProximaRevision <= thirtyDaysFromNow
  })
}

describe("Dashboard ITV Alerts Logic with Multiple Records", () => {
  const today = new Date("2025-07-08") // Fecha fija para las pruebas

  it("should use only the most recent ITV record for each vehicle", () => {
    const itvs = [
      {
        id: 1,
        matricula: "3656-GLH",
        fecharevision: "2025-06-15",
        fechaproximarevision: "2025-06-18", // Registro antiguo
        resultado: "No Apto",
        coches: { donante: false },
      },
      {
        id: 2,
        matricula: "3656-GLH",
        fecharevision: "2025-06-20",
        fechaproximarevision: "2026-06-18", // Registro más reciente
        resultado: "Apto",
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // No debe aparecer alerta porque el registro más reciente tiene fechaproximarevision en 2026
    expect(alerts).toHaveLength(0)
  })

  it("should show alert for vehicle with recent ITV but next revision within 30 days", () => {
    const itvs = [
      {
        id: 1,
        matricula: "3799-DZF",
        fecharevision: "2024-07-15",
        fechaproximarevision: "2025-07-15", // Registro antiguo
        resultado: "No Apto",
        coches: { donante: false },
      },
      {
        id: 2,
        matricula: "3799-DZF",
        fecharevision: "2025-06-20",
        fechaproximarevision: "2025-07-19", // Registro más reciente, dentro de 30 días
        resultado: "Apto",
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // Debe aparecer alerta porque fechaproximarevision está dentro de 30 días
    expect(alerts).toHaveLength(1)
    expect(alerts[0].matricula).toBe("3799-DZF")
    expect(alerts[0].fechaproximarevision).toBe("2025-07-19")
  })

  it("should handle multiple vehicles with multiple records each", () => {
    const itvs = [
      // Vehículo 1: Registro antiguo
      {
        id: 1,
        matricula: "1111-AAA",
        fecharevision: "2024-06-15",
        fechaproximarevision: "2025-06-15",
        resultado: "No Apto",
        coches: { donante: false },
      },
      // Vehículo 1: Registro más reciente (Apto, próxima revisión lejana)
      {
        id: 2,
        matricula: "1111-AAA",
        fecharevision: "2025-06-20",
        fechaproximarevision: "2026-06-20",
        resultado: "Apto",
        coches: { donante: false },
      },
      // Vehículo 2: Registro antiguo
      {
        id: 3,
        matricula: "2222-BBB",
        fecharevision: "2024-07-01",
        fechaproximarevision: "2025-07-01",
        resultado: "Apto",
        coches: { donante: false },
      },
      // Vehículo 2: Registro más reciente (Apto, próxima revisión cercana)
      {
        id: 4,
        matricula: "2222-BBB",
        fecharevision: "2025-06-25",
        fechaproximarevision: "2025-07-15", // Dentro de 30 días
        resultado: "Apto",
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // Solo debe aparecer el vehículo 2222-BBB
    expect(alerts).toHaveLength(1)
    expect(alerts[0].matricula).toBe("2222-BBB")
    expect(alerts[0].fechaproximarevision).toBe("2025-07-15")
  })

  it("should exclude donor vehicles even with multiple records", () => {
    const itvs = [
      {
        id: 1,
        matricula: "3333-CCC",
        fecharevision: "2025-06-15",
        fechaproximarevision: "2025-07-10", // Dentro de 30 días
        resultado: "Apto",
        coches: { donante: true }, // Vehículo donante
      },
      {
        id: 2,
        matricula: "3333-CCC",
        fecharevision: "2025-06-20",
        fechaproximarevision: "2025-07-12",
        resultado: "Apto",
        coches: { donante: true },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // No debe aparecer porque es vehículo donante
    expect(alerts).toHaveLength(0)
  })

  it("should handle vehicles with no fecharevision (not performed yet)", () => {
    const itvs = [
      {
        id: 1,
        matricula: "4444-DDD",
        fecharevision: null,
        fechaproximarevision: "2025-07-15", // Dentro de 30 días
        resultado: null,
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // Debe aparecer porque fechaproximarevision está dentro de 30 días
    expect(alerts).toHaveLength(1)
    expect(alerts[0].matricula).toBe("4444-DDD")
  })

  it("should prioritize most recent fecharevision when determining latest record", () => {
    const itvs = [
      {
        id: 1,
        matricula: "5555-EEE",
        fecharevision: "2025-06-25", // Más reciente
        fechaproximarevision: "2025-07-15",
        resultado: "Apto",
        coches: { donante: false },
      },
      {
        id: 2,
        matricula: "5555-EEE",
        fecharevision: "2025-06-20", // Menos reciente
        fechaproximarevision: "2026-06-20",
        resultado: "Apto",
        coches: { donante: false },
      },
    ]

    const alerts = filterItvAlerts(itvs, today)

    // Debe usar el registro con fecharevision más reciente (2025-06-25)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].fechaproximarevision).toBe("2025-07-15")
  })
})
