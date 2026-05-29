import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Check,
  CheckSquare,
  Download,
  FileAudio,
  FileVideo,
  FolderDown,
  HardDrive,
  Loader2,
  MousePointerClick,
  Music2,
  Square,
  Trash2,
  TvMinimalPlay,
  Camera,
  Clapperboard,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteDownloadFile, fetchDownloadFiles } from '@/api/client'
import type { DownloadItem, DownloadedFile, PageDef } from '@/types'
import { FoldersPanel, folderDotClass } from '@/components/FoldersPanel'
import { useFolders } from '@/hooks/useFolders'
import { MainContent } from '@/components/shared/MainContent'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

const PLATFORM_ICONS: Record<string, typeof TvMinimalPlay> = {
  youtube: TvMinimalPlay,
  instagram: Camera,
  tiktok: Clapperboard,
  spotify: Music2,
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  spotify: 'Spotify',
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    return u.pathname.split('/').filter(Boolean).slice(0, 3).join('/')
  } catch {
    return url.slice(0, 50)
  }
}

function triggerBrowserDownloads(filenames: string[], platform: string) {
  filenames.forEach((filename, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = `/api/file/${platform}/${encodeURIComponent(filename)}`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }, i * 300)
  })
}

function QueueCard({ item, platform }: { item: DownloadItem; platform: string }) {
  const isProcessing = item.status === 'downloading'
  const Icon = PLATFORM_ICONS[platform] ?? Download

  return (
    <article className="card-queue">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {item.status === 'done' && <Check className="size-5 text-verde-folha" aria-hidden />}
        {item.status === 'error' && <span className="text-destructive">×</span>}
        {item.status === 'queued' && <Icon className="size-5 text-muted-foreground" aria-hidden />}
        {isProcessing && <Loader2 className="size-5 animate-spin text-lilas-pop" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{item.title || shortUrl(item.url)}</span>
          <PlatformBadge platform={platform} />
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">{item.url}</p>
      </div>
      <StatusBadge status={item.status} />
      {item.status === 'error' && item.error && (
        <p className="w-full basis-full break-all text-sm text-destructive sm:pl-14">{item.error}</p>
      )}
    </article>
  )
}

function FileCard({
  file,
  platform,
  folderName,
  folderColor,
  selectionMode,
  deleteMode,
  selected,
  onToggleSelect,
  onDelete,
}: {
  file: DownloadedFile
  platform: string
  folderName?: string
  folderColor?: string
  selectionMode: boolean
  deleteMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onDelete: () => void
}) {
  const ext = file.filename.split('.').pop()?.toUpperCase() ?? '?'
  const isVideo = ['MP4', 'MKV', 'WEBM', 'MOV'].includes(ext)
  const isAudio = ['MP3', 'M4A', 'WAV', 'FLAC', 'OGG'].includes(ext)
  const FileIcon = isVideo ? FileVideo : isAudio ? FileAudio : HardDrive

  return (
    <article
      className={cn(
        'card-queue relative',
        selectionMode && 'cursor-pointer pl-10',
        selected && selectionMode && 'border-primary bg-primary/5 ring-1 ring-primary/30'
      )}
      onClick={() => {
        if (selectionMode) onToggleSelect()
      }}
      onKeyDown={e => {
        if (selectionMode && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onToggleSelect()
        }
      }}
      role={selectionMode ? 'button' : undefined}
      tabIndex={selectionMode ? 0 : undefined}
    >
      {selectionMode && (
        <div
          className="absolute top-4 left-4 flex size-5 items-center justify-center rounded border border-input bg-card text-primary"
          aria-hidden
        >
          {selected ? <CheckSquare className="size-4" /> : <Square className="size-4 text-muted-foreground" />}
        </div>
      )}
      {deleteMode && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-3 right-3 size-8 shrink-0 border-destructive/40 bg-destructive/10 hover:bg-destructive/20"
          aria-label={`Excluir ${file.filename}`}
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      )}
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-bold',
          isVideo && 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300',
          isAudio && 'border-transparent bg-verde-pop text-foreground',
          !isVideo && !isAudio && 'bg-muted text-muted-foreground'
        )}
      >
        {ext.slice(0, 4)}
      </div>
      <div className={cn('min-w-0 flex-1', deleteMode && 'pr-10')}>
        <p className="truncate text-sm font-semibold">{file.filename}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{fmtBytes(file.size)}</span>
          <Badge variant={isVideo ? 'video' : isAudio ? 'audio' : 'secondary'} className="gap-1 normal-case">
            <FileIcon className="size-3" aria-hidden />
            {isVideo ? 'Vídeo' : isAudio ? 'Áudio' : 'Arquivo'}
          </Badge>
          <PlatformBadge platform={platform} />
          {folderName && folderColor && (
            <Badge variant="outline" className="gap-1 normal-case">
              <span className={cn('size-1.5 rounded-full', folderDotClass(folderColor))} />
              {folderName}
            </Badge>
          )}
          {file.created_at && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
      </div>
      {!selectionMode && !deleteMode && (
        <Button variant="secondary" size="sm" asChild>
          <a href={`/api/file/${platform}/${encodeURIComponent(file.filename)}`} download={file.filename}>
            <Download className="size-4" aria-hidden />
            Baixar
          </a>
        </Button>
      )}
    </article>
  )
}

export function DownloaderPage({ page }: { page: PageDef }) {
  const [linksText, setLinksText] = useState('')
  const [format, setFormat] = useState(page.formats[0] ?? 'mp4')
  const [quality, setQuality] = useState('best')
  const [items, setItems] = useState<DownloadItem[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'queue' | 'files'>('files')
  const [selectionMode, setSelectionMode] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)
  const queryClient = useQueryClient()
  const { folders } = useFolders()

  const PlatformIcon = PLATFORM_ICONS[page.id] ?? Download
  const platformLabel = PLATFORM_LABELS[page.id] ?? page.label

  const { data: files = [] } = useQuery({
    queryKey: ['downloads', page.id],
    queryFn: () => fetchDownloadFiles(page.id),
  })

  useEffect(() => {
    setFormat(page.formats[0] ?? 'mp4')
    setQuality('best')
    setItems([])
    setLinksText('')
  }, [page.id, page.formats])

  const parsedUrls = linksText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  const doneItems = items.filter(i => i.status === 'done')
  const activeItems = items.filter(i => ['queued', 'downloading'].includes(i.status))
  const activeFolder = folders.find(f => f.id === activeFolderId)

  const handleStart = useCallback(async () => {
    if (parsedUrls.length === 0 || isRunning) return
    setIsRunning(true)
    setActiveTab('queue')
    setItems(prev => {
      const existing = new Set(prev.map(i => i.url))
      const fresh = parsedUrls.filter(u => !existing.has(u)).map(url => ({ url, status: 'queued' as const }))
      return [...prev, ...fresh]
    })
    try {
      const res = await fetch('/api/download/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: parsedUrls, platform: page.id, format, quality }),
      })
      const { job_id } = await res.json()
      const es = new EventSource(`/api/download/stream/${job_id}`)
      esRef.current = es
      es.onmessage = e => {
        const ev = JSON.parse(e.data)
        if (ev.type === 'downloading')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'downloading' } : i)))
        if (ev.type === 'done')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'done', title: ev.title } : i)))
        if (ev.type === 'error')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'error', error: ev.error } : i)))
        if (ev.type === 'finished') {
          setIsRunning(false)
          es.close()
          setLinksText('')
          setActiveTab('files')
          queryClient.invalidateQueries({ queryKey: ['downloads', page.id] })
        }
      }
      es.onerror = () => {
        setIsRunning(false)
        es.close()
      }
    } catch {
      setIsRunning(false)
    }
  }, [parsedUrls, format, quality, page.id, isRunning, queryClient])

  function downloadAll() {
    triggerBrowserDownloads(
      files.map(f => f.filename),
      page.id
    )
  }

  function downloadSelected() {
    triggerBrowserDownloads(selectedFilenames, page.id)
  }

  async function deleteSelected() {
    const filenames = [...selectedFilenames]
    const count = filenames.length
    if (count === 0) return
    if (!confirm(`Excluir ${count} arquivo(s) selecionado(s)?`)) return

    const results = await Promise.allSettled(
      filenames.map(filename => deleteDownloadFile(page.id, filename))
    )

    let failedCount = 0
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        failedCount += 1
        console.error(`Falha ao excluir "${filenames[idx]}":`, result.reason)
      }
    })

    cancelSelectionMode()
    await queryClient.invalidateQueries({ queryKey: ['downloads', page.id] })

    if (failedCount > 0) {
      alert(`Não foi possível excluir ${failedCount} de ${count} arquivo(s).`)
    }
  }

  function enterSelectionMode() {
    setDeleteMode(false)
    setActiveTab('files')
    setSelectionMode(true)
  }

  function toggleDeleteMode() {
    setDeleteMode(prev => {
      if (!prev) {
        setSelectionMode(false)
        setSelectedFilenames([])
        setActiveTab('files')
      }
      return !prev
    })
  }

  function cancelSelectionMode() {
    setSelectionMode(false)
    setSelectedFilenames([])
  }

  function toggleFileSelection(filename: string) {
    setSelectedFilenames(prev =>
      prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
    )
  }

  function selectAllFiles() {
    setSelectedFilenames(files.map(f => f.filename))
  }

  async function handleDeleteFile(filename: string) {
    if (!confirm(`Excluir "${filename}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteDownloadFile(page.id, filename)
      setSelectedFilenames(prev => prev.filter(f => f !== filename))
      await queryClient.invalidateQueries({ queryKey: ['downloads', page.id] })
    } catch (err) {
      console.error(`Falha ao excluir "${filename}":`, err)
      alert('Não foi possível excluir o arquivo.')
    }
  }

  return (
    <MainContent>
      <PageHeader
        eyebrow={`Download / ${platformLabel}`}
        title={`Download de ${page.audioOnly ? 'áudio' : 'mídia'}`}
        description={
          page.audioOnly
            ? 'Cole links do Spotify para baixar faixas e episódios públicos em MP3.'
            : `Baixe vídeos e áudios do ${platformLabel} na qualidade escolhida.`
        }
      />

      <section className="card-elevated mb-10 space-y-6 p-6">
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${page.accent} 12%, transparent)`, color: page.accent }}
          >
            <PlatformIcon className="size-6" aria-hidden />
          </div>
          <div>
            <p className="font-semibold">{page.label}</p>
            <p className="text-sm text-muted-foreground">
              {page.audioOnly ? 'Somente áudio' : 'Vídeo e áudio'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="download-links">Links</Label>
            {parsedUrls.length > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {parsedUrls.length}
              </Badge>
            )}
          </div>
          <Textarea
            id="download-links"
            value={linksText}
            onChange={e => setLinksText(e.target.value)}
            placeholder={page.placeholder}
            rows={5}
            disabled={isRunning}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block font-mono text-xs tracking-wide uppercase">Formato</Label>
            <div className="flex flex-wrap gap-2">
              {page.formats.map(f => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={format === f ? 'default' : 'secondary'}
                  className="uppercase"
                  disabled={isRunning}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          {format !== 'mp3' && page.qualities && (
            <div>
              <Label className="mb-2 block font-mono text-xs tracking-wide uppercase">Qualidade</Label>
              <div className="flex flex-wrap gap-2">
                {page.qualities.map(q => (
                  <Button
                    key={q}
                    type="button"
                    size="sm"
                    variant={quality === q ? 'default' : 'secondary'}
                    disabled={isRunning}
                    onClick={() => setQuality(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {page.id === 'spotify' && (
          <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Podcasts e episódios públicos do Spotify são suportados.
          </p>
        )}

        <FoldersPanel activeFolderId={activeFolderId} onSelect={setActiveFolderId} />

        <Button
          type="button"
          size="xl"
          disabled={parsedUrls.length === 0 || isRunning}
          onClick={handleStart}
        >
          {isRunning ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Baixando…
            </>
          ) : (
            <>
              <Download className="size-4" aria-hidden />
              Baixar{parsedUrls.length > 0 ? ` (${parsedUrls.length})` : ''}
            </>
          )}
        </Button>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5 px-3 py-1 normal-case">
          <span className="font-semibold tabular-nums">{items.length}</span>
          <span className="text-muted-foreground">Fila</span>
        </Badge>
        {doneItems.length > 0 && (
          <Badge variant="done" className="gap-1.5 px-3 py-1 normal-case">
            <span className="font-semibold tabular-nums">{doneItems.length}</span>
            Prontos
          </Badge>
        )}
        <Badge variant="outline" className="gap-1.5 px-3 py-1 normal-case">
          <span className="font-semibold tabular-nums">{files.length}</span>
          <span className="text-muted-foreground">Salvos</span>
        </Badge>
        {activeFolder && (
          <Badge variant="outline" className="gap-1.5 normal-case">
            <span className={cn('size-2 rounded-full', folderDotClass(activeFolder.color))} />
            {activeFolder.name}
          </Badge>
        )}
        <span className="hidden text-xs text-muted-foreground sm:inline">
          em <code className="rounded bg-muted px-1.5 py-0.5 font-mono">downloads/{page.id}/</code>
        </span>
        {activeTab === 'files' && files.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {deleteMode && (
              <Badge variant="error" className="normal-case">
                Modo exclusão
              </Badge>
            )}
            {selectionMode && (
              <Badge variant="processing" className="normal-case">
                Modo seleção
              </Badge>
            )}
            {!selectionMode && !deleteMode && (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={enterSelectionMode}>
                  <MousePointerClick className="size-4" aria-hidden />
                  Selecionar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-destructive hover:border-destructive/30 hover:bg-destructive/10"
                  onClick={toggleDeleteMode}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Excluir itens
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={downloadAll}>
                  <FolderDown className="size-4" aria-hidden />
                  Baixar tudo ({files.length})
                </Button>
              </>
            )}
            {deleteMode && (
              <Button type="button" variant="destructive" size="sm" onClick={toggleDeleteMode}>
                <X className="size-4" aria-hidden />
                Sair da exclusão
              </Button>
            )}
            {selectionMode && (
              <Button type="button" variant="secondary" size="sm" onClick={cancelSelectionMode}>
                <X className="size-4" aria-hidden />
                Cancelar seleção
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator className="mb-8" />

      <p className="section-label">Fila de downloads</p>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'queue' | 'files')}>
        <TabsList className="mb-6">
          <TabsTrigger value="queue" className="gap-2">
            Fila atual
            {activeItems.length > 0 && (
              <Badge variant="processing" className="ml-1 h-5 min-w-5 px-1.5 normal-case tabular-nums">
                {activeItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            Arquivos salvos
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 normal-case tabular-nums">
                {files.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {items.length === 0 ? (
            <EmptyState
              icon={Download}
              title="Nenhum download em curso"
              description="Cole links acima e clique em Baixar para adicionar à fila."
            />
          ) : (
            items.map(item => <QueueCard key={item.url} item={item} platform={page.id} />)
          )}
        </TabsContent>

        <TabsContent value="files" className={cn('space-y-3', selectionMode && 'pb-28')}>
          {files.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="Nenhum arquivo ainda"
              description="Os downloads concluídos aparecerão aqui para você baixar novamente."
            />
          ) : (
            files.map(file => (
              <FileCard
                key={file.filename}
                file={file}
                platform={page.id}
                folderName={activeFolder?.name}
                folderColor={activeFolder?.color}
                selectionMode={selectionMode}
                deleteMode={deleteMode}
                selected={selectedFilenames.includes(file.filename)}
                onToggleSelect={() => toggleFileSelection(file.filename)}
                onDelete={() => handleDeleteFile(file.filename)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectionMode && activeTab === 'files' && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 shadow-lg backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium tabular-nums">
              {selectedFilenames.length} arquivo(s) selecionado(s)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={selectAllFiles}>
                Selecionar todos
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={selectedFilenames.length === 0}
                onClick={downloadSelected}
              >
                <Download className="size-4" aria-hidden />
                Baixar selecionados
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectedFilenames.length === 0}
                onClick={deleteSelected}
              >
                <Trash2 className="size-4" aria-hidden />
                Excluir selecionados
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelSelectionMode}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainContent>
  )
}
