'use client'

import { AlertTriangle, Check, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { AgentEvent } from '@/types'

type Props = {
  events?: AgentEvent[]
  className?: string
}

const STAGES = [
  { key: 'planner', label: 'Planner', agents: ['planner'] },
  { key: 'retriever', label: 'Retriever', agents: ['retriever'] },
  { key: 'semantic', label: 'Semantic', agents: ['semantic'] },
  { key: 'fulltext', label: 'BM25', agents: ['fulltext'] },
  { key: 'graph', label: 'Graph', agents: ['graph'] },
  { key: 'reasoner', label: 'Reasoner', agents: ['reasoner'] },
  { key: 'generator', label: 'Generator', agents: ['generator'] },
  { key: 'critic', label: 'Critic', agents: ['critic'] },
]

function stageState(stage: (typeof STAGES)[number], events: AgentEvent[]) {
  const related = events.filter((event) => {
    const agent = event.agent?.toLowerCase()
    const tool = event.tool?.toLowerCase()
    return stage.agents.includes(agent || '') || stage.agents.includes(tool || '')
  })
  const latest = related[related.length - 1]
  if (!latest) {
    return { state: 'pending', latest }
  }
  if (latest.status === 'failed') {
    return { state: 'failed', latest }
  }
  if (latest.status === 'running') {
    return { state: 'running', latest }
  }
  if (latest.status === 'needs_review') {
    return { state: 'review', latest }
  }
  return { state: 'completed', latest }
}

export default function AgentExecutionRail({ events = [], className }: Props) {
  const latestVisibleEvent = [...events].reverse().find((event) => event.message)

  return (
    <div className={cn('space-y-3 rounded-lg border border-gray-200 bg-white/70 p-3 text-gray-700 dark:border-gray-600 dark:bg-gray-800/70 dark:text-gray-100', className)}>
      <div className="flex flex-wrap items-start gap-2">
        {STAGES.map((stage, index) => {
          const { state, latest } = stageState(stage, events)
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition',
                    state === 'pending' && 'border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-700',
                    state === 'running' && 'animate-pulse border-blue-400 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
                    state === 'completed' && 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                    state === 'review' && 'border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
                    state === 'failed' && 'border-red-400 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                  )}
                  title={latest?.message || stage.label}
                >
                  {state === 'running' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : state === 'failed' || state === 'review' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : state === 'completed' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">{stage.label}</span>
              </div>
              {index < STAGES.length - 1 && <div className="mt-3 h-px w-4 bg-gray-300 dark:bg-gray-600" />}
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-300">
        {latestVisibleEvent?.message || 'SAGE is preparing the agent pipeline.'}
      </div>
    </div>
  )
}
