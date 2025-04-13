import { NextRequest, NextResponse } from 'next/server'

// FastAPI backend URL
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Option 1: Forward the request to the FastAPI backend
    try {
      const fastApiResponse = await fetch(`${FASTAPI_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
    // Simulate a delay to mimic API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      answer: `This is a placeholder response to: "${body.message}". The FastAPI backend is not available.`,
      thinking: [
        "Step 1: Received user query",
        "Step 2: Attempted to call FastAPI backend but it was unavailable",
        "Step 3: Generated a fallback response"
      ]
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
