"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

interface ImageUploaderProps {
  onUpload: (files: FileList) => void
}

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files)
      // Reset the input value so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <h3 className="font-medium mb-1">Upload Images</h3>
      <p className="text-sm text-muted-foreground mb-3">Drag and drop images here or click to browse</p>
      <Button onClick={handleButtonClick} variant="outline" size="sm">
        Select Files
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
    </div>
  )
}

