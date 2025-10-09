'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { ProjectScreener } from '@/components/project-screener'
import { CompanyScreener } from '@/components/company-screener/company-screener'
import { NewsScreener } from '@/components/news-screener/news-screener'
import { SectionCards } from '@/components/section-cards'
import { SiteHeader } from '@/components/site-header'
import { ChatLayout } from '@/components/chat-layout'
import { useRequireAuth } from '@/lib/auth-utils'

import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default function Page() {
  const { user, isLoading } = useRequireAuth()
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }
  
  if (!user) {
    return null // Will redirect to login
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
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive />
                </div>
                <div className="px-4 lg:px-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Watchlisted Projects</h2>
                    <ProjectScreener />
                  </div>
                </div>
                <div className="px-4 lg:px-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Watchlisted Companies</h2>
                    <CompanyScreener />
                  </div>
                </div>
                <div className="px-4 lg:px-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Watchlisted News</h2>
                    <NewsScreener />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatLayout>
  )
} 