'use client'

import React from "react"
import { MiningProject } from "@/lib/types/mining-project"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, AlertTriangle, FileText, Users } from "lucide-react"
import { SensitivityAnalysis } from "./sensitivity-analysis"
import { cn } from "@/lib/utils"

interface SingleProjectViewProps {
  project: MiningProject
  onProjectSelect?: (projectId: string) => void
}

const getRiskBadgeColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800"
    case "medium":
      return "bg-yellow-100 text-yellow-800"
    case "high":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function SingleProjectView({ project, onProjectSelect }: SingleProjectViewProps) {
  const similarProjects = [
    { id: '1', name: 'Similar Project 1', npv: 3200, irr: 28 },
    { id: '2', name: 'Similar Project 2', npv: 2800, irr: 24 },
    { id: '3', name: 'Similar Project 3', npv: 4100, irr: 31 },
    { id: '4', name: 'Similar Project 4', npv: 2500, irr: 22 }
  ]

  return (
    <div className="space-y-4 p-6">
      {/* Company Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-medium">{project.project}</h2>
            <p className="text-sm text-muted-foreground">
              {project.investorsOwnership.split("(")[0].trim()} • {project.jurisdiction}
            </p>
          </div>
          <Badge className={cn("text-xs", getRiskBadgeColor(project.riskLevel))}>
            {project.riskLevel} Risk
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Key Metrics Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Financial Metrics</h3>
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-2 divide-x">
            <div className="p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Post-tax NPV</span>
                <span className="text-sm">${(project.postTaxNPV / 1000).toFixed(1)}B</span>
              </div>
            </div>
            <div className="p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IRR</span>
                <span className="text-sm">{project.irr}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x">
            <div className="p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">CAPEX</span>
                <span className="text-sm">${project.capex}M</span>
              </div>
            </div>
            <div className="p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payback</span>
                <span className="text-sm">{project.paybackYears} years</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x">
            <div className="p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">AISC</span>
                <span className="text-sm">${project.aisc}/t</span>
              </div>
            </div>
            <div className="p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mine Life</span>
                <span className="text-sm">{project.mineLife} years</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Project Details</h3>
        <div className="border rounded-lg divide-y">
          <div className="p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stage</span>
              <Badge variant="outline" className="text-xs">{project.stage}</Badge>
            </div>
          </div>
          <div className="p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Primary Commodity</span>
              <span className="text-sm">{project.primaryCommodity}</span>
            </div>
          </div>
          <div className="p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Resource Grade</span>
              <span className="text-sm">
                {project.resourceGrade} {project.gradeUnit || '%'}
              </span>
            </div>
          </div>
          <div className="p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Contained Metal</span>
              <span className="text-sm">
                {project.containedMetal ? `${(project.containedMetal / 1000).toFixed(0)}k t` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="p-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ESG Score</span>
              <Badge variant="outline" className="text-xs">{project.esgScore}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {project.redFlags && typeof project.redFlags === 'number' && project.redFlags > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900">
              {project.redFlags} Risk Flags Identified
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical Report</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="experts">Experts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Production Profile</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Production</span>
                <span>{project.annualProduction || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Resource</span>
                <span>{project.totalResource || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strip Ratio</span>
                <span>{project.stripRatio || 'N/A'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Infrastructure</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power Supply</span>
                <span>{project.powerSupply || 'Grid connected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Water Source</span>
                <span>{project.waterSource || 'Local aquifer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transport</span>
                <span>{project.transport || 'Road & rail access'}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Technical Documentation</h4>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm">
                <FileText className="mr-2 h-4 w-4" />
                NI 43-101 Technical Report (2024)
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <FileText className="mr-2 h-4 w-4" />
                Feasibility Study Update (2023)
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">AI Analysis Summary</h4>
            <p className="text-sm text-muted-foreground">
              Advanced AI analysis of technical reports, market conditions, and risk factors.
            </p>
            <Button className="w-full mt-4" variant="outline">
              Open Full AI Analysis
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="experts" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Industry Experts</h4>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Connect with verified mining industry experts for deeper insights.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Sensitivity Analysis */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Sensitivity Analysis</h3>
        <SensitivityAnalysis project={project} />
      </div>

      <Separator />

      {/* Similar Projects */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Similar Projects</h3>
        <div className="grid grid-cols-2 gap-3">
          {similarProjects.map((similar) => (
            <Card 
              key={similar.id} 
              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onProjectSelect?.(similar.id)}
            >
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{similar.name}</h4>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>NPV: ${similar.npv}M</span>
                  <span>IRR: {similar.irr}%</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sticky bottom-0 bg-background border-t pt-4 -mx-6 px-6 -mb-6">
        <div className="flex gap-2">
          <Button className="flex-1" size="sm">Compare Projects</Button>
          <Button className="flex-1" variant="outline" size="sm">Export Analysis</Button>
        </div>
      </div>
    </div>
  )
} 