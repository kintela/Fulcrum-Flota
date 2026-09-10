"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { restaurarCoche } from "@/app/actions/coches"
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

interface RestoreCocheButtonProps {
  matricula: string
}

export function RestoreCocheButton({ matricula }: RestoreCocheButtonProps) {
  const [isPending, setIsPending] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    try {
      setIsPending(true)
      setError(null)
      const result = await restaurarCoche(matricula)

      if (!result.success) {
        setError(result.error || "No se pudo dar de alta el coche")
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
        if (!nextOpen) setError(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="inline-flex items-center rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800 hover:bg-green-200 disabled:opacity-50"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Volver a dar de alta
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Volver a dar de alta el vehículo</AlertDialogTitle>
          <AlertDialogDescription>
            El coche <strong>{matricula}</strong> volverá a aparecer en la flota activa conservando todos sus datos e
            histórico.
          </AlertDialogDescription>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleRestore()
            }}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? "Dando de alta..." : "Confirmar alta"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
