"use server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function editarCoche(formData: FormData) {
  const matricula = formData.get("matricula") as string
  const marca = formData.get("marca") as string
  const modelo = formData.get("modelo") as string
  const año = Number.parseInt(formData.get("año") as string)
  const color = formData.get("color") as string
  const combustible = formData.get("combustible") as string
  const kilometraje = formData.get("kilometraje") as string
  const asignadoa = formData.get(\"asig\
