import { useState } from 'react'
import { FolderOpen, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFolders } from '@/hooks/useFolders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const FOLDER_COLORS = [
  { id: 'violet', dot: 'bg-violet-500' },
  { id: 'pink', dot: 'bg-pink-500' },
  { id: 'blue', dot: 'bg-blue-500' },
  { id: 'green', dot: 'bg-green-500' },
  { id: 'orange', dot: 'bg-orange-500' },
  { id: 'cyan', dot: 'bg-cyan-500' },
]

export function folderDotClass(color: string) {
  return FOLDER_COLORS.find(c => c.id === color)?.dot ?? 'bg-violet-500'
}

interface Props {
  activeFolderId: string | null
  onSelect: (id: string | null) => void
}

export function FoldersPanel({ activeFolderId, onSelect }: Props) {
  const { folders, create, rename, remove } = useFolders()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('violet')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function handleCreate() {
    if (!newName.trim()) return
    await create.mutateAsync({ name: newName.trim(), color: newColor })
    setNewName('')
    setCreating(false)
  }

  async function handleRename(id: string) {
    if (!editName.trim()) {
      setEditingId(null)
      return
    }
    await rename.mutateAsync({ id, name: editName.trim() })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id)
    if (activeFolderId === id) onSelect(null)
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 font-mono text-xs tracking-wide uppercase">
          <FolderOpen className="size-3.5" aria-hidden />
          Pastas
        </Label>
        <Button
          type="button"
          variant={creating ? 'default' : 'secondary'}
          size="icon"
          className="size-8"
          onClick={() => setCreating(v => !v)}
          aria-label={creating ? 'Cancelar nova pasta' : 'Nova pasta'}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {creating && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <Input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nome da pasta…"
            className="h-9"
          />
          <div className="flex gap-2">
            {FOLDER_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setNewColor(c.id)}
                className={cn(
                  'size-4 rounded-full ring-2 ring-offset-2 ring-offset-card',
                  c.dot,
                  newColor === c.id ? 'ring-foreground/30' : 'ring-transparent'
                )}
                aria-label={`Cor ${c.id}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" onClick={handleCreate}>
              Criar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant={!activeFolderId ? 'default' : 'ghost'}
        className="w-full justify-start gap-2"
        onClick={() => onSelect(null)}
      >
        <LayoutGrid className="size-4" aria-hidden />
        Todas
      </Button>

      {folders.map(folder => (
        <div key={folder.id} className="group flex items-center gap-1">
          {editingId === folder.id ? (
            <Input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename(folder.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              onBlur={() => handleRename(folder.id)}
              className="h-8 text-xs"
            />
          ) : (
            <Button
              type="button"
              variant={activeFolderId === folder.id ? 'secondary' : 'ghost'}
              className="flex-1 justify-start gap-2"
              onClick={() => onSelect(folder.id)}
            >
              <span className={cn('size-2 shrink-0 rounded-full', folderDotClass(folder.color))} />
              <span className="truncate">{folder.name}</span>
            </Button>
          )}
          {editingId !== folder.id && (
            <div className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  setEditingId(folder.id)
                  setEditName(folder.name)
                }}
                aria-label="Renomear pasta"
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                onClick={() => handleDelete(folder.id)}
                aria-label="Excluir pasta"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {folders.length === 0 && !creating && (
        <p className="py-2 text-center text-xs text-muted-foreground">Nenhuma pasta criada</p>
      )}
    </div>
  )
}
