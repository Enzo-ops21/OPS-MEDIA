import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { processing?: boolean }
>(({ className, value, processing, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'h-full transition-all duration-300',
        processing ? 'bg-lilas-pop animate-pulse' : value === 100 ? 'bg-verde-folha' : 'bg-foreground'
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)`, width: '100%' }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
