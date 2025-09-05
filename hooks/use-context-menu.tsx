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
      // Check if right-clicking on a data element
      const target = e.target as HTMLElement
      const dataElement = target.closest('[data-contextmenu]')
      
      if (dataElement) {
        e.preventDefault()
        const text = dataElement.getAttribute('data-contextmenu') || dataElement.textContent || ''
        
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
