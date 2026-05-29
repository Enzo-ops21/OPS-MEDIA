import { Badge } from '@/components/ui/badge'

type PlatformVariant = 'youtube' | 'instagram' | 'tiktok' | 'spotify' | 'transcription' | 'secondary'

const VARIANTS: Record<string, PlatformVariant> = {
  youtube: 'youtube',
  instagram: 'instagram',
  tiktok: 'tiktok',
  spotify: 'spotify',
  transcribe: 'transcription',
}

const LABELS: Record<string, string> = {
  transcribe: 'Transcrição',
}

export function PlatformBadge({ platform }: { platform: string }) {
  const variant = VARIANTS[platform] ?? 'secondary'
  const label = LABELS[platform] ?? platform
  return (
    <Badge variant={variant} className="tracking-wide">
      {label}
    </Badge>
  )
}
