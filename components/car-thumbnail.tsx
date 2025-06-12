"use client"

import { Car } from "lucide-react"
import { useState } from "react"

interface CarThumbnailProps {
  src: string | null
  alt: string
  matricula: string
}

export function CarThumbnail({ src, alt, matricula }: CarThumbnailProps) {
  const [imageError, setImageError] = useState(false)

  if (!src || imageError) {
    return (
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        <Car className="h-8 w-8 text-gray-400" />
      </div>
    )
  }

  return (
    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  )
}
