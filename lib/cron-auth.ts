// Autenticación de los procesos programados de Vercel (spec 018).
// Vercel envía `Authorization: Bearer <CRON_SECRET>` a los crons de vercel.json cuando
// existe la variable de entorno CRON_SECRET. Solo se usa en servidor.

import { timingSafeEqual } from "crypto"

export function esPeticionCronAutorizada(request: Pick<Request, "headers">): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false // RF-6: sin secreto configurado no se acepta ninguna ejecución

  const recibido = Buffer.from(request.headers.get("authorization") ?? "", "utf-8")
  const esperado = Buffer.from(`Bearer ${secreto}`, "utf-8")

  // Comparación en tiempo constante; timingSafeEqual exige longitudes iguales.
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado)
}
