import type { DownloadedFile, Folder, TranscriptionItem } from '@/types'
import { apiUrl } from '@/lib/api-base'

export async function fetchFolders(): Promise<Folder[]> {
  const r = await fetch(apiUrl('/api/folders'))
  if (!r.ok) throw new Error('Falha ao carregar pastas')
  const d = await r.json()
  return Object.values(d) as Folder[]
}

export async function fetchTranscriptionResults(): Promise<TranscriptionItem[]> {
  const r = await fetch(apiUrl('/api/results'))
  if (!r.ok) throw new Error('Falha ao carregar resultados')
  const data: Record<string, TranscriptionItem & { error?: string }> = await r.json()
  return Object.entries(data).map(([url, v]) => ({
    url,
    status: (v.error ? 'error' : 'done') as TranscriptionItem['status'],
    title: v.title,
    thumbnail: v.thumbnail,
    text: v.text ?? undefined,
    language: v.language,
    segments: v.segments,
    error: v.error,
    folder_id: v.folder_id,
    created_at: v.created_at,
  }))
}

export async function fetchDownloadFiles(platform: string): Promise<DownloadedFile[]> {
  const r = await fetch(apiUrl(`/api/downloads/${platform}`))
  if (!r.ok) throw new Error('Falha ao carregar arquivos')
  return r.json()
}

export async function createFolder(name: string, color: string) {
  await fetch(apiUrl('/api/folders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
}

export async function renameFolder(id: string, name: string) {
  await fetch(apiUrl(`/api/folders/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteFolder(id: string) {
  await fetch(apiUrl(`/api/folders/${id}`), { method: 'DELETE' })
}

export async function deleteDownloadFile(platform: string, filename: string) {
  const url = apiUrl(`/api/file/${encodeURIComponent(platform)}/${encodeURIComponent(filename)}`)
  let r: Response
  try {
    r = await fetch(url, { method: 'DELETE' })
  } catch (err) {
    console.error(`Erro de rede ao excluir "${filename}":`, err)
    throw err
  }
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    console.error(`DELETE ${url} falhou (${r.status}):`, detail)
    throw new Error(`Falha ao excluir arquivo (${r.status})`)
  }
}

export async function deleteTranscriptionResult(url: string) {
  const r = await fetch(apiUrl(`/api/results/${encodeURIComponent(url)}`), { method: 'DELETE' })
  if (!r.ok) throw new Error('Falha ao excluir transcrição')
}
