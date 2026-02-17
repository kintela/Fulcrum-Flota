"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { eliminarCoche } from "@/app/actions/coches"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteCocheButtonProps {
  matricula: string
}

export function DeleteCocheButton({ matricula }: DeleteCocheButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    try {
      setIsPending(true)
      setError(null)
      const result = await eliminarCoche(matricula)

      if (!result.success) {
        setError(result.error || "No se pudo eliminar el coche")
        return
      }

      setOpen(false)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setError(null)
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          title="Eliminar coche"
          aria-label={`Eliminar coche ${matricula}`}
          disabled={isPending}
          className="text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que quieres eliminar el coche <strong>{matricula}</strong>? Esta acción lo ocultará del listado de
            coches y mantendrá todo su histórico relacionado.
          </AlertDialogDescription>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Eliminando..." : "Eliminar coche"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
