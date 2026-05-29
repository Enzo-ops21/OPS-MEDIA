import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs font-medium tracking-wide uppercase whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border text-foreground',
        transcription: 'border-transparent bg-verde-pop text-foreground',
        audio: 'border-transparent bg-verde-pop text-foreground',
        video: 'border-transparent bg-lilas-pop text-foreground',
        youtube: 'border-red-200 bg-red-50 text-red-700',
        instagram: 'border-pink-200 bg-pink-50 text-pink-700',
        tiktok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        spotify: 'border-green-200 bg-green-50 text-green-700',
        pending: 'border-transparent bg-muted text-muted-foreground',
        processing: 'border-transparent bg-amber-100 text-amber-800',
        done: 'border-transparent bg-green-50 text-green-800',
        error: 'border-transparent bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
