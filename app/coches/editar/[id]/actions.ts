"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import {
  asignarTarjetaSolred,
  desasignarTarjetaSolred,
  obtenerTarjetaAsignada,
  crearTarjetaSolred,
} from "@/app/actions/solred"
import { asignarTarjetaViat } from "@/app/actions/viats"

export async function editarCoche(id: string, formData: FormData) {
  try {
    const cocheData = {
      matricula: formData.get("matricula") as string,
      marca: formData.get("marca") as string,
      modelo: formData.get("modelo") as string,
      color: (formData.get("color") as string) || null,
      fechamatriculacion: (formData.get("fechamatriculacion") as string) || null,
      kms: formData.get("kms") ? Number.parseInt(formData.get("kms") as string) : 0,
      kw: formData.get("kw") ? Number.parseInt(formData.get("kw") as string) : null,
      cv: formData.get("cv") ? Number.parseInt(formData.get("cv") as string) : null,
      cc: formData.get("cc") ? Number.parseInt(formData.get("cc") as string) : null,
      combustible: (formData.get("combustible") as string) || "Gasolina",
      extras: (formData.get("extras") as string) || null,
      donante: formData.get("donante") === "on",
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
    }

    // Validaciones básicas
    if (!cocheData.matricula || !cocheData.marca || !cocheData.modelo) {
      return {
        success: false,
        error: "Los campos matrícula, marca y modelo son obligatorios",
      }
    }

    // Actualizar en Supabase usando matricula como clave primaria
    const { data, error } = await supabase.from("coches").update(cocheData).eq("matricula", id).select()

    if (error) {
      console.error("Error al actualizar coche:", error)
      return {
        success: false,
        error: `Error al actualizar el coche: ${error.message}`,
      }
    }

    // Obtener el valor actual de asignadoa para usar en ViaT
    const { data: cocheActual, error: errorCoche } = await supabase
      .from("coches")
      .select("asignadoa")
      .eq("matricula", id)
      .single()

    if (errorCoche) {
      console.error("Error al obtener datos del coche:", errorCoche)
    }

    // Gestionar tarjeta SOLRED
    const numeroTarjetaSolred = formData.get("numero_tarjeta_solred") as string
    const nuevaTarjetaNumero = formData.get("nueva_tarjeta_numero") as string
    const nuevaTarjetaPin = formData.get("nueva_tarjeta_pin") as string
    const nuevaTarjetaVencimiento = formData.get("nueva_tarjeta_vencimiento") as string
    const tarjetaActual = await obtenerTarjetaAsignada(id)

    if (nuevaTarjetaNumero && nuevaTarjetaPin && nuevaTarjetaVencimiento) {
      // Crear nueva tarjeta SOLRED
      const resultadoCreacion = await crearTarjetaSolred(nuevaTarjetaNumero, nuevaTarjetaPin, nuevaTarjetaVencimiento)
      if (resultadoCreacion.success) {
        // Desasignar tarjeta actual si existe
        if (tarjetaActual) {
          await desasignarTarjetaSolred(id)
        }
        // Asignar la nueva tarjeta al coche
        const resultadoAsignacion = await asignarTarjetaSolred(id, nuevaTarjetaNumero)
        if (!resultadoAsignacion.success) {
          console.warn("Error al asignar nueva tarjeta SOLRED:", resultadoAsignacion.error)
        }
      } else {
        console.warn("Error al crear nueva tarjeta SOLRED:", resultadoCreacion.error)
      }
    } else if (numeroTarjetaSolred && numeroTarjetaSolred.trim() !== "") {
      // Si hay una nueva tarjeta especificada
      if (!tarjetaActual || tarjetaActual.numero_tarjeta !== numeroTarjetaSolred.trim()) {
        // Desasignar tarjeta actual si existe
        if (tarjetaActual) {
          await desasignarTarjetaSolred(id)
        }
        // Asignar nueva tarjeta
        const resultadoSolred = await asignarTarjetaSolred(id, numeroTarjetaSolred.trim())
        if (!resultadoSolred.success) {
          console.warn("Error al asignar tarjeta SOLRED:", resultadoSolred.error)
        }
      }
    } else {
      // Si no hay tarjeta especificada, desasignar la actual si existe
      if (tarjetaActual) {
        await desasignarTarjetaSolred(id)
      }
    }

    // Gestionar tarjeta ViaT usando el valor de asignadoa del coche
    if (cocheActual?.asignadoa) {
      const viatId = formData.get("viat_id") as string
      const observacionesViat = formData.get("observaciones_viat") as string

      if (viatId && viatId !== "") {
        // Asignar tarjeta ViaT al empleado usando el asignadoa del coche
        const resultadoViat = await asignarTarjetaViat(
          Number.parseInt(cocheActual.asignadoa),
          Number.parseInt(viatId),
          observacionesViat || "",
        )

        if (!resultadoViat.success) {
          console.warn("Error al asignar tarjeta ViaT:", resultadoViat.error)
        }
      }
    }

    // Revalidar las páginas relevantes
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${id}`)
    revalidatePath("/")

    return {
      success: true,
      data: data[0],
    }
  } catch (error) {
    console.error("Error en editarCoche:", error)
    return {
      success: false,
      error: "Error inesperado al actualizar el coche",
    }
  }
}

export async function obtenerCoche(matricula: string) {
  if (!matricula || matricula === "undefined") {
    return null
  }

  try {
    const { data, error } = await supabase.from("coches").select("*").eq("matricula", matricula)

    if (error) {
      console.error("Error al obtener coche:", error)
      return null
    }

    // Si no hay datos, retornar null
    if (!data || data.length === 0) {
      return null
    }

    // Si hay múltiples registros, tomar el primero y registrar advertencia
    if (data.length > 1) {
      console.warn(`Múltiples coches encontrados con matrícula ${matricula}, tomando el primero`)
    }

    // Obtener tarjeta SOLRED asignada
    const tarjetaSolred = await obtenerTarjetaAsignada(matricula)
    if (tarjetaSolred && tarjetaSolred.tarjetassolred) {
      data[0].tarjeta_solred = tarjetaSolred.tarjetassolred
    }

    return data[0]
  } catch (error) {
    console.error("Error en obtenerCoche:", error)
    return null
  }
}

// Exportación adicional para compatibilidad
export { editarCoche as actualizarCoche }
