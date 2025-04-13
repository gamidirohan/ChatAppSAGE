import { NextResponse } from 'next/server'

// FastAPI backend URL
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Try to connect to the backend health endpoint
    const backendResponse = await fetch(`${FASTAPI_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      return NextResponse.json({
        status: 'error',
        message: 'Backend health check failed',
        backendStatus: await backendResponse.text()
      }, { status: 500 });
    }

    const backendData = await backendResponse.json();

    return NextResponse.json({
      status: 'ok',
      frontend: 'healthy',
      backend: backendData.status || 'connected'
    });
  } catch (error) {
    console.error('Error connecting to backend:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Could not connect to backend service',
      error: (error as Error).message
    }, { status: 500 });
  }
}
