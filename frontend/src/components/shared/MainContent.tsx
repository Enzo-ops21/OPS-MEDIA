import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-[1040px] px-10 py-10 md:px-12">{children}</div>
    </ScrollArea>
  )
}
