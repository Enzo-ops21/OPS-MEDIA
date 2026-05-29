import type { PageDef } from '@/types'

export const PAGES: PageDef[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    accent: '#ef4444',
    gradient: 'from-red-500 to-red-700',
    placeholder: 'https://youtube.com/watch?v=…\nhttps://youtu.be/…',
    formats: ['mp4', 'mp3'],
    qualities: ['best', '1080p', '720p', '480p', '360p'],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    accent: '#ec4899',
    gradient: 'from-pink-500 via-rose-500 to-orange-500',
    placeholder: 'https://www.instagram.com/reel/…\nhttps://www.instagram.com/p/…',
    formats: ['mp4', 'mp3'],
    qualities: ['best', '720p', '480p', '360p'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    accent: '#0ea5e9',
    gradient: 'from-cyan-400 to-blue-600',
    placeholder: 'https://www.tiktok.com/@user/video/…\nhttps://vm.tiktok.com/…',
    formats: ['mp4', 'mp3'],
    qualities: ['best', '720p', '480p'],
  },
  {
    id: 'spotify',
    label: 'Spotify',
    accent: '#22c55e',
    gradient: 'from-green-400 to-emerald-600',
    placeholder: 'https://open.spotify.com/track/…\nhttps://open.spotify.com/episode/…',
    formats: ['mp3'],
    audioOnly: true,
  },
  {
    id: 'transcribe',
    label: 'Transcrição',
    accent: '#8b5cf6',
    gradient: 'from-violet-600 to-fuchsia-600',
    placeholder: 'https://www.instagram.com/reel/…\nhttps://www.instagram.com/reel/…',
    formats: [],
  },
]

export const DOWNLOAD_PAGE_IDS = ['youtube', 'instagram', 'tiktok', 'spotify'] as const

export function getPageById(id: string): PageDef | undefined {
  return PAGES.find(p => p.id === id)
}
