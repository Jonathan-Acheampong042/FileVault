import { useCallback, useEffect, useState } from 'react'
import { putBlob, getBlob, deleteBlob, clearAllBlobs } from '../utils/indexedDb'
import { useToast } from '../context/ToastContext'
import type { PinnedFileMeta } from '../types'

const META_KEY = 'fvPinnedMeta'

function readMeta(): PinnedFileMeta[] {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '[]')
  } catch {
    return []
  }
}

function writeMeta(list: PinnedFileMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(list))
}

export function useOfflinePins() {
  const showToast = useToast()
  const [pins, setPins] = useState<PinnedFileMeta[]>(readMeta)

  const isPinned = useCallback((url: string) => pins.some((p) => p.url === url), [pins])

  const pinFile = useCallback(
    async (url: string, name: string, folder: string | null) => {
      showToast(`⏳ Pinning ${name}…`, 'info', 15000)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        await putBlob(url, blob)
        const next = [{ url, name, folder, size: blob.size, pinnedAt: Date.now() }, ...pins.filter((p) => p.url !== url)]
        setPins(next)
        writeMeta(next)
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1)
        showToast(`📌 Pinned! ${name} (${sizeMB} MB) available offline.`, 'success')
      } catch (err) {
        showToast(`❌ Could not pin ${name}: ${err instanceof Error ? err.message : 'network error'}`, 'error')
      }
    },
    [pins, showToast]
  )

  const unpinFile = useCallback(
    async (url: string) => {
      await deleteBlob(url)
      const next = pins.filter((p) => p.url !== url)
      setPins(next)
      writeMeta(next)
    },
    [pins]
  )

  const togglePin = useCallback(
    (url: string, name: string, folder: string | null) => {
      if (isPinned(url)) unpinFile(url)
      else pinFile(url, name, folder)
    },
    [isPinned, pinFile, unpinFile]
  )

  const clearAllPins = useCallback(async () => {
    await clearAllBlobs()
    setPins([])
    writeMeta([])
  }, [])

  const openOffline = useCallback(async (url: string) => {
    const blob = await getBlob(url)
    if (!blob) {
      showToast('File not found in offline storage. Try re-pinning it while online.', 'error')
      return
    }
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
  }, [showToast])

  const totalBytes = pins.reduce((s, p) => s + p.size, 0)

  return { pins, isPinned, togglePin, clearAllPins, openOffline, totalBytes }
}

/** Simple online/offline flag — used to route preview through IndexedDB when offline. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
