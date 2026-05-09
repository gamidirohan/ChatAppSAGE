'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadDocument, type UploadDocumentResponse } from '@/lib/api'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'

function formatSaiaStatus(status?: string | null) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSaiaStatusHelp(status?: string | null) {
  if (status === 'not_processed') {
    return 'This upload was added to the graph, but SAIA did not run because standalone uploads are stored as document uploads rather than message attachments.'
  }
  if (status === 'already_ingested') {
    return 'This document hash was already present in the graph, so the upload was skipped and SAIA was not run again.'
  }
  if (status === 'disabled') {
    return 'SAIA is currently disabled for this environment.'
  }
  if (status === 'failed') {
    return 'The document was stored, but SAIA encountered an error while processing it.'
  }
  if (status === 'processed') {
    return 'SAIA finished processing this upload.'
  }
  return null
}

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<UploadDocumentResponse | null>(null)
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
    setResult(null)

    try {
      const uploadResult = await uploadDocument(file)
      setResult(uploadResult)
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
          Upload PDF, TXT, or DOCX files to extract knowledge
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
            Supports PDF, TXT, and DOCX files
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
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
          <div className="space-y-3 rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <div className="flex items-center">
              <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{result?.message || 'Document uploaded and processed successfully.'}</span>
            </div>

            {result && (
              <div className="space-y-3 rounded border border-green-200/70 bg-white/70 p-3 text-gray-800">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document ID</p>
                    <p className="break-all font-mono text-xs">{result.doc_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SAIA status</p>
                    <p className="font-medium">{formatSaiaStatus(result.saia_status)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sender</p>
                    <p>{result.sender || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receivers</p>
                    <p>{result.receivers?.length ? result.receivers.join(', ') : 'None detected'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                    <p>{result.subject}</p>
                  </div>
                </div>

                {getSaiaStatusHelp(result.saia_status) && (
                  <div className="rounded border border-blue-200 bg-blue-50 p-3 text-blue-900">
                    <div className="flex items-start">
                      <Info className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{getSaiaStatusHelp(result.saia_status)}</span>
                    </div>
                  </div>
                )}

                {result.saia_last_error && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p className="text-xs font-semibold uppercase tracking-wide">SAIA error</p>
                    <p className="mt-1 break-words">{result.saia_last_error}</p>
                  </div>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p className="text-xs font-semibold uppercase tracking-wide">Warnings</p>
                    <ul className="mt-1 list-disc pl-4">
                      {result.warnings.map((warning, index) => (
                        <li key={`${result.doc_id}-warning-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
