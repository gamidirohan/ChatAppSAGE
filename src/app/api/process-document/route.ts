import { NextRequest, NextResponse } from 'next/server'

// FastAPI backend URL
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Parse the FormData from the request
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided or invalid file' },
        { status: 400 }
      );
    }

    // Option 1: Forward the file to the FastAPI backend
    try {
      // Create a new FormData to send to FastAPI
      const fastApiFormData = new FormData();
      fastApiFormData.append('file', file);

      const fastApiResponse = await fetch(`${FASTAPI_URL}/api/process-document`, {
        method: 'POST',
        body: fastApiFormData,
      });

      if (fastApiResponse.ok) {
        const data = await fastApiResponse.json();
        return NextResponse.json(data);
      }

      // If FastAPI call fails, fall back to mock response
      console.warn('FastAPI call failed, using mock response');
    } catch (fastApiError) {
      console.error('Error calling FastAPI:', fastApiError);
      // Continue to mock response
    }

    // Option 2: Mock response (fallback if FastAPI is not available)
    // Simulate a delay to mimic processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    return NextResponse.json({
      success: true,
      message: 'Document processed successfully (mock response)',
      documentId: 'doc-' + Date.now(),
      entities: ['entity1', 'entity2', 'entity3'],
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json(
      { error: 'Failed to process document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
