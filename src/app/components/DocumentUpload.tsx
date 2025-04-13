'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadDocument } from '@/lib/api'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)

    // Reset status when a new file is selected
    if (selectedFile) {
      setUploadStatus('idle')
      setErrorMessage('')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      await uploadDocument(file)
      setUploadStatus('success')
      setFile(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto p-6 border rounded-lg shadow-sm">
      <div className="text-center mb-6">
        <FileText className="h-12 w-12 mx-auto mb-2 text-primary" />
        <h2 className="text-2xl font-semibold">Upload Document</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload PDF or TXT files to extract knowledge
        </p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">
            {file ? file.name : 'Click to select a file or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF and TXT files
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {file && (
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            >
              Remove
            </Button>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </>
          )}
        </Button>

        {/* Status messages */}
        {uploadStatus === 'success' && (
          <div className="flex items-center p-3 text-sm rounded bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Document uploaded and processed successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center p-3 text-sm rounded bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{errorMessage || 'Failed to upload document. Please try again.'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
