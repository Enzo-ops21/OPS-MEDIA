export type TranscriptionStatus = 'queued' | 'downloading' | 'transcribing' | 'done' | 'error'
export type DownloadStatus      = 'queued' | 'downloading' | 'done' | 'error'
export type PageId = 'transcribe' | 'instagram' | 'youtube' | 'tiktok' | 'spotify'

export interface Segment { start: number; end: number; text: string }

export interface TranscriptionItem {
  url: string
  status: TranscriptionStatus
  title?: string
  thumbnail?: string
  text?: string
  language?: string
  segments?: Segment[]
  error?: string
  folder_id?: string | null
  created_at?: string
}

export interface DownloadItem {
  url: string
  status: DownloadStatus
  title?: string
  error?: string
}

export interface Folder {
  id: string
  name: string
  color: string
  created_at: string
}

export interface DownloadedFile {
  filename: string
  size: number
  path: string
  created_at: string
}

export interface PageDef {
  id: PageId
  label: string
  accent: string        // tailwind color token e.g. "violet"
  gradient: string      // gradient classes
  placeholder: string
  formats: string[]
  qualities?: string[]
  audioOnly?: boolean
}
