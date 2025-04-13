// API service for interacting with the backend
import { Message } from '@/types';

// Configuration for API endpoints
const API_CONFIG = {
  // Set this to true to use direct FastAPI backend calls
  // Set to false to use Next.js API routes as proxies
  USE_DIRECT_FASTAPI: false,

  // FastAPI backend base URL
  FASTAPI_BASE_URL: 'http://localhost:8000',

  // Endpoints
  ENDPOINTS: {
    CHAT: '/api/chat',
    PROCESS_DOCUMENT: '/api/process-document',
    DEBUG_GRAPH: '/api/debug-graph',
    HEALTH: '/api/health'
  }
};

/**
 * Get the appropriate URL for an API endpoint
 */
function getApiUrl(endpoint: string): string {
  if (API_CONFIG.USE_DIRECT_FASTAPI) {
    return `${API_CONFIG.FASTAPI_BASE_URL}${endpoint}`;
  }
  return endpoint;
}

/**
 * Send a message to the AI and get a response
 */
export async function sendChatMessage(message: string, history: Message[] = []) {
  try {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.CHAT);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Upload and process a document
 */
export async function uploadDocument(file: File) {
  try {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.PROCESS_DOCUMENT);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Get graph debug information
 */
export async function getGraphDebugInfo() {
  try {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.DEBUG_GRAPH);
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting graph debug info:', error);
    throw error;
  }
}

/**
 * Check API health
 */
export async function checkApiHealth() {
  try {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.HEALTH);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking API health:', error);
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}
