"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { ContextMenuChat } from '@/components/ui/context-menu-chat'

interface DashboardStats {
  totalProjects: number
  projectsGrowth: number
  totalCompanies: number
  companiesGrowth: number
  totalFilings: number
  filingsGrowth: number
  totalDeals: number
  dealsGrowth: number
}

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    projectsGrowth: 0,
    totalCompanies: 0,
    companiesGrowth: 0,
    totalFilings: 0,
    filingsGrowth: 0,
    totalDeals: 0,
    dealsGrowth: 0
  })

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch total projects
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      // Fetch unique companies
      const { data: companies } = await supabase
        .from('projects')
        .select('company_name')

      const uniqueCompanies = new Set(companies?.map(c => c.company_name).filter(Boolean))

      // Calculate growth (mock data for now - in production you'd compare with last month)
      const projectsLastMonth = Math.floor((projectCount || 0) * 0.88)
      const projectsGrowth = projectCount ? ((projectCount - projectsLastMonth) / projectsLastMonth * 100) : 0

      // Mock filing count based on projects (assuming average 3 filings per project)
      const filingsCount = (projectCount || 0) * 3

      // Mock deals count
      const dealsCount = Math.floor((projectCount || 0) * 0.15)

      setStats({
        totalProjects: projectCount || 0,
        projectsGrowth: projectsGrowth,
        totalCompanies: uniqueCompanies.size,
        companiesGrowth: -2.5,
        totalFilings: filingsCount,
        filingsGrowth: 8.3,
        totalDeals: dealsCount,
        dealsGrowth: 4.5
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <ContextMenuChat
        data={{
          totalProjects: stats.totalProjects,
          growth: stats.projectsGrowth,
          type: 'projects'
        }}
        dataType="metric"
        context="Total mining projects in database"
      >
        <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
        <CardHeader>
          <CardDescription>
            <InfoTooltip content="Total number of mining projects currently tracked across all stages from exploration to production">
              Projects
            </InfoTooltip>
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalProjects.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.projectsGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.projectsGrowth >= 0 ? '+' : ''}{stats.projectsGrowth.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Active mining projects tracked
          </div>
        </CardFooter>
        </Card>
      </ContextMenuChat>
      <ContextMenuChat
        data={{
          totalCompanies: stats.totalCompanies,
          growth: stats.companiesGrowth,
          type: 'companies'
        }}
        dataType="metric"
        context="Mining companies in database"
      >
        <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
        <CardHeader>
          <CardDescription>
            <InfoTooltip content="Mining companies that are publicly traded and required to file regulatory reports with securities commissions">
              Reporting Issuers
            </InfoTooltip>
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalCompanies.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.companiesGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.companiesGrowth >= 0 ? '+' : ''}{Math.abs(stats.companiesGrowth).toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.companiesGrowth >= 0 ? 'Up' : 'Down'} {Math.abs(stats.companiesGrowth).toFixed(1)}% this period {stats.companiesGrowth >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Companies filing reports
          </div>
        </CardFooter>
        </Card>
      </ContextMenuChat>
      <ContextMenuChat
        data={{
          totalFilings: stats.totalFilings,
          growth: stats.filingsGrowth,
          type: 'filings'
        }}
        dataType="metric"
        context="Technical report filings"
      >
        <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
          <CardHeader>
            <CardDescription>
              <InfoTooltip content="Technical reports including NI 43-101, JORC, and other regulatory filings submitted to securities commissions">
                Filings
              </InfoTooltip>
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalFilings.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.filingsGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.filingsGrowth >= 0 ? '+' : ''}{stats.filingsGrowth.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong filing activity <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Technical reports submitted</div>
        </CardFooter>
        </Card>
      </ContextMenuChat>
      <ContextMenuChat
        data={{
          totalDeals: stats.totalDeals,
          growth: stats.dealsGrowth,
          type: 'deals'
        }}
        dataType="metric"
        context="Mergers and joint ventures"
      >
        <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
          <CardHeader>
            <CardDescription>
              <InfoTooltip content="Mergers, acquisitions, and joint venture agreements between mining companies for project development">
                M&A/JVs
            </InfoTooltip>
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalDeals.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.dealsGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.dealsGrowth >= 0 ? '+' : ''}{stats.dealsGrowth.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Steady deal flow <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Mergers & joint ventures</div>
        </CardFooter>
        </Card>
      </ContextMenuChat>
    </div>
  )
}
