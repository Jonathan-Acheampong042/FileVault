import { useMemo } from 'react'
import type { SortType, TypeFilter, VaultFile } from '../types'

interface UseFilteredFilesArgs {
  files: VaultFile[]
  folder: string | null
  search: string
  typeFilter: TypeFilter
  sort: SortType
}

function applySort(files: VaultFile[], sort: SortType): VaultFile[] {
  const copy = [...files]
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
}

function matchesType(file: VaultFile, type: TypeFilter): boolean {
  if (!type) return true
  const n = file.name.toLowerCase()
  if (type === 'img') return /\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)
  return n.endsWith(`.${type}`)
}

export function useFilteredFiles({ files, folder, search, typeFilter, sort }: UseFilteredFilesArgs) {
  return useMemo(() => {
    const now = new Date()
    let result = files.filter((f) => !f.expiresAt || new Date(f.expiresAt) > now)

    if (folder) result = result.filter((f) => f.folder === folder)

    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          (!folder && f.folder?.toLowerCase().includes(term)) ||
          f.description?.toLowerCase().includes(term)
      )
    }

    result = result.filter((f) => matchesType(f, typeFilter))

    return applySort(result, sort)
  }, [files, folder, search, typeFilter, sort])
}

export function useFolders(files: VaultFile[]) {
  return useMemo(() => {
    const now = new Date()
    const active = files.filter((f) => !f.expiresAt || new Date(f.expiresAt) > now)
    const names = [...new Set(active.map((f) => f.folder).filter((f): f is string => !!f))].sort()
    return names.map((name) => ({
      name,
      count: active.filter((f) => f.folder === name).length,
    }))
  }, [files])
}
