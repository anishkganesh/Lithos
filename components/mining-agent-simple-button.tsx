'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { useProjects } from '@/lib/hooks/use-projects'
import { supabase } from '@/lib/supabase/client'

export function MiningAgentSimpleButton() {
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState('')
  const { refetch } = useProjects()

  const runMiningAgent = async () => {
    // Check if Supabase is available
    if (!supabase()) {
      toast.info('Mining agent requires database configuration')
      return
    }

    setIsRunning(true)
    setStatus('Initializing mining agent...')

    try {
      // Start the mining agent
      const response = await fetch('/api/mining-agent/start', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Simulate progress updates
        const sources = ['Mining.com', 'Company Websites', 'Technical Reports Database', 'ASX Announcements']
        
        for (let i = 0; i < sources.length; i++) {
          setStatus(`Scanning ${sources[i]}...`)
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
        
        setStatus('Processing documents with AI...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Calculate totals
        const totals = data.results.reduce((acc: any, result: any) => ({
          created: acc.created + result.projectsCreated,
          updated: acc.updated + result.projectsUpdated
        }), { created: 0, updated: 0 })
        
        const totalProjects = totals.created + totals.updated
        
        if (totalProjects > 0) {
          toast.success(`Added ${totals.created} new projects, updated ${totals.updated} existing projects`)
          // Refresh the projects list
          refetch()
        } else {
          toast.info('No new projects found in this scan')
        }
      } else {
        toast.error(data.error || 'Mining agent failed')
      }
    } catch (error) {
      console.error('Mining agent error:', error)
      toast.error('Failed to run mining agent')
    } finally {
      setIsRunning(false)
      setStatus('')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        onClick={runMiningAgent}
        disabled={isRunning}
        size="sm"
        variant="outline"
      >
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Mining Agent
          </>
        )}
      </Button>
      {isRunning && status && (
        <span className="text-sm text-muted-foreground animate-pulse">
          {status}
        </span>
      )}
    </div>
  )
} 