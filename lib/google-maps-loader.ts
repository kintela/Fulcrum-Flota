// Singleton para cargar Google Maps una sola vez
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader
  private isLoaded = false
  private isLoading = false
  private callbacks: Set<() => void> = new Set()
  private loadPromise: Promise<void> | null = null

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader()
    }
    return GoogleMapsLoader.instance
  }

  async load(): Promise<void> {
    // Si ya está cargado, resolver inmediatamente
    if (this.isLoaded && window.google?.maps) {
      return Promise.resolve()
    }

    // Si ya se está cargando, devolver la promesa existente
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    // Crear nueva promesa de carga
    this.loadPromise = new Promise<void>((resolve, reject) => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

      if (!apiKey) {
        reject(new Error("API key de Google Maps no configurada"))
        return
      }

      // Verificar si ya existe el script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        // Script ya existe, verificar si está cargado
        if (window.google?.maps) {
          this.isLoaded = true
          this.isLoading = false
          resolve()
          return
        }

        // Esperar a que se cargue
        const checkInterval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkInterval)
            this.isLoaded = true
            this.isLoading = false
            resolve()
          }
        }, 100)

        // Timeout después de 10 segundos
        setTimeout(() => {
          clearInterval(checkInterval)
          if (!this.isLoaded) {
            this.isLoading = false
            reject(new Error("Timeout cargando Google Maps"))
          }
        }, 10000)
        return
      }

      // Crear callback único
      const callbackName = `googleMapsCallback_${Date.now()}`
      ;(window as any)[callbackName] = () => {
        this.isLoaded = true
        this.isLoading = false

        // Ejecutar callbacks pendientes
        this.callbacks.forEach((callback) => {
          try {
            callback()
          } catch (error) {
            console.error("Error ejecutando callback:", error)
          }
        })
        this.callbacks.clear()

        // Limpiar callback global
        delete (window as any)[callbackName]
        resolve()
      }

      // Crear y cargar script
      this.isLoading = true
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&loading=async`
      script.async = true
      script.defer = true

      script.onerror = () => {
        this.isLoading = false
        delete (window as any)[callbackName]
        reject(new Error("Error cargando Google Maps"))
      }

      document.head.appendChild(script)
    })

    return this.loadPromise
  }

  addCallback(callback: () => void): void {
    if (this.isLoaded && window.google?.maps) {
      // Si ya está cargado, ejecutar inmediatamente
      try {
        callback()
      } catch (error) {
        console.error("Error ejecutando callback inmediato:", error)
      }
    } else {
      // Agregar a la cola
      this.callbacks.add(callback)
    }
  }

  removeCallback(callback: () => void): void {
    this.callbacks.delete(callback)
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps
  }
}

export const googleMapsLoader = GoogleMapsLoader.getInstance()
