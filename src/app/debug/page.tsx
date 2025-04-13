'use client'

import GraphDebug from '@/app/components/GraphDebug'

export default function DebugPage() {
  return (
    <div className="max-w-5xl mx-auto w-full p-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Graph Debug Dashboard</h1>
        <p className="text-muted-foreground">
          Analyze and visualize your knowledge graph structure
        </p>
      </div>

      <GraphDebug />
    </div>
  )
}
