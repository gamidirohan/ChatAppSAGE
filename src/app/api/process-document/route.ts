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

      const errorPayload = await fastApiResponse.json().catch(() => null);
      return NextResponse.json(
        {
          error: errorPayload?.error || errorPayload?.detail || 'Failed to process document',
          status: fastApiResponse.status,
        },
        { status: fastApiResponse.status }
      );
    } catch (fastApiError) {
      console.error('Error calling FastAPI:', fastApiError);
      return NextResponse.json(
        {
          error: 'Failed to reach document processing backend',
          message: fastApiError instanceof Error ? fastApiError.message : 'Unknown error',
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json(
      { error: 'Failed to process document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
