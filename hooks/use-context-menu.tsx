'use client'

import { useState, useCallback, useEffect } from 'react'

interface ContextMenuState {
  x: number
  y: number
  selectedText: string
  isOpen: boolean
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    selectedText: '',
    isOpen: false
  })

  const openContextMenu = useCallback((e: React.MouseEvent, text: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Get the selected text if any, otherwise use provided text
    const selection = window.getSelection()?.toString().trim()
    const textToUse = selection || text
    
    if (textToUse) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        selectedText: textToUse,
        isOpen: true
      })
    }
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }, [])

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      
      // Get the selected text if any
      const selection = window.getSelection()?.toString().trim()
      
      // Check if right-clicking on a data element or its parent containers
      const target = e.target as HTMLElement
      let dataElement = target.closest('[data-contextmenu]')
      
      // If no data-contextmenu found, check for common data containers
      if (!dataElement) {
        dataElement = target.closest('td, .card, [role="cell"], [role="gridcell"], .project-detail, .chart-area')
      }
      
      // Get text content from various sources
      let text = ''
      if (selection) {
        text = selection
      } else if (dataElement) {
        text = dataElement.getAttribute('data-contextmenu') || 
               dataElement.textContent || 
               ''
      } else if (target.textContent) {
        text = target.textContent
      }
      
      if (text.trim()) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          selectedText: text.trim(),
          isOpen: true
        })
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu
  }
}
