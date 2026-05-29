import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'halftone-bg flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-16 text-center',
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
        <Icon className="size-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
