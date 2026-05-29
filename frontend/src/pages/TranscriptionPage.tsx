import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ChevronDown, Clock, Copy, FileJson, Loader2, Mic, Play, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteTranscriptionResult, fetchTranscriptionResults } from '@/api/client'
import type { TranscriptionItem } from '@/types'
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

const MODELS = ['tiny', 'base', 'small', 'medium', 'large'] as const
type Model = (typeof MODELS)[number]

const MODEL_HINTS: Record<Model, string> = {
  tiny: '~75 MB — Rápido, menos preciso',
  base: '~142 MB — Básico, rápido',
  small: '~483 MB — Recomendado',
  medium: '~1.5 GB — Alta qualidade',
  large: '~3 GB — Máxima qualidade',
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    return u.pathname.split('/').filter(Boolean).slice(0, 2).join('/')
  } catch {
    return url.slice(0, 45)
  }
}

function ResultCard({
  item,
  expanded,
  onToggle,
  folderName,
  folderColor,
  deleteMode,
  onDelete,
}: {
  item: TranscriptionItem
  expanded: boolean
  onToggle: () => void
  folderName?: string
  folderColor?: string
  deleteMode: boolean
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isProcessing = ['queued', 'downloading', 'transcribing'].includes(item.status)

  function copy() {
    if (!item.text) return
    navigator.clipboard.writeText(item.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <article className="card-queue relative isolate flex w-full flex-col !items-stretch">
      {deleteMode && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-3 right-3 z-10 size-8 shrink-0 border-destructive/40 bg-destructive/10 hover:bg-destructive/20"
          aria-label={`Excluir transcrição de ${item.title || item.url}`}
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      )}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full min-w-0 shrink-0 items-start gap-4 text-left',
          deleteMode && 'pr-12'
        )}
      >
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {item.status === 'done' && <Check className="size-5 text-verde-folha" aria-hidden />}
          {item.status === 'error' && <span className="text-destructive" aria-hidden>×</span>}
          {isProcessing && <Loader2 className="size-5 animate-spin text-lilas-pop" aria-hidden />}
          {item.status === 'queued' && <span className="size-2 rounded-full bg-border" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{item.title || shortUrl(item.url)}</span>
            <PlatformBadge platform="transcribe" />
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{item.url}</p>
          {item.created_at && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {folderName && folderColor && (
            <Badge variant="outline" className="gap-1 normal-case">
              <span className={cn('size-1.5 rounded-full', folderDotClass(folderColor))} />
              {folderName}
            </Badge>
          )}
          {item.language && (
            <Badge variant="secondary" className="normal-case">
              {item.language}
            </Badge>
          )}
          <StatusBadge status={item.status} />
          {item.status === 'done' && (
            <ChevronDown
              className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
          )}
        </div>
      </button>

      {expanded && item.status === 'done' && (
        <div className="flex w-full min-w-0 shrink-0 flex-col border-t border-border pt-4">
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 bg-card">
            <span className="font-mono text-xs text-muted-foreground">
              {item.segments?.length ?? 0} segmentos
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check className="size-3.5 text-verde-folha" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar texto'}
            </Button>
          </div>
          <div className="max-h-96 min-h-0 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed">
            {item.text}
          </div>
          {item.segments && item.segments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="eyebrow">Segmentos</p>
              {item.segments.map((s, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {fmtTime(s.start)}
                  </span>
                  <span className="min-w-0">{s.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {item.status === 'error' && item.error && (
        <div className="w-full shrink-0 border-t border-border pt-3">
          <p className="break-all text-sm text-destructive">{item.error}</p>
        </div>
      )}
    </article>
  )
}

export function TranscriptionPage() {
  const [linksText, setLinksText] = useState('')
  const [model, setModel] = useState<Model>('small')
  const [items, setItems] = useState<TranscriptionItem[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'results'>('results')
  const [deleteMode, setDeleteMode] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const queryClient = useQueryClient()
  const { folders } = useFolders()

  const { data: saved = [] } = useQuery({
    queryKey: ['transcription-results'],
    queryFn: fetchTranscriptionResults,
  })

  useEffect(() => {
    if (saved.length > 0 && items.length === 0) {
      setItems(saved)
      setActiveTab('results')
    }
  }, [saved, items.length])

  const displayItems = items.filter(i => (activeFolderId ? i.folder_id === activeFolderId : true))
  const parsedUrls = linksText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  const doneItems = displayItems.filter(i => i.status === 'done')
  const errorItems = displayItems.filter(i => i.status === 'error')
  const activeItems = displayItems.filter(i => ['queued', 'downloading', 'transcribing'].includes(i.status))
  const queueItems = displayItems.filter(i => ['queued', 'downloading', 'transcribing'].includes(i.status))
  const resultItems = displayItems.filter(i => i.status === 'done' || i.status === 'error')

  const handleStart = useCallback(async () => {
    if (parsedUrls.length === 0 || isRunning) return
    setIsRunning(true)
    setActiveTab('queue')
    setItems(prev => {
      const existing = new Set(prev.map(i => i.url))
      const fresh = parsedUrls
        .filter(u => !existing.has(u))
        .map(url => ({ url, status: 'queued' as const, folder_id: activeFolderId }))
      return [...(prev.length ? prev : saved), ...fresh]
    })
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: parsedUrls, model, folder_id: activeFolderId }),
      })
      const { job_id } = await res.json()
      const es = new EventSource(`/api/stream/${job_id}`)
      esRef.current = es
      es.onmessage = e => {
        const ev = JSON.parse(e.data)
        if (ev.type === 'loading_model') setLoadingModel(true)
        if (ev.type === 'model_ready') setLoadingModel(false)
        if (ev.type === 'downloading')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'downloading' } : i)))
        if (ev.type === 'transcribing')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'transcribing' } : i)))
        if (ev.type === 'done')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'done', ...ev.result } : i)))
        if (ev.type === 'error')
          setItems(p => p.map(i => (i.url === ev.url ? { ...i, status: 'error', error: ev.error } : i)))
        if (ev.type === 'finished') {
          setIsRunning(false)
          setLoadingModel(false)
          es.close()
          setLinksText('')
          setActiveTab('results')
        }
      }
      es.onerror = () => {
        setIsRunning(false)
        setLoadingModel(false)
        es.close()
      }
    } catch {
      setIsRunning(false)
      setLoadingModel(false)
    }
  }, [parsedUrls, model, activeFolderId, isRunning, saved])

  async function handleReset() {
    if (!confirm('Apagar todas as transcrições? Esta ação não pode ser desfeita.')) return
    await fetch('/api/results', { method: 'DELETE' })
    setItems([])
  }

  function exportJson() {
    const data: Record<string, unknown> = {}
    doneItems.forEach(i => {
      data[i.url] = { text: i.text, language: i.language, title: i.title, segments: i.segments }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'transcricoes.json'
    a.click()
  }

  function toggleDeleteMode() {
    setDeleteMode(prev => !prev)
  }

  async function handleDeleteResult(url: string) {
    const label = items.find(i => i.url === url)?.title || url
    if (!confirm(`Excluir a transcrição "${label}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteTranscriptionResult(url)
      setItems(prev => prev.filter(i => i.url !== url))
      if (expandedUrl === url) setExpandedUrl(null)
      queryClient.invalidateQueries({ queryKey: ['transcription-results'] })
    } catch {
      alert('Não foi possível excluir a transcrição.')
    }
  }

  const activeFolder = folders.find(f => f.id === activeFolderId)

  return (
    <MainContent>
      <PageHeader
        eyebrow="Ferramentas / Transcrição"
        title="Transcrever vídeo"
        description="Cole links de reels ou vídeos. O Whisper transcreve áudio em texto com segmentos e exportação."
      />

      <section className="card-elevated mb-10 space-y-6 p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="transcribe-links">Links</Label>
            {parsedUrls.length > 0 && (
              <Badge variant="transcription" className="tabular-nums">
                {parsedUrls.length}
              </Badge>
            )}
          </div>
          <Textarea
            id="transcribe-links"
            value={linksText}
            onChange={e => setLinksText(e.target.value)}
            placeholder={'Cole os links aqui, um por linha:\n\nhttps://instagram.com/reel/…'}
            rows={6}
            disabled={isRunning}
          />
        </div>

        <div>
          <Label className="mb-3 block font-mono text-xs tracking-wide uppercase">Modelo Whisper</Label>
          <div className="flex flex-wrap gap-2">
            {MODELS.map(m => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={model === m ? 'default' : 'secondary'}
                className="capitalize"
                disabled={isRunning}
                onClick={() => setModel(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{MODEL_HINTS[model]}</p>
        </div>

        <FoldersPanel activeFolderId={activeFolderId} onSelect={setActiveFolderId} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="xl"
            className="w-full sm:w-auto"
            disabled={parsedUrls.length === 0 || isRunning}
            onClick={handleStart}
          >
            {isRunning ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {loadingModel ? 'Carregando modelo…' : 'Processando…'}
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden />
                Transcrever{parsedUrls.length > 0 ? ` (${parsedUrls.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1 normal-case">
            <span className="font-semibold tabular-nums">{items.length}</span>
            <span className="text-muted-foreground">Total</span>
          </Badge>
          {doneItems.length > 0 && (
            <Badge variant="done" className="gap-1.5 px-3 py-1 normal-case">
              <span className="font-semibold tabular-nums">{doneItems.length}</span>
              Prontos
            </Badge>
          )}
          {errorItems.length > 0 && (
            <Badge variant="error" className="gap-1.5 px-3 py-1 normal-case">
              <span className="font-semibold tabular-nums">{errorItems.length}</span>
              Erros
            </Badge>
          )}
          {activeFolder && (
            <Badge variant="outline" className="gap-1.5 normal-case">
              <span className={cn('size-2 rounded-full', folderDotClass(activeFolder.color))} />
              {activeFolder.name}
            </Badge>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {activeTab === 'results' && resultItems.length > 0 && (
            <>
              {deleteMode && (
                <Badge variant="error" className="normal-case">
                  Modo exclusão
                </Badge>
              )}
              <Button
                type="button"
                variant={deleteMode ? 'destructive' : 'secondary'}
                size="sm"
                className={cn(
                  !deleteMode &&
                    'text-destructive hover:border-destructive/30 hover:bg-destructive/10'
                )}
                onClick={() => {
                  setActiveTab('results')
                  toggleDeleteMode()
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                {deleteMode ? 'Sair da exclusão' : 'Excluir itens'}
              </Button>
            </>
          )}
          {doneItems.length > 0 && (
            <Button type="button" variant="secondary" size="sm" onClick={exportJson}>
              <FileJson className="size-4" aria-hidden />
              Exportar JSON
            </Button>
          )}
          {items.length > 0 && (
            <Button type="button" variant="destructive" size="sm" onClick={handleReset}>
              <Trash2 className="size-4" aria-hidden />
              Limpar tudo
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      <p className="section-label">Fila e resultados</p>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'queue' | 'results')}>
        <TabsList className="mb-6">
          <TabsTrigger value="queue" className="gap-2">
            Processando
            {activeItems.length > 0 && (
              <Badge variant="processing" className="ml-1 h-5 min-w-5 px-1.5 normal-case tabular-nums">
                {activeItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            Resultados
            {doneItems.length + errorItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 normal-case tabular-nums">
                {doneItems.length + errorItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {queueItems.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nada sendo processado"
              description="Cole links acima e clique em Transcrever para iniciar."
            />
          ) : (
            queueItems.map(item => {
              const folder = folders.find(f => f.id === item.folder_id)
              return (
                <ResultCard
                  key={item.url}
                  item={item}
                  expanded={expandedUrl === item.url}
                  onToggle={() => setExpandedUrl(p => (p === item.url ? null : item.url))}
                  folderName={folder?.name}
                  folderColor={folder?.color}
                  deleteMode={false}
                  onDelete={() => handleDeleteResult(item.url)}
                />
              )
            })
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          {resultItems.length === 0 ? (
            <EmptyState
              icon={Mic}
              title="Sem transcrições ainda"
              description="Os resultados aparecerão aqui assim que o processamento terminar."
            />
          ) : (
            resultItems.map(item => {
              const folder = folders.find(f => f.id === item.folder_id)
              return (
                <ResultCard
                  key={item.url}
                  item={item}
                  expanded={expandedUrl === item.url}
                  onToggle={() => setExpandedUrl(p => (p === item.url ? null : item.url))}
                  folderName={folder?.name}
                  folderColor={folder?.color}
                  deleteMode={deleteMode}
                  onDelete={() => handleDeleteResult(item.url)}
                />
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </MainContent>
  )
}


