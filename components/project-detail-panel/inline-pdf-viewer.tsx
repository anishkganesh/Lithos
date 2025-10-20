"use client"

import * as React from "react"
import { Viewer, Worker, SpecialZoomLevel, type RenderViewer } from "@react-pdf-viewer/core"
import { highlightPlugin, Trigger } from "@react-pdf-viewer/highlight"
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation"
import { searchPlugin, RenderSearchProps } from "@react-pdf-viewer/search"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Download, Maximize2, Sparkles, Loader2, Search, ChevronDown, ChevronUp, GripHorizontal } from "lucide-react"

import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/highlight/lib/styles/index.css"
import "@react-pdf-viewer/search/lib/styles/index.css"

interface InlinePDFViewerProps {
  url: string
  title?: string
  onClose: () => void
}

interface Highlight {
  id: string
  content: string
  highlightAreas: Array<{
    pageIndex: number
    left: number
    top: number
    width: number
    height: number
  }>
  quote: string
}

export function InlinePDFViewer({ url, title, onClose }: InlinePDFViewerProps) {
  const [highlights, setHighlights] = React.useState<Highlight[]>([])
  const [loading, setLoading] = React.useState(true)
  const [autoExtracting, setAutoExtracting] = React.useState(false)

  // Load existing highlights from database
  React.useEffect(() => {
    async function loadHighlights() {
      try {
        const response = await fetch(`/api/pdf/extract-highlights?pdfUrl=${encodeURIComponent(url)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.highlights?.highlights) {
            setHighlights(data.highlights.highlights)
            console.log('Loaded existing highlights:', data.highlights.highlights.length)
          }
        }
      } catch (error) {
        console.error('Error loading highlights:', error)
      } finally {
        setLoading(false)
      }
    }
    loadHighlights()
  }, [url])

  // Save highlights to database
  const saveHighlights = React.useCallback(async (newHighlights: Highlight[]) => {
    try {
      const response = await fetch('/api/pdf/extract-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl: url,
          highlights: newHighlights,
        }),
      })
      if (!response.ok) {
        console.error('Failed to save highlights')
      }
    } catch (error) {
      console.error('Error saving highlights:', error)
    }
  }, [url])

  const renderHighlightTarget = (props: any) => (
    <div
      style={{
        background: "#fef08a",
        display: "flex",
        position: "absolute",
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: "translate(0, 8px)",
        zIndex: 1,
      }}
    >
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          const newHighlight: Highlight = {
            id: Math.random().toString(36).substr(2, 9),
            content: props.selectedText,
            highlightAreas: props.highlightAreas,
            quote: props.selectedText,
          }
          const updatedHighlights = [...highlights, newHighlight]
          setHighlights(updatedHighlights)
          saveHighlights(updatedHighlights)
          props.cancel()
        }}
        className="h-7 text-xs"
      >
        Highlight
      </Button>
    </div>
  )

  const renderHighlights = (props: any) => (
    <div>
      {highlights.map((highlight) => (
        <React.Fragment key={highlight.id}>
          {Array.isArray(highlight.highlightAreas) &&
            highlight.highlightAreas
              .filter((area) => area.pageIndex === props.pageIndex)
              .map((area, idx) => (
                <div
                  key={idx}
                  className="highlight-area"
                  style={{
                    ...props.getCssProperties(area, props.rotation),
                    background: "rgba(250, 204, 21, 0.3)",
                    border: "1px solid rgba(250, 204, 21, 0.6)",
                    cursor: "pointer",
                  }}
                  title={`Highlighted: "${highlight.quote}"`}
                />
              ))}
        </React.Fragment>
      ))}
    </div>
  )

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
    renderHighlights,
    trigger: Trigger.TextSelection,
  })
  const { jumpToHighlightArea } = highlightPluginInstance

  const pageNavigationPluginInstance = pageNavigationPlugin()
  const { jumpToPage } = pageNavigationPluginInstance

  const searchPluginInstance = searchPlugin()

  function handleDownload() {
    const link = document.createElement("a")
    link.href = url
    link.download = title || "document.pdf"
    link.target = "_blank"
    link.click()
  }

  function openFullScreen() {
    window.open(url, "_blank")
  }

  async function autoExtractKeyData() {
    setAutoExtracting(true)
    try {
      const response = await fetch('/api/pdf/extract-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl: url,
          projectId: null, // Can be passed as prop if needed
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.highlights) {
          setHighlights(data.highlights)
          console.log('Auto-extracted highlights:', data.highlights.length)
        }
      }
    } catch (error) {
      console.error('Error auto-extracting:', error)
    } finally {
      setAutoExtracting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Controls */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-sm truncate max-w-xs">
              {title || "PDF Document"}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={autoExtractKeyData}
              disabled={autoExtracting || highlights.length > 0}
              className="h-8 gap-1"
            >
              {autoExtracting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span className="text-xs">
                {highlights.length > 0 ? 'Data Extracted' : 'Extract Key Data'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openFullScreen}
              className="h-8 gap-1"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="text-xs">Open</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 gap-1"
            >
              <Download className="h-3 w-3" />
              <span className="text-xs">Save</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {searchPluginInstance.Search && (
          <searchPluginInstance.Search>
            {(renderSearchProps: RenderSearchProps) => (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search in document..."
                    value={renderSearchProps.keyword}
                    onChange={(e) => {
                      renderSearchProps.setKeyword(e.target.value)
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        renderSearchProps.search()
                      }
                    }}
                    className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  {renderSearchProps.keyword && (
                    <button
                      onClick={() => {
                        renderSearchProps.clearKeyword()
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {renderSearchProps.numberOfMatches > 0 && (
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {renderSearchProps.currentMatch}/{renderSearchProps.numberOfMatches}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={renderSearchProps.jumpToPreviousMatch}
                    disabled={!renderSearchProps.keyword || renderSearchProps.numberOfMatches === 0}
                    className="h-7 w-7"
                    title="Previous match"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={renderSearchProps.jumpToNextMatch}
                    disabled={!renderSearchProps.keyword || renderSearchProps.numberOfMatches === 0}
                    className="h-7 w-7"
                    title="Next match"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </searchPluginInstance.Search>
        )}
      </div>

      {/* PDF Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          <Panel defaultSize={70} minSize={30}>
            <div className="h-full overflow-auto bg-background">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <div className="h-full">
                  <Viewer
                    fileUrl={url}
                    plugins={[highlightPluginInstance, pageNavigationPluginInstance, searchPluginInstance]}
                    defaultScale={SpecialZoomLevel.PageWidth}
                    theme={{
                      theme: "light",
                    }}
                  />
                </div>
              </Worker>
            </div>
          </Panel>

          {/* Highlights Section */}
          {highlights.length > 0 && (
            <>
              <PanelResizeHandle className="h-1 bg-border hover:bg-accent transition-colors flex items-center justify-center group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </PanelResizeHandle>
              <Panel defaultSize={30} minSize={15} maxSize={60}>
                <div className="h-full overflow-auto border-t p-4 bg-background">
                  <h4 className="text-sm font-semibold mb-2">
                    Extracted Data ({highlights.length} items)
                  </h4>
                  <div className="space-y-2">
                    {highlights.map((highlight: any) => (
                      <div
                        key={highlight.id}
                        className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs hover:bg-yellow-100 transition-colors cursor-pointer"
                        onClick={() => {
                          // If highlight has areas, jump to the exact position
                          if (highlight.highlightAreas && highlight.highlightAreas.length > 0) {
                            jumpToHighlightArea(highlight.highlightAreas[0])
                          } else if (highlight.page) {
                            // Fallback to page navigation if no highlight areas
                            jumpToPage(highlight.page - 1)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {highlight.dataType && (
                              <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                {highlight.dataType}
                                {highlight.page && (
                                  <span className="ml-2 text-blue-600 hover:underline">
                                    → Page {highlight.page}
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="line-clamp-2">{highlight.quote}</p>
                            {highlight.value !== undefined && (
                              <div className="mt-1 text-xs font-medium text-gray-700">
                                Value: {highlight.value}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation() // Prevent triggering the parent onClick
                              const updated = highlights.filter((h) => h.id !== highlight.id)
                              setHighlights(updated)
                              saveHighlights(updated)
                            }}
                            className="text-red-600 hover:text-red-800 text-xs flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
