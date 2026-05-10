'use client'

import { AlertTriangle, Check, Loader2 } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AgentEvent } from '@/types'

type Props = {
  events?: AgentEvent[]
  className?: string
}

const AGENTS = [
  { key: 'planner', label: 'Planner', tools: [{ key: 'plan', label: 'Plan builder' }] },
  {
    key: 'retriever',
    label: 'Retriever',
    tools: [
      { key: 'semantic', label: 'Semantic' },
      { key: 'fulltext', label: 'BM25' },
      { key: 'graph', label: 'Graph' },
    ],
  },
  { key: 'reasoner', label: 'Reasoner', tools: [{ key: 'graph_path_validator', label: 'Graph path validator' }] },
  { key: 'generator', label: 'Generator', tools: [{ key: 'groq_generator', label: 'Groq generator' }] },
  { key: 'critic', label: 'Critic', tools: [{ key: 'policy_guard', label: 'Policy guard' }] },
]

function stageState(stage: (typeof AGENTS)[number], events: AgentEvent[]) {
  const related = events.filter((event) => event.agent?.toLowerCase() === stage.key)
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

function collectUsedToolKeys(stage: (typeof AGENTS)[number], events: AgentEvent[], state: string) {
  const toolKeys = new Set<string>()

  events.forEach((event) => {
    const eventAgent = event.agent?.toLowerCase()
    const eventTool = event.tool?.toLowerCase()
    if (stage.key === 'retriever') {
      if (eventTool && stage.tools.some((tool) => tool.key === eventTool)) {
        toolKeys.add(eventTool)
      }
      if (eventAgent && stage.tools.some((tool) => tool.key === eventAgent)) {
        toolKeys.add(eventAgent)
      }
      return
    }

    if (eventAgent === stage.key && eventTool) {
      toolKeys.add(eventTool)
    }
  })

  if (!toolKeys.size && state !== 'pending' && stage.tools.length === 1) {
    toolKeys.add(stage.tools[0].key)
  }

  return toolKeys
}

export default function AgentExecutionRail({ events = [], className }: Props) {
  const latestVisibleEvent = [...events].reverse().find((event) => event.message)

  return (
    <div className={cn('space-y-3 rounded-lg border border-gray-200 bg-white/70 p-3 text-gray-700 dark:border-gray-600 dark:bg-gray-800/70 dark:text-gray-100', className)}>
      <div className="flex flex-wrap items-start gap-2">
        {AGENTS.map((stage, index) => {
          const { state, latest } = stageState(stage, events)
          const usedToolKeys = collectUsedToolKeys(stage, events, state)
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help flex-col items-center gap-1">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition',
                          state === 'pending' && 'border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-700',
                          state === 'running' && 'animate-pulse border-blue-400 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
                          state === 'completed' && 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                          state === 'review' && 'border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
                          state === 'failed' && 'border-red-400 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                        )}
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
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-64">
                    <div className="space-y-2 text-xs">
                      <div className="font-medium">{stage.label}</div>
                      <div className="text-muted-foreground">{latest?.message || `${stage.label} did not run in this answer.`}</div>
                      <div className="space-y-1">
                        {stage.tools.map((tool) => {
                          const used = usedToolKeys.has(tool.key)
                          return (
                            <div key={tool.key} className="flex items-center justify-between gap-3">
                              <span>{tool.label}</span>
                              <span className={cn('uppercase tracking-wide', used ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400 dark:text-gray-500')}>
                                {used ? 'used' : 'not used'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {index < AGENTS.length - 1 && <div className="mt-3 h-px w-4 bg-gray-300 dark:bg-gray-600" />}
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
