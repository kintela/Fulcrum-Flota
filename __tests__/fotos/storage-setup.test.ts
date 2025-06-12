import { supabase } from "@/lib/supabase"

describe("Storage Setup", () => {
  describe("Bucket Configuration", () => {
    it("should have coches-fotos bucket configured", async () => {
      const { data: buckets, error } = await supabase.storage.listBuckets()

      expect(error).toBeNull()
      expect(buckets).toBeDefined()

      const cochesFotosBucket = buckets?.find((bucket) => bucket.id === "coches-fotos")
      expect(cochesFotosBucket).toBeDefined()
      expect(cochesFotosBucket?.public).toBe(true)
    })

    it("should allow uploading to coches-fotos bucket", async () => {
      // Crear un archivo de prueba pequeño
      const testFile = new File(["test content"], "test.jpg", { type: "image/jpeg" })
      const testPath = "TEST-123/test-upload.jpg"

      const { data, error } = await supabase.storage.from("coches-fotos").upload(testPath, testFile, { upsert: true })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // Limpiar después del test
      await supabase.storage.from("coches-fotos").remove([testPath])
    })

    it("should allow listing files from coches-fotos bucket", async () => {
      const { data, error } = await supabase.storage.from("coches-fotos").list("", { limit: 1 })

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    it("should generate public URLs for files", async () => {
      const testPath = "TEST-123/test-public-url.jpg"

      const { data: urlData } = supabase.storage.from("coches-fotos").getPublicUrl(testPath)

      expect(urlData.publicUrl).toBeDefined()
      expect(urlData.publicUrl).toContain("coches-fotos")
      expect(urlData.publicUrl).toContain(testPath)
    })
  })

  describe("Bucket Policies", () => {
    it("should have proper RLS policies configured", async () => {
      // Este test verifica que las políticas estén configuradas
      // intentando realizar operaciones básicas
      const testFile = new File(["policy test"], "policy-test.jpg", { type: "image/jpeg" })
      const testPath = "POLICY-TEST/policy-test.jpg"

      // Test de subida (INSERT policy)
      const { error: uploadError } = await supabase.storage
        .from("coches-fotos")
        .upload(testPath, testFile, { upsert: true })

      expect(uploadError).toBeNull()

      // Test de lectura (SELECT policy)
      const { data: listData, error: listError } = await supabase.storage.from("coches-fotos").list("POLICY-TEST")

      expect(listError).toBeNull()
      expect(listData).toBeDefined()

      // Test de eliminación (DELETE policy)
      const { error: deleteError } = await supabase.storage.from("coches-fotos").remove([testPath])

      expect(deleteError).toBeNull()
    })
  })

  describe("File Size and Type Restrictions", () => {
    it("should respect file size limits", async () => {
      // Crear un archivo que exceda el límite (simulado)
      const largeContent = "x".repeat(25 * 1024 * 1024) // 25MB
      const largeFile = new File([largeContent], "large-test.jpg", { type: "image/jpeg" })
      const testPath = "SIZE-TEST/large-file.jpg"

      const { error } = await supabase.storage.from("coches-fotos").upload(testPath, largeFile)

      // Debería fallar por exceder el límite de tamaño
      expect(error).toBeDefined()
      expect(error?.message).toContain("size")
    })

    it("should accept valid image types", async () => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

      for (const mimeType of validTypes) {
        const testFile = new File(["test"], `test.${mimeType.split("/")[1]}`, { type: mimeType })
        const testPath = `TYPE-TEST/test-${mimeType.replace("/", "-")}.${mimeType.split("/")[1]}`

        const { error } = await supabase.storage.from("coches-fotos").upload(testPath, testFile, { upsert: true })

        expect(error).toBeNull()

        // Limpiar
        await supabase.storage.from("coches-fotos").remove([testPath])
      }
    })
  })
})
