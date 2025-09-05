'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, TrendingUp, FileText, Copy } from 'lucide-react'
import { useGlobalChat } from '@/lib/global-chat-context'
import { useChat } from '@/lib/chat-context'

interface ContextMenuProps {
  x: number
  y: number
  selectedText: string
  onClose: () => void
}

export function ContextMenuChat({ x, y, selectedText, onClose }: ContextMenuProps) {
  const [mounted, setMounted] = useState(false)
  const { setInput, handleSubmit } = useGlobalChat()
  const { setIsOpen } = useChat()

  useEffect(() => {
    setMounted(true)
    
    const handleClick = () => onClose()
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleChatWithData = async (prompt: string) => {
    setIsOpen(true)
    setInput(prompt)
    setTimeout(() => {
      handleSubmit(new Event('submit') as any)
    }, 100)
    onClose()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText)
    onClose()
  }

  const menuItems = [
    {
      icon: MessageSquare,
      label: 'Explain this data',
      action: () => handleChatWithData(`Explain this data: "${selectedText}"`)
    },
    {
      icon: TrendingUp,
      label: 'Analyze trends',
      action: () => handleChatWithData(`Analyze the trends and patterns in this data: "${selectedText}"`)
    },
    {
      icon: FileText,
      label: 'Generate report',
      action: () => handleChatWithData(`Generate a brief report about: "${selectedText}"`)
    },
    {
      icon: Copy,
      label: 'Copy',
      action: handleCopy
    }
  ]

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={item.action}
          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
        >
          <item.icon className="w-4 h-4 text-gray-500" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  )
}
