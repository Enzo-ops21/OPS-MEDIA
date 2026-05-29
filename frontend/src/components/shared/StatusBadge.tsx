import { Badge } from '@/components/ui/badge'
import type { DownloadStatus, TranscriptionStatus } from '@/types'

type Status = TranscriptionStatus | DownloadStatus

const VARIANTS: Record<Status, 'pending' | 'processing' | 'done' | 'error'> = {
  queued: 'pending',
  downloading: 'processing',
  transcribing: 'processing',
  done: 'done',
  error: 'error',
}

const LABELS: Record<Status, string> = {
  queued: 'Na fila',
  downloading: 'Baixando',
  transcribing: 'Transcrevendo',
  done: 'Concluído',
  error: 'Erro',
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>
}
