import { NextResponse } from 'next/server'

// FastAPI backend URL
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Option 1: Forward the request to the FastAPI backend
    try {
      const fastApiResponse = await fetch(`${FASTAPI_URL}/api/debug-graph`);

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

    // Mock response with sample graph data
    return NextResponse.json({
      nodeCountsByType: {
        'Document': 5,
        'Person': 12,
        'Organization': 8,
        'Location': 15,
        'Concept': 23,
        'Event': 7
      },
      relationshipCountsByType: {
        'MENTIONS': 45,
        'WORKS_AT': 10,
        'LOCATED_IN': 12,
        'RELATED_TO': 18,
        'PARTICIPATED_IN': 9
      },
      sampleDocuments: [
        {
          id: 'doc1',
          title: 'Annual Report 2023',
          type: 'Document',
          content: 'This is a sample document about company performance...'
        },
        {
          id: 'doc2',
          title: 'Project Proposal',
          type: 'Document',
          content: 'A proposal for the new initiative...'
        },
        {
          id: 'doc3',
          title: 'Meeting Minutes',
          type: 'Document',
          content: 'Minutes from the quarterly board meeting...'
        }
      ],
      isolatedNodes: [
        {
          id: 'entity1',
          name: 'Concept XYZ',
          type: 'Concept'
        },
        {
          id: 'entity2',
          name: 'John Smith',
          type: 'Person'
        }
      ],
      entityConnections: [
        {
          source: { id: 'person1', name: 'Jane Doe', type: 'Person' },
          relationship: 'WORKS_AT',
          target: { id: 'org1', name: 'Acme Corp', type: 'Organization' }
        },
        {
          source: { id: 'org1', name: 'Acme Corp', type: 'Organization' },
          relationship: 'LOCATED_IN',
          target: { id: 'loc1', name: 'New York', type: 'Location' }
        },
        {
          source: { id: 'doc1', name: 'Annual Report 2023', type: 'Document' },
          relationship: 'MENTIONS',
          target: { id: 'person1', name: 'Jane Doe', type: 'Person' }
        }
      ],
      mockData: true // Flag to indicate this is mock data
    })
  } catch (error) {
    console.error('Error fetching graph debug info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch graph debug information', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
