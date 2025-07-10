"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function editarCoche(formData: FormData) {
  try {
    const matricula = formData.get("matricula") as string
    const marca = formData.get("marca") as string
    const modelo = formData.get("modelo") as string
    const color = formData.get("color") as string
    const anio = formData.get("anio") as string
    const asignadoa = formData.get("asignadoa") as string
    const donante = formData.get("donante") === "on"
    const extras = formData.get("extras") as string

    console.log("Editando coche:", {
      matricula,
      marca,
      modelo,
      color,
      anio,
      asignadoa,
      donante,
      extras,
    })

    // Validaciones básicas
    if (!matricula || !marca || !modelo) {
      return {
        success: false,
        error: "Matrícula, marca y modelo son campos obligatorios",
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {
      marca: marca.trim(),
      modelo: modelo.trim(),
      color: color?.trim() || null,
      anio: anio ? Number.parseInt(anio) : null,
      donante,
      extras: extras?.trim() || null,
    }

    // Manejar asignación
    if (donante) {
      // Si es donante, no puede estar asignado
      updateData.asignadoa = null
    } else {
      // Si no es donante, manejar asignación
      if (asignadoa && asignadoa !== "") {
        // Verificar si es un ID numérico (empleado) o texto libre
        const empleadoId = Number.parseInt(asignadoa)
        if (!isNaN(empleadoId)) {
          // Es un ID de empleado, verificar que existe
          const { data: empleado, error: empleadoError } = await supabase
            .from("empleados")
            .select("id")
            .eq("id", empleadoId)
            .single()

          if (empleadoError || !empleado) {
            return {
              success: false,
              error: "El empleado seleccionado no existe",
            }
          }
          updateData.asignadoa = empleadoId
        } else {
          // Es texto libre
          updateData.asignadoa = asignadoa.trim()
        }
      } else {
        updateData.asignadoa = null
      }
    }

    // Actualizar en la base de datos
    const { data, error } = await supabase.from("coches").update(updateData).eq("matricula", matricula).select()

    if (error) {
      console.error("Error actualizando coche:", error)
      return {
        success: false,
        error: "Error al actualizar el vehículo en la base de datos",
      }
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "No se encontró el vehículo para actualizar",
      }
    }

    console.log("Coche actualizado exitosamente:", data[0])

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath(`/coches/detalle/${matricula}`)
    revalidatePath(`/coches/editar/${matricula}`)
    revalidatePath("/") // Dashboard

    return {
      success: true,
      message: "Vehículo actualizado correctamente",
      data: data[0],
    }
  } catch (error) {
    console.error("Error en editarCoche:", error)
    return {
      success: false,
      error: "Error interno del servidor",
    }
  }
}

export async function eliminarCoche(matricula: string) {
  try {
    console.log("Eliminando coche:", matricula)

    // Verificar que el coche existe
    const { data: cocheExistente, error: verificarError } = await supabase
      .from("coches")
      .select("matricula")
      .eq("matricula", matricula)
      .single()

    if (verificarError || !cocheExistente) {
      return {
        success: false,
        error: "El vehículo no existe",
      }
    }

    // Eliminar el coche
    const { error } = await supabase.from("coches").delete().eq("matricula", matricula)

    if (error) {
      console.error("Error eliminando coche:", error)
      return {
        success: false,
        error: "Error al eliminar el vehículo de la base de datos",
      }
    }

    console.log("Coche eliminado exitosamente:", matricula)

    // Revalidar las páginas relacionadas
    revalidatePath("/coches")
    revalidatePath("/") // Dashboard

    return {
      success: true,
      message: "Vehículo eliminado correctamente",
    }
  } catch (error) {
    console.error("Error en eliminarCoche:", error)
    return {
      success: false,
      error: "Error interno del servidor",
    }
  }
}
