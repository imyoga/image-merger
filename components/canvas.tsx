"use client"

import type React from "react"

import { useState, useRef } from "react"

interface CanvasProps {
  images: Array<{
    id: string
    url: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    zIndex: number
  }>
  selectedImageId: string | null
  onSelectImage: (id: string) => void
  onUpdatePosition: (id: string, x: number, y: number) => void
  onDeleteImage?: (id: string) => void
  gridSize?: number
  snapToGrid?: boolean
}

export default function Canvas({
  images,
  selectedImageId,
  onSelectImage,
  onUpdatePosition,
  onDeleteImage,
  gridSize = 20,
  snapToGrid = true,
}: CanvasProps) {
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()

    if (id !== selectedImageId) {
      onSelectImage(id)
    }

    const image = images.find((img) => img.id === id)
    if (!image) return

    setDragging(true)
    setDragOffset({
      x: e.clientX - image.x,
      y: e.clientY - image.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !selectedImageId) return

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    // Calculate new position relative to the canvas
    let x = Math.max(0, Math.min(e.clientX - dragOffset.x, canvasRect.width))
    let y = Math.max(0, Math.min(e.clientY - dragOffset.y, canvasRect.height))

    // Apply grid snapping if enabled
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize
      y = Math.round(y / gridSize) * gridSize
    }

    onUpdatePosition(selectedImageId, x, y)
  }

  const handleMouseUp = () => {
    setDragging(false)
  }

  // Generate grid lines
  const renderGrid = () => {
    if (!snapToGrid) return null

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return null

    const horizontalLines = []
    const verticalLines = []

    for (let i = 0; i < canvasRect.width; i += gridSize) {
      verticalLines.push(
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 border-r border-gray-200 dark:border-gray-800"
          style={{ left: `${i}px` }}
        />,
      )
    }

    for (let i = 0; i < canvasRect.height; i += gridSize) {
      horizontalLines.push(
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-800"
          style
          className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-800"
          style={{ top: `${i}px` }}
        />,
      )
    }

    return (
      <>
        {verticalLines}
        {horizontalLines}
      </>
    )
  }

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {snapToGrid && renderGrid()}

      {images.map((image) => (
        <div
          key={image.id}
          className={`absolute cursor-move ${selectedImageId === image.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
          style={{
            left: `${image.x}px`,
            top: `${image.y}px`,
            width: `${image.width}px`,
            height: `${image.height}px`,
            transform: `rotate(${image.rotation}deg)`,
            zIndex: image.zIndex,
          }}
          onMouseDown={(e) => handleMouseDown(e, image.id)}
        >
          <img
            src={image.url || "/placeholder.svg"}
            alt="Draggable image"
            className="w-full h-full object-cover"
            draggable={false}
          />

          {selectedImageId === image.id && (
            <button
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation()
                // We need to pass a delete function from the parent
                if (onDeleteImage) {
                  onDeleteImage(image.id)
                }
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

