"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Download, ZoomIn, ZoomOut, RotateCcw, Grid } from "lucide-react"
import ImageUploader from "@/components/image-uploader"
import Canvas from "@/components/canvas"
import ImageThumbnail from "@/components/image-thumbnail"

export default function ImageMerger() {
  const [images, setImages] = useState<
    Array<{
      id: string
      file: File
      url: string
      x: number
      y: number
      width: number
      height: number
      rotation: number
      zIndex: number
      aspectRatio?: number
      originalWidth?: number
      originalHeight?: number
    }>
  >([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [gridSize, setGridSize] = useState(20)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [outputQuality, setOutputQuality] = useState<"original" | "display">("original")

  const handleImageUpload = async (files: FileList) => {
    const newImagesPromises = Array.from(files).map(async (file) => {
      const id = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const url = URL.createObjectURL(file)

      // Get natural dimensions to preserve aspect ratio
      const dimensions = await getImageDimensions(url)

      // Calculate size while preserving aspect ratio
      let width = 200
      let height = 200

      if (dimensions.width && dimensions.height) {
        const aspectRatio = dimensions.width / dimensions.height
        if (aspectRatio > 1) {
          // Landscape
          height = width / aspectRatio
        } else {
          // Portrait
          width = height * aspectRatio
        }
      }

      return {
        id,
        file,
        url,
        x: 50,
        y: 50,
        width,
        height,
        rotation: 0,
        zIndex: images.length + 1,
        aspectRatio: dimensions.width && dimensions.height ? dimensions.width / dimensions.height : 1,
        originalWidth: dimensions.width,
        originalHeight: dimensions.height,
      }
    })

    const newImages = await Promise.all(newImagesPromises)
    setImages([...images, ...newImages])
    if (newImages.length > 0) {
      setSelectedImageId(newImages[0].id)
    }

    // Auto arrange after a short delay to ensure the canvas ref is updated
    setTimeout(() => {
      autoArrangeImages()
    }, 100)
  }

  const autoArrangeImages = () => {
    if (images.length === 0) return

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const canvasWidth = canvasRect.width
    const canvasHeight = canvasRect.height

    // Calculate grid dimensions based on number of images
    const totalImages = images.length
    const imagesPerRow = Math.ceil(Math.sqrt(totalImages))
    const rows = Math.ceil(totalImages / imagesPerRow)

    // Calculate cell size
    const cellWidth = canvasWidth / imagesPerRow
    const cellHeight = canvasHeight / rows

    // Arrange images in a grid
    const arrangedImages = images.map((img, index) => {
      const row = Math.floor(index / imagesPerRow)
      const col = index % imagesPerRow

      // Calculate position (centered in cell)
      const x = col * cellWidth + (cellWidth - img.width) / 2
      const y = row * cellHeight + (cellHeight - img.height) / 2

      return {
        ...img,
        x,
        y,
      }
    })

    setImages(arrangedImages)
  }

  // Helper function to get image dimensions
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.src = url
    })
  }

  const handleDeleteImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id))
    if (selectedImageId === id) {
      setSelectedImageId(images.length > 1 ? images[0].id : null)
    }
  }

  const handleSelectImage = (id: string) => {
    setSelectedImageId(id)
    // Bring selected image to front
    setImages(
      images.map((img) => (img.id === id ? { ...img, zIndex: Math.max(...images.map((i) => i.zIndex)) + 1 } : img)),
    )
  }

  const handleUpdateImagePosition = (id: string, x: number, y: number) => {
    setImages(images.map((img) => (img.id === id ? { ...img, x, y } : img)))
  }

  const handleRotateImage = (id: string, rotation: number) => {
    setImages(images.map((img) => (img.id === id ? { ...img, rotation } : img)))
  }

  const handleResizeImage = (id: string, width: number, height: number, maintainAspectRatio = false) => {
    setImages(
      images.map((img) => {
        if (img.id === id) {
          if (maintainAspectRatio && img.aspectRatio) {
            // If maintaining aspect ratio, calculate the other dimension
            if (width !== img.width) {
              height = width / img.aspectRatio
            } else {
              width = height * img.aspectRatio
            }
          }
          return { ...img, width, height }
        }
        return img
      }),
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedImageId) {
      handleDeleteImage(selectedImageId)
    }
  }

  // Completely rewritten downloadMergedImage function to preserve original resolution
  const downloadMergedImage = async () => {
    if (!canvasRef.current || images.length === 0) return

    // Calculate the dimensions needed for the output canvas based on the layout
    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxX = 0,
      maxY = 0

    images.forEach((img) => {
      minX = Math.min(minX, img.x)
      minY = Math.min(minY, img.y)
      maxX = Math.max(maxX, img.x + img.width)
      maxY = Math.max(maxY, img.y + img.height)
    })

    // Calculate the total width and height of the layout
    const layoutWidth = maxX - minX
    const layoutHeight = maxY - minY

    // Determine the scale factor for high resolution output
    // This will be used to scale up the canvas if we're using original resolution
    let scaleFactor = 1

    if (outputQuality === "original") {
      // Find the maximum scale factor based on original image dimensions
      const scaleFactors = images.map((img) => {
        if (img.originalWidth && img.width) {
          return img.originalWidth / img.width
        }
        return 1
      })

      scaleFactor = Math.max(...scaleFactors)

      // Cap the scale factor to avoid extremely large canvases
      scaleFactor = Math.min(scaleFactor, 5)
    }

    // Create a canvas with the scaled dimensions
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size based on the layout and scale factor
    canvas.width = layoutWidth * scaleFactor
    canvas.height = layoutHeight * scaleFactor

    // Fill with white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Sort images by z-index
    const sortedImages = [...images].sort((a, b) => a.zIndex - b.zIndex)

    // Draw each image onto the canvas
    for (const img of sortedImages) {
      // Load the original image
      const imageElement = new Image()
      imageElement.src = img.url
      imageElement.crossOrigin = "anonymous"

      await new Promise<void>((resolve) => {
        imageElement.onload = () => {
          ctx.save()

          // Calculate the position in the scaled canvas
          const scaledX = (img.x - minX) * scaleFactor
          const scaledY = (img.y - minY) * scaleFactor
          const scaledWidth = img.width * scaleFactor
          const scaledHeight = img.height * scaleFactor

          // Translate to the center of the image position
          ctx.translate(scaledX + scaledWidth / 2, scaledY + scaledHeight / 2)

          // Rotate around the center
          ctx.rotate((img.rotation * Math.PI) / 180)

          // If using original resolution, use the original image dimensions
          if (outputQuality === "original" && img.originalWidth && img.originalHeight) {
            // Calculate the ratio between display size and original size
            const widthRatio = img.width / img.originalWidth
            const heightRatio = img.height / img.originalHeight

            // Draw the image at its original resolution, scaled appropriately
            ctx.drawImage(imageElement, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
          } else {
            // Draw the image at the display resolution
            ctx.drawImage(imageElement, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
          }

          ctx.restore()
          resolve()
        }
      })
    }

    // Convert canvas to blob and download
    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "merged-image.png"
        a.click()

        // Clean up
        URL.revokeObjectURL(url)
      },
      "image/png",
      1.0, // Use highest quality
    )
  }

  const selectedImage = images.find((img) => img.id === selectedImageId)

  // Focus the main div on mount to enable keyboard shortcuts
  useEffect(() => {
    const mainDiv = document.getElementById("main-container")
    if (mainDiv) {
      mainDiv.focus()
    }
  }, [])

  return (
    <div id="main-container" className="flex flex-col min-h-screen" tabIndex={0} onKeyDown={handleKeyDown}>
      <header className="border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <h1 className="text-2xl font-bold">Image Merger</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center mr-4">
              <label className="text-sm mr-2">Output Quality:</label>
              <select
                value={outputQuality}
                onChange={(e) => setOutputQuality(e.target.value as "original" | "display")}
                className="text-sm border rounded p-1"
              >
                <option value="original">Original Resolution</option>
                <option value="display">Display Resolution</option>
              </select>
            </div>
            <Button onClick={downloadMergedImage} disabled={images.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container px-4 py-6 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-6">
          <Card className="p-4">
            <ImageUploader onUpload={handleImageUpload} />
          </Card>

          {images.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">Images</h3>
              <div className="grid grid-cols-2 gap-2">
                {images.map((image) => (
                  <ImageThumbnail
                    key={image.id}
                    image={image}
                    isSelected={selectedImageId === image.id}
                    onSelect={() => handleSelectImage(image.id)}
                    onDelete={() => handleDeleteImage(image.id)}
                  />
                ))}
              </div>
            </Card>
          )}

          {selectedImage && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">Image Properties</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm mb-1 block">Rotation</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[selectedImage.rotation]}
                      min={0}
                      max={360}
                      step={1}
                      onValueChange={(value) => handleRotateImage(selectedImage.id, value[0])}
                    />
                    <Button variant="outline" size="icon" onClick={() => handleRotateImage(selectedImage.id, 0)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm mb-1 block">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Width</label>
                      <Slider
                        value={[selectedImage.width]}
                        min={20}
                        max={500}
                        step={1}
                        onValueChange={(value) =>
                          handleResizeImage(selectedImage.id, value[0], selectedImage.height, true)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs">Height</label>
                      <Slider
                        value={[selectedImage.height]}
                        min={20}
                        max={500}
                        step={1}
                        onValueChange={(value) =>
                          handleResizeImage(selectedImage.id, selectedImage.width, value[0], true)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteImage(selectedImage.id)}
                    className="w-full"
                  >
                    Delete Image
                  </Button>
                </div>
                {selectedImage.originalWidth && selectedImage.originalHeight && (
                  <div className="text-xs text-muted-foreground">
                    Original dimensions: {selectedImage.originalWidth} × {selectedImage.originalHeight}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Canvas</h2>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button variant="outline" onClick={autoArrangeImages} disabled={images.length === 0}>
                <Grid className="w-4 h-4 mr-2" />
                Auto Arrange
              </Button>
              <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center">{zoom}%</span>
              <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 ml-4">
                <input
                  type="checkbox"
                  id="snap-to-grid"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="mr-1"
                />
                <label htmlFor="snap-to-grid" className="text-sm">
                  Snap to grid
                </label>
              </div>
              {snapToGrid && (
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-sm w-20">Grid size:</label>
                  <Slider
                    value={[gridSize]}
                    min={5}
                    max={50}
                    step={5}
                    onValueChange={(value) => setGridSize(value[0])}
                    className="w-24"
                  />
                  <span className="text-sm">{gridSize}px</span>
                </div>
              )}
            </div>
          </div>

          <Card className="flex-1 overflow-auto bg-[#f0f0f0] dark:bg-slate-900 relative">
            <div
              ref={canvasRef}
              className="min-h-[500px] w-full relative"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            >
              <Canvas
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={handleSelectImage}
                onUpdatePosition={handleUpdateImagePosition}
                onDeleteImage={handleDeleteImage}
                gridSize={gridSize}
                snapToGrid={snapToGrid}
              />
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

