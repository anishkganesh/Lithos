'use client'

import React from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import { useGlobalChat } from '@/lib/global-chat-context'
import { useChat } from '@/lib/chat-context'
import { MessageSquare, TrendingUp, Search, Lightbulb, ChartBar, Database } from 'lucide-react'

interface ContextMenuChatProps {
  children: React.ReactNode
  data: any
  dataType: 'project' | 'metric' | 'chart' | 'cell'
  context?: string
}

export function ContextMenuChat({ children, data, dataType, context }: ContextMenuChatProps) {
  const { toggleChat } = useChat()
  const { setInput } = useGlobalChat()

  const generateQuery = (action: string) => {
    let query = ''

    switch (dataType) {
      case 'project':
        const project = data
        query = action === 'explain'
          ? `Explain the ${project.name} project in ${project.location}. Why is the NPV ${project.npv}M and IRR ${project.irr}%?`
          : action === 'compare'
          ? `Compare ${project.name} with similar ${project.commodity} projects in the same region`
          : action === 'analyze'
          ? `Analyze the investment potential of ${project.name} considering its ${project.stage} stage and ${project.irr}% IRR`
          : `What are the key risks for ${project.name} given its ${project.riskLevel} risk rating?`
        break

      case 'metric':
        // Extract the actual value from the data object
        const metricValue = typeof data === 'object' ?
          (data.totalProjects || data.totalCompanies || data.totalFilings || data.totalDeals || JSON.stringify(data)) :
          data
        query = action === 'explain'
          ? `Explain why the ${context || 'metric'} is ${metricValue}. What factors influence this value?`
          : action === 'benchmark'
          ? `How does ${metricValue} compare to industry benchmarks for ${context || 'this metric'}?`
          : `Show me trends and patterns for ${context || 'this metric'} across the mining industry`
        break
        
      case 'chart':
        query = action === 'explain'
          ? `Explain the trends shown in this chart data: ${JSON.stringify(data).slice(0, 200)}...`
          : action === 'forecast'
          ? `Based on this historical data, what are the projections for the next 6 months?`
          : `What insights can you derive from this data pattern?`
        break
        
      case 'cell':
        query = action === 'explain'
          ? `Explain what "${data}" means in the context of ${context || 'mining projects'}`
          : action === 'similar'
          ? `Show me similar values or projects with "${data}" characteristics`
          : `How is "${data}" calculated or determined in mining analysis?`
        break
    }
    
    return query
  }

  const handleAction = (action: string) => {
    const query = generateQuery(action)
    setInput(query)
    toggleChat()  // Open the chat panel
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={() => handleAction('explain')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Ask AI to explain this</span>
        </ContextMenuItem>
        
        {dataType === 'project' && (
          <>
            <ContextMenuItem onClick={() => handleAction('compare')}>
              <ChartBar className="mr-2 h-4 w-4" />
              <span>Compare with similar projects</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('analyze')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Analyze investment potential</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('risks')}>
              <Lightbulb className="mr-2 h-4 w-4" />
              <span>Identify key risks</span>
            </ContextMenuItem>
          </>
        )}
        
        {dataType === 'metric' && (
          <>
            <ContextMenuItem onClick={() => handleAction('benchmark')}>
              <Database className="mr-2 h-4 w-4" />
              <span>Compare to benchmarks</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('trends')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Show industry trends</span>
            </ContextMenuItem>
          </>
        )}
        
        {dataType === 'chart' && (
          <>
            <ContextMenuItem onClick={() => handleAction('forecast')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Forecast future trends</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('insights')}>
              <Lightbulb className="mr-2 h-4 w-4" />
              <span>Extract insights</span>
            </ContextMenuItem>
          </>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Search className="mr-2 h-4 w-4" />
            <span>Search for...</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => handleAction('similar')}>
              Similar projects
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('documentation')}>
              Related reports
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('news')}>
              Latest news
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}
