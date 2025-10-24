"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { X, ExternalLink } from "lucide-react"

// Dynamically import InlinePDFViewer to prevent SSR issues
const InlinePDFViewer = dynamic(
  () => import("./inline-pdf-viewer").then((mod) => ({ default: mod.InlinePDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-xs text-muted-foreground">Loading viewer...</p>
      </div>
    ),
  }
)

interface InlinePDFViewerWrapperProps {
  url: string
  title?: string
  onClose: () => void
  projectId?: string | null
  onProjectUpdated?: () => void
}

export function InlinePDFViewerWrapper({ url, title, onClose, projectId, onProjectUpdated }: InlinePDFViewerWrapperProps) {
  // Detect if this is an HTML document (FactSet filing) or PDF
  const isHtmlDocument = url.endsWith('.html') || url.includes('.html')

  if (isHtmlDocument) {
    // Render HTML document in iframe with controls
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{title || "Technical Document"}</h2>
            <span className="text-xs text-muted-foreground bg-yellow-100 px-2 py-1 rounded">
              FactSet Filing (HTML)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={url}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
            title={title || "Document Viewer"}
          />
        </div>

        {/* Info Footer */}
        <div className="border-t p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            📄 This is a FactSet NI 43-101 technical report. Financial data (NPV, IRR, CAPEX) has been extracted and is visible in the project details.
          </p>
        </div>
      </div>
    )
  }

  // Render PDF with full PDF viewer
  return <InlinePDFViewer url={url} title={title} onClose={onClose} projectId={projectId} onProjectUpdated={onProjectUpdated} />
}
