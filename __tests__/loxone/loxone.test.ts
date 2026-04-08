import { describe, expect, it } from "@jest/globals"
import {
  buildCreateAccessCodeCommand,
  buildSingleOutputMask,
  findAccessCodeTouchControls,
  parseLoxoneValuePayload,
} from "@/lib/loxone"

describe("loxone helpers", () => {
  it("parses Loxone pseudo-json values", () => {
    const parsed = parseLoxoneValuePayload<{
      version: string
      local: boolean
      address: string
    }>(
      "{'version':'16.1.11.6','local':true,'address':'192.168.100.180'}",
    )

    expect(parsed).toEqual({
      version: "16.1.11.6",
      local: true,
      address: "192.168.100.180",
    })
  })

  it("builds the expected bitmask for a single locker output", () => {
    expect(buildSingleOutputMask(1)).toBe(1)
    expect(buildSingleOutputMask(2)).toBe(2)
    expect(buildSingleOutputMask(6)).toBe(32)
  })

  it("detects NFC Code Touch controls from the structure file", () => {
    const controls = findAccessCodeTouchControls({
      rooms: {
        "room-1": { name: "Central" },
      },
      cats: {
        "cat-1": { name: "Acceso" },
      },
      controls: {
        "uuid-access": {
          name: "CASILLERO 1",
          type: "NfcCodeTouch",
          room: "room-1",
          cat: "cat-1",
          details: {
            accessOutputs: {
              q1: "CASILLERO 1",
              q2: "CASILLERO 2",
              q6: "CASILLERO 6",
            },
          },
        },
        "uuid-other": {
          name: "Luz Recepción",
          type: "Switch",
          room: "room-1",
          cat: "cat-1",
          details: {},
        },
      },
    })

    expect(controls).toHaveLength(1)
    expect(controls[0]).toMatchObject({
      uuid: "uuid-access",
      name: "CASILLERO 1",
      roomName: "Central",
      categoryName: "Acceso",
      availableOutputs: [1, 2, 6],
    })
  })

  it("builds the create command for a time-dependent access code", () => {
    const command = buildCreateAccessCodeCommand({
      controlUuid: "uuid-access",
      name: "Reserva ABC",
      code: "123456",
      type: 2,
      outputsMask: 4,
      standardOutput: 3,
      timeFrom: new Date("2026-04-08T10:00:00Z"),
      timeTo: new Date("2026-04-08T18:00:00Z"),
    })

    expect(command).toBe(
      "/jdev/sps/io/uuid-access/code/create/Reserva%20ABC/123456/2/4/3/1775642400/1775671200",
    )
  })
})
