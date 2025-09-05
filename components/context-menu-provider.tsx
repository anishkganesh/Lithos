'use client'

import { useContextMenu } from '@/hooks/use-context-menu'
import { ContextMenuChat } from '@/components/ui/context-menu-chat'

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const { contextMenu, closeContextMenu } = useContextMenu()

  return (
    <>
      {children}
      {contextMenu.isOpen && (
        <ContextMenuChat
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          onClose={closeContextMenu}
        />
      )}
    </>
  )
}
