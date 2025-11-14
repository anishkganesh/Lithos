"use client"

import * as React from "react"
import { BookOpen, Mail, AlertTriangle, Globe, Building2, Newspaper, MessageSquare, ArrowRight, Layers } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<"guide" | "risk">("guide")

  const handleNavigate = (path: string) => {
    onOpenChange(false)
    router.push(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Help & Documentation
          </DialogTitle>
          <DialogDescription>
            Quick start guide and risk scoring methodology
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-8 border-b mb-4">
          <button
            onClick={() => setActiveTab("guide")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "guide"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Quick Start
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "risk"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Risk Scoring
          </button>
        </div>

        <Tabs value={activeTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="hidden">
            <TabsTrigger value="guide">Quick Start</TabsTrigger>
            <TabsTrigger value="risk">Risk Scoring</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Your Workflow</h3>
                <div className="space-y-2">
                <button
                  onClick={() => handleNavigate('/global-projects')}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">1. Browse Projects</div>
                        <div className="text-xs text-muted-foreground">Search, filter, and compare mining projects globally</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('/globe')}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">2. Visualize on Globe</div>
                        <div className="text-xs text-muted-foreground">Explore projects on interactive 3D globe</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('/companies')}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">3. Analyze Companies</div>
                        <div className="text-xs text-muted-foreground">Review company portfolios and ownership stakes</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('/news')}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Newspaper className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">4. Stay Updated</div>
                        <div className="text-xs text-muted-foreground">Track news and announcements in real-time</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    onOpenChange(false)
                    // Open chat in fullscreen mode
                    const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement
                    if (searchButton) {
                      searchButton.click()
                    }
                  }}
                  className="w-full text-left p-3 border rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium text-sm">5. Ask AI Assistant</div>
                        <div className="text-xs text-muted-foreground">Press Cmd/Ctrl+K or click Search button</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            </div>

            <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Key Features</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>Watchlist:</strong> Star projects to track changes and updates</p>
                  <p>• <strong>Compare:</strong> Select 2+ projects to view side-by-side analysis</p>
                  <p>• <strong>Export:</strong> Download data in CSV, Excel, or JSON formats</p>
                  <p>• <strong>Visualize:</strong> Explore projects on the 3D globe view</p>
                </div>
              </div>
            </div>

            <div className="border-t mt-3 pt-3 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-muted-foreground">Need help?</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = 'mailto:info@lithos-ai.com?subject=Help Request'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className="bg-green-100 text-green-800 shrink-0">Low</Badge>
                <div className="text-sm space-y-1">
                  <p className="font-medium">0-25 Points</p>
                  <p className="text-muted-foreground text-xs">Tier 1 jurisdiction • Advanced stage • IRR {'>'}20% • Proven reserves</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className="bg-yellow-100 text-yellow-800 shrink-0">Medium</Badge>
                <div className="text-sm space-y-1">
                  <p className="font-medium">26-50 Points</p>
                  <p className="text-muted-foreground text-xs">Tier 2 jurisdiction • PEA/Pre-Feas • IRR 15-20% • Indicated resources</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className="bg-orange-100 text-orange-800 shrink-0">High</Badge>
                <div className="text-sm space-y-1">
                  <p className="font-medium">51-75 Points</p>
                  <p className="text-muted-foreground text-xs">Tier 3 jurisdiction • Exploration • IRR 10-15% • Inferred resources</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className="bg-red-100 text-red-800 shrink-0">Very High</Badge>
                <div className="text-sm space-y-1">
                  <p className="font-medium">76-100 Points</p>
                  <p className="text-muted-foreground text-xs">High-risk jurisdiction • Conceptual • IRR {'<'}10% • Limited resources</p>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">Risk Factors</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <p>• Geopolitical stability</p>
                  <p>• Financial viability</p>
                  <p>• Regulatory environment</p>
                  <p>• Resource confidence</p>
                  <p>• Project stage</p>
                  <p>• ESG considerations</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
