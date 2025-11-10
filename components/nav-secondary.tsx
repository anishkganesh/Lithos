"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { toast } from 'sonner'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {

  const handleClick = (title: string, e: React.MouseEvent) => {
    e.preventDefault()

    switch (title) {
      case "Search":
        // Trigger command palette keyboard shortcut
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          code: 'KeyK',
          metaKey: true,
          ctrlKey: true,
          bubbles: true
        })
        document.dispatchEvent(event)
        toast.info('Search', {
          description: 'Use Cmd+K (Mac) or Ctrl+K (Windows) to search across projects, companies, and news'
        })
        break

      case "Settings":
        toast.info('Settings', {
          description: 'User preferences and account settings coming soon'
        })
        break

      case "Get Help":
        toast.info('Help & Documentation', {
          description: 'Access guides, tutorials, and support',
          action: {
            label: 'Email Support',
            onClick: () => {
              window.location.href = 'mailto:info@lithos-ai.com?subject=Help Request'
            }
          }
        })
        break

      default:
        break
    }
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a
                  href={item.url}
                  onClick={(e) => handleClick(item.title, e)}
                  className="cursor-pointer"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
