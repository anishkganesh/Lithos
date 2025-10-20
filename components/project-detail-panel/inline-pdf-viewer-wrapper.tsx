"use client"

import dynamic from "next/dynamic"
import * as React from "react"

// Dynamically import InlinePDFViewer to prevent SSR issues
const InlinePDFViewer = dynamic(
  () => import("./inline-pdf-viewer").then((mod) => ({ default: mod.InlinePDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-xs text-muted-foreground">Loading PDF viewer...</p>
      </div>
    ),
  }
)

interface InlinePDFViewerWrapperProps {
  url: string
  title?: string
  onClose: () => void
}

export function InlinePDFViewerWrapper({ url, title, onClose }: InlinePDFViewerWrapperProps) {
  return <InlinePDFViewer url={url} title={title} onClose={onClose} />
}
