'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Database, FileText, Loader2, Network } from 'lucide-react'

import { getGraphDebugInfo } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

type CountRow = {
  label: string
  count: number
}

type GraphDebugData = {
  nodeCounts: CountRow[]
  relationshipCounts: CountRow[]
  sampleDocuments: Array<Record<string, unknown>>
  isolatedNodes: Array<Record<string, unknown>>
  entityConnections: Array<Record<string, unknown>>
}

function normalizeGraphData(payload: any): GraphDebugData {
  return {
    nodeCounts: Array.isArray(payload?.node_counts)
      ? payload.node_counts.map((item: any) => ({
          label: String(item.Label ?? item.label ?? 'Unknown'),
          count: Number(item.Count ?? item.count ?? 0),
        }))
      : [],
    relationshipCounts: Array.isArray(payload?.rel_counts)
      ? payload.rel_counts.map((item: any) => ({
          label: String(item.RelationType ?? item.label ?? 'Unknown'),
          count: Number(item.Count ?? item.count ?? 0),
        }))
      : [],
    sampleDocuments: Array.isArray(payload?.sample_docs) ? payload.sample_docs : [],
    isolatedNodes: Array.isArray(payload?.connectivity) ? payload.connectivity : [],
    entityConnections: Array.isArray(payload?.entity_doc_connections) ? payload.entity_doc_connections : [],
  }
}

export default function GraphDebug() {
  const [data, setData] = useState<GraphDebugData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGraphData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const graphData = await getGraphDebugInfo()
      setData(normalizeGraphData(graphData))
    } catch (err) {
      console.error('Error fetching graph data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load graph data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchGraphData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading graph data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => void fetchGraphData()}>Try Again</Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Database className="h-8 w-8 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No graph data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Graph Debug Dashboard</h2>
        <Button onClick={() => void fetchGraphData()} variant="outline" size="sm">
          <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Node Counts by Type</h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {data.nodeCounts.map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">{item.count}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <Network className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Relationship Counts by Type</h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {data.relationshipCounts.map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">{item.count}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          <h3 className="text-lg font-medium">Sample Documents</h3>
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {data.sampleDocuments.length > 0 ? (
              data.sampleDocuments.map((doc, index) => (
                <div key={index} className="p-3 bg-muted rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">ID: {String(doc.DocID ?? doc.doc_id ?? 'N/A')}</span>
                    <span className="text-xs text-muted-foreground">Sender: {String(doc.Sender ?? doc.sender ?? 'Unknown')}</span>
                  </div>
                  <p className="text-sm truncate">{String(doc.Subject ?? doc.subject ?? 'Untitled')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {String(doc.Timestamp ?? doc.timestamp ?? 'No timestamp')} | {String(doc.Source ?? doc.source ?? 'Unknown source')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No documents available</p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Network className="h-5 w-5 mr-2 text-primary" />
          <h3 className="text-lg font-medium">Top Connected People</h3>
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {data.entityConnections.length > 0 ? (
              data.entityConnections.map((connection, index) => (
                <div key={index} className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{String(connection.Name ?? connection.name ?? connection.Person ?? 'Unknown')}</span>
                    <span className="px-2 py-0.5 bg-primary/10 rounded text-xs">
                      {String(connection.ConnectionCount ?? connection.connectionCount ?? 0)} links
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Person ID: {String(connection.Person ?? connection.id ?? 'Unknown')}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No entity connections available</p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
          <h3 className="text-lg font-medium">Isolated Nodes</h3>
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {data.isolatedNodes.length > 0 ? (
              data.isolatedNodes.map((node, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <div>
                    <span className="text-sm font-medium">{String(node.IsolatedNodeType ?? node.type ?? 'Unknown')}</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    {String(node.Count ?? node.count ?? 0)} isolated
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No isolated nodes found</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
