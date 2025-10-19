'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ChatLayout } from '@/components/chat-layout'
import { useRequireAuth } from '@/lib/auth-utils'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ProjectGlobe } from '@/components/project-globe/project-globe'
import { ProjectDetailPanel } from '@/components/project-detail-panel/project-detail-panel'
import { MiningProject } from '@/lib/types/mining-project'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function GlobePage() {
  const { user, isLoading } = useRequireAuth()
  const [projects, setProjects] = useState<MiningProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedProject, setSelectedProject] = useState<MiningProject | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('npv', { ascending: false, nullsFirst: false })

      if (error) throw error

      setProjects(data || [])
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleProjectClick = (project: MiningProject) => {
    setSelectedProject(project)
    setDetailPanelOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailPanelOpen(false)
    setSelectedProject(null)
  }

  if (isLoading) {
    return null
  }

  if (!user) {
    return null
  }

  return (
    <ChatLayout>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 relative" style={{ height: 'calc(100vh - var(--header-height))' }}>
              <ProjectGlobe
                projects={projects}
                onProjectClick={handleProjectClick}
                className="w-full h-full"
              />
            </div>
          </div>
        </SidebarInset>

        {/* Project Detail Panel */}
        {selectedProject && (
          <ProjectDetailPanel
            isOpen={detailPanelOpen}
            onClose={handleCloseDetail}
            projects={[selectedProject]}
            mode="single"
          />
        )}
      </SidebarProvider>
    </ChatLayout>
  )
}
