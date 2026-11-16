/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals"
import fs from "fs"
import path from "path"

const raiz = process.cwd()

describe("endpoints de depuración y código muerto eliminados (RF-1, RF-2, RF-21)", () => {
  it.each([
    "app/api/public",
    "app/api/debug",
    "app/api/test",
    "app/api/diagnostico/reservas",
    "app/api/diagnostico/forzar-notificaciones",
    "lib/init-scheduler.ts",
    "lib/scheduler.ts",
    "app/diagnostico.tsx",
    "app/actions/notificaciones-v2.ts",
  ])("%s no existe", (ruta) => {
    expect(fs.existsSync(path.join(raiz, ruta))).toBe(false)
  })

  it("se conserva /api/diagnostico (lo usa la página /diagnostico)", () => {
    expect(fs.existsSync(path.join(raiz, "app/api/diagnostico/route.ts"))).toBe(true)
  })

  it("app/layout.tsx ya no menciona el scheduler local", () => {
    expect(fs.readFileSync(path.join(raiz, "app/layout.tsx"), "utf-8")).not.toMatch(/init-scheduler/)
  })
})
