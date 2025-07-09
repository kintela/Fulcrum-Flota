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

describe("Dashboard ITV Alerts Logic - Complete Test Suite", () => {
  const today = new Date("2025-07-08") // Fecha fija para las pruebas

  describe("ITVs con resultado Apto", () => {
    it("should NOT show alert for ITV with Apto result and overdue fechaproximarevision", () => {
      const itvs = [
        {
          id: 1,
          matricula: "7234-DXK",
          fecharevision: "2025-06-15", // ITV realizada
          fechaproximarevision: "2025-07-01", // Fecha ya pasada (hace 7 días)
          resultado: "Apto", // Resultado Apto
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // NO debe aparecer alerta porque tiene resultado Apto y la fecha ya pasó
      expect(alerts).toHaveLength(0)
    })

    it("should show alert for ITV with Apto result and fechaproximarevision within 30 days", () => {
      const itvs = [
        {
          id: 1,
          matricula: "2222-BBB",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-07-15", // En 7 días (dentro de 30)
          resultado: "Apto",
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // SÍ debe aparecer alerta porque está dentro de 30 días
      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("2222-BBB")
    })

    it("should NOT show alert for ITV with Apto result and fechaproximarevision beyond 30 days", () => {
      const itvs = [
        {
          id: 1,
          matricula: "3333-CCC",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-08-15", // En 38 días (fuera de 30)
          resultado: "Apto",
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // NO debe aparecer alerta porque está fuera de 30 días
      expect(alerts).toHaveLength(0)
    })
  })

  describe("ITVs sin realizar (fecharevision null)", () => {
    it("should show alert for ITV without fecharevision and overdue fechaproximarevision", () => {
      const itvs = [
        {
          id: 1,
          matricula: "8269-DTC",
          fecharevision: null, // ITV no realizada
          fechaproximarevision: "2025-07-01", // Fecha ya pasada (hace 7 días)
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // SÍ debe aparecer alerta porque no se ha realizado la ITV
      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("8269-DTC")
    })

    it("should show alert for ITV without fecharevision and fechaproximarevision within 30 days", () => {
      const itvs = [
        {
          id: 1,
          matricula: "4444-DDD",
          fecharevision: null,
          fechaproximarevision: "2025-07-15", // En 7 días
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // SÍ debe aparecer alerta
      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("4444-DDD")
    })

    it("should NOT show alert for ITV without fecharevision and fechaproximarevision beyond 30 days", () => {
      const itvs = [
        {
          id: 1,
          matricula: "5555-EEE",
          fecharevision: null,
          fechaproximarevision: "2025-08-15", // En 38 días
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // NO debe aparecer alerta porque está fuera de 30 días
      expect(alerts).toHaveLength(0)
    })
  })

  describe("ITVs con otros resultados (No Apto, Apto Con Observaciones)", () => {
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

    it("should show alert for ITV with Apto Con Observaciones result and overdue fechaproximarevision", () => {
      const itvs = [
        {
          id: 1,
          matricula: "6666-FFF",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-07-01", // Fecha ya pasada
          resultado: "Apto Con Observaciones",
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // SÍ debe aparecer alerta porque no es "Apto" exacto
      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("6666-FFF")
    })

    it("should show alert for ITV with No Apto result and fechaproximarevision beyond 30 days", () => {
      const itvs = [
        {
          id: 1,
          matricula: "7777-GGG",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-08-15", // En 38 días (fuera de 30)
          resultado: "No Apto",
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // SÍ debe aparecer alerta porque No Apto siempre genera alerta dentro de 30 días
      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("7777-GGG")
    })
  })

  describe("Casos edge y múltiples registros", () => {
    it("should exclude donor vehicles from all alerts", () => {
      const itvs = [
        {
          id: 1,
          matricula: "DONOR1",
          fecharevision: null,
          fechaproximarevision: "2025-07-01", // Vencida
          resultado: null,
          coches: { donante: true }, // Vehículo donante
        },
        {
          id: 2,
          matricula: "DONOR2",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-07-01", // Vencida + No Apto
          resultado: "No Apto",
          coches: { donante: true }, // Vehículo donante
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // NO debe aparecer ninguna alerta porque son vehículos donantes
      expect(alerts).toHaveLength(0)
    })

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
          fecharevision: "2025-06-20", // Más reciente
          fechaproximarevision: "2026-06-18", // Próxima revisión en 2026
          resultado: "Apto",
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // NO debe aparecer alerta porque el registro más reciente tiene fechaproximarevision en 2026
      expect(alerts).toHaveLength(0)
    })

    it("should handle mixed real-world scenarios correctly", () => {
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
        {
          id: 4,
          matricula: "2222-BBB",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-07-15", // Apto + dentro de 30 días = SÍ alerta
          resultado: "Apto",
          coches: { donante: false },
        },
        {
          id: 5,
          matricula: "3333-CCC",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-08-15", // Apto + fuera de 30 días = NO alerta
          resultado: "Apto",
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      // Solo deben aparecer: 8269-DTC, 1111-AAA, 2222-BBB
      expect(alerts).toHaveLength(3)
      const matriculas = alerts.map((alert) => alert.matricula).sort()
      expect(matriculas).toEqual(["1111-AAA", "2222-BBB", "8269-DTC"])
    })
  })

  describe("Casos límite de fechas", () => {
    it("should show alert for fechaproximarevision exactly 30 days away", () => {
      const itvs = [
        {
          id: 1,
          matricula: "EDGE30",
          fecharevision: null,
          fechaproximarevision: "2025-08-07", // Exactamente 30 días
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("EDGE30")
    })

    it("should NOT show alert for fechaproximarevision exactly 31 days away", () => {
      const itvs = [
        {
          id: 1,
          matricula: "EDGE31",
          fecharevision: null,
          fechaproximarevision: "2025-08-08", // Exactamente 31 días
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      expect(alerts).toHaveLength(0)
    })

    it("should show alert for fechaproximarevision exactly today", () => {
      const itvs = [
        {
          id: 1,
          matricula: "TODAY",
          fecharevision: null,
          fechaproximarevision: "2025-07-08", // Hoy mismo
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("TODAY")
    })
  })

  describe("Validación de la lógica específica del problema reportado", () => {
    it("REGRESSION TEST: 7234-DXK should NOT appear (Apto + overdue)", () => {
      const itvs = [
        {
          id: 1,
          matricula: "7234-DXK",
          fecharevision: "2025-06-15",
          fechaproximarevision: "2025-07-01", // Vencida hace 7 días
          resultado: "Apto", // ITV pasada correctamente
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      expect(alerts).toHaveLength(0)
      expect(alerts.find((alert) => alert.matricula === "7234-DXK")).toBeUndefined()
    })

    it("REGRESSION TEST: 8269-DTC should appear (not performed + overdue)", () => {
      const itvs = [
        {
          id: 1,
          matricula: "8269-DTC",
          fecharevision: null, // No realizada
          fechaproximarevision: "2025-07-01", // Vencida hace 7 días
          resultado: null,
          coches: { donante: false },
        },
      ]

      const alerts = filterItvAlerts(itvs, today)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("8269-DTC")
    })

    it("COMPREHENSIVE TEST: Both vehicles together should show correct behavior", () => {
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
      ]

      const alerts = filterItvAlerts(itvs, today)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].matricula).toBe("8269-DTC")
      expect(alerts.find((alert) => alert.matricula === "7234-DXK")).toBeUndefined()
    })
  })
})
