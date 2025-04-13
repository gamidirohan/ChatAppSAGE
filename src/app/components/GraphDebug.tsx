'use client'

import { useState, useEffect } from 'react'
import { getGraphDebugInfo } from '@/lib/api'
import { Loader2, Database, Network, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

type GraphDebugData = {
  nodeCountsByType: Record<string, number>
  relationshipCountsByType: Record<string, number>
  sampleDocuments: any[]
  isolatedNodes: any[]
  entityConnections: any[]
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
      setData(graphData)
    } catch (err) {
      console.error('Error fetching graph data:', err)
      setError('Failed to load graph data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGraphData()
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
        <Button onClick={fetchGraphData}>Try Again</Button>
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
        <Button onClick={fetchGraphData} variant="outline" size="sm">
          <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node counts */}
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Node Counts by Type</h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {Object.entries(data.nodeCountsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{type}</span>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">{count}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Relationship counts */}
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-4">
            <Network className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Relationship Counts by Type</h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {Object.entries(data.relationshipCountsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{type}</span>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">{count}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Sample documents */}
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
                    <span className="text-sm font-medium">ID: {doc.id || 'N/A'}</span>
                    <span className="text-xs text-muted-foreground">Type: {doc.type || 'Unknown'}</span>
                  </div>
                  <p className="text-sm truncate">{doc.title || doc.name || 'Untitled'}</p>
                  {doc.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {doc.content}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No documents available
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Entity connections */}
      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Network className="h-5 w-5 mr-2 text-primary" />
          <h3 className="text-lg font-medium">Entity Connections</h3>
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {data.entityConnections.length > 0 ? (
              data.entityConnections.map((connection, index) => (
                <div key={index} className="p-3 bg-muted rounded-md">
                  <div className="flex items-center text-sm">
                    <span className="font-medium">{connection.source?.name || 'Unknown'}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="px-2 py-0.5 bg-primary/10 rounded text-xs">
                      {connection.relationship || 'related_to'}
                    </span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="font-medium">{connection.target?.name || 'Unknown'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No entity connections available
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Isolated nodes */}
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
                    <span className="text-sm font-medium">{node.name || node.title || 'Unnamed'}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({node.type || 'Unknown'})</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Isolated</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No isolated nodes found (Good!)
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
