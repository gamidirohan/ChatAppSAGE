'use client'

import DocumentUpload from '@/app/components/DocumentUpload'

export default function UploadPage() {
  return (
    <div className="max-w-5xl mx-auto w-full p-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
        <p className="text-muted-foreground">
          Upload PDF or TXT files to extract knowledge and build your graph
        </p>
      </div>

      <DocumentUpload />
    </div>
  )
}
