import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFolder, deleteFolder, fetchFolders, renameFolder } from '@/api/client'

export function useFolders() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['folders'] })

  const create = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createFolder(name, color),
    onSuccess: invalidate,
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFolder(id, name),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: invalidate,
  })

  return { folders: query.data ?? [], isLoading: query.isLoading, create, rename, remove, refetch: query.refetch }
}
