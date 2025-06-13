"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import {
  asignarTarjetaSolred,
  desasignarTarjetaSolred,
  obtenerTarjetaAsignada,
  crearTarjetaSolred,
} from "@/app/actions/solred"

export async function editarCoche(id: string, formData: FormData) {
  try {
    // Extraer datos del formulario
    const empleadoId = formData.get("empleado_id") as string

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
      asignadoa: empleadoId || null,
      alquiler: formData.get("alquiler") === "on",
      preciocompra: formData.get("preciocompra") ? Number.parseFloat(formData.get("preciocompra") as string) : null,
      // Nuevos campos para la relación con empleados
      empleado_id: empleadoId ? Number.parseInt(empleadoId) : null,
      fecha_asignacion: (formData.get("fecha_asignacion") as string) || null,
      observaciones_asignacion: (formData.get("observaciones_asignacion") as string) || null,
    }

    // Validaciones básicas
    if (!cocheData.matricula || !cocheData.marca || !cocheData.modelo) {
      return {
        success: false,
        error: "Los campos matrícula, marca y modelo son obligatorios",
      }
    }

    // Si no es alquiler y se asigna a empleado, validar que existe el empleado
    if (!cocheData.alquiler && cocheData.empleado_id) {
      const { data: empleado, error: empleadoError } = await supabase
        .from("empleados")
        .select("id")
        .eq("id", cocheData.empleado_id)
        .single()

      if (empleadoError || !empleado) {
        return {
          success: false,
          error: "El empleado seleccionado no existe",
        }
      }
    }

    // Si es alquiler, limpiar campos de empleado
    if (cocheData.alquiler) {
      cocheData.empleado_id = null
      cocheData.fecha_asignacion = null
      cocheData.observaciones_asignacion = null
      cocheData.asignadoa = null
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

export async function obtenerCoche(id: string) {
  if (!id || id === "undefined") {
    return null
  }

  try {
    const { data, error } = await supabase.from("coches").select("*").eq("matricula", id)

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
      console.warn(`Múltiples coches encontrados con matrícula ${id}, tomando el primero`)
    }

    // Obtener tarjeta SOLRED asignada
    const tarjetaSolred = await obtenerTarjetaAsignada(id)
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
