"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageThumbnailProps {
  image: {
    id: string
    url: string
  }
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export default function ImageThumbnail({ image, isSelected, onSelect, onDelete }: ImageThumbnailProps) {
  return (
    <div
      className={`relative rounded-md overflow-hidden border-2 transition-all ${
        isSelected ? "border-primary" : "border-transparent"
      }`}
      onClick={onSelect}
    >
      <img src={image.url || "/placeholder.svg"} alt="Thumbnail" className="w-full aspect-square object-cover" />
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

