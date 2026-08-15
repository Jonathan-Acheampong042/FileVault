import { useRef, useState } from 'react'
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'
import MobileNav from '../components/layout/MobileNav'
import FolderGrid from '../components/vault/FolderGrid'
import TypeFilterPills from '../components/vault/TypeFilterPills'
import FileControls from '../components/vault/FileControls'
import FileGrid from '../components/vault/FileGrid'
import BulkBar from '../components/vault/BulkBar'
import PreviewModal from '../components/vault/PreviewModal'
import FileChipStrip from '../components/vault/FileChipStrip'
import PinnedFilesSection from '../components/vault/PinnedFilesSection'
import NotificationsDrawer from '../components/layout/NotificationsDrawer'
import { useFiles } from '../hooks/useFiles'
import { useFilteredFiles, useFolders } from '../hooks/useFilteredFiles'
import { useRatings } from '../hooks/useRatings'
import { useViewCounts } from '../hooks/useViewCounts'
import { useBookmarks } from '../hooks/useBookmarks'
import { useOfflinePins, useOnlineStatus } from '../hooks/useOfflinePins'
import { useRecentlyViewed, useSuggestedFiles } from '../hooks/useRecentlyViewed'
import { useNotifications } from '../hooks/useNotifications'
import { useServiceWorker } from '../hooks/useServiceWorker'
import { useRealtimeToasts } from '../hooks/useRealtimeToasts'
import AnnouncementBanner from '../components/layout/AnnouncementBanner'
import type { AppNotification, SortType, TypeFilter, VaultFile, ViewType } from '../types'

function fileKey(file: VaultFile): string {
  return file.id ?? file.url
}

export default function VaultPage() {
  const { files, loading, error } = useFiles()
  const folders = useFolders(files)

  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null)
  const [sort, setSort] = useState<SortType>('newest')
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const visibleFiles = useFilteredFiles({ files, folder: activeFolder, search, typeFilter, sort })
  const visibleFileIds = visibleFiles.map((f) => f.id).filter((id): id is string => !!id)
  const { ratings, toggle: toggleRating } = useRatings(visibleFileIds)
  const viewCounts = useViewCounts(visibleFileIds)

  const { bookmarks, isBookmarked, toggle: toggleBookmark } = useBookmarks()
  const { pins, isPinned, togglePin, clearAllPins, openOffline, totalBytes } = useOfflinePins()
  const isOnline = useOnlineStatus()
  const { entries: recentlyViewed, addView, clear: clearRecentlyViewed } = useRecentlyViewed()
  const suggested = useSuggestedFiles(files, recentlyViewed)

  const { unreadCount } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  useServiceWorker()
  useRealtimeToasts()

  function toggleSelect(file: VaultFile, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      const key = fileKey(file)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const allSelected = visibleFiles.every((f) => prev.has(fileKey(f)))
      if (allSelected) return new Set()
      return new Set(visibleFiles.map(fileKey))
    })
  }

  const selectedFiles = files.filter((f) => selected.has(fileKey(f)))

  function openPreview(file: VaultFile) {
    if (!isOnline && isPinned(file.url)) {
      openOffline(file.url)
      return
    }
    setPreviewFile(file)
  }

  function openByUrl(url: string) {
    const file = files.find((f) => f.url === url)
    if (file) openPreview(file)
  }

  function handleNotificationNav(n: AppNotification) {
    setNotifOpen(false)
    if (n.linkUrl && n.linkUrl.startsWith('http')) {
      window.location.href = n.linkUrl
      return
    }
    // Best-effort: try to match a file mentioned in the notification body/title
    const hinted = files.find((f) => n.body?.includes(f.name) || n.title.includes(f.name))
    if (hinted) openPreview(hinted)
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Sidebar folders={folders} activeFolder={activeFolder} onSelectFolder={setActiveFolder} />

      <div className="flex min-h-screen flex-col overflow-x-hidden lg:ml-64">
        <Header
          search={search}
          onSearchChange={setSearch}
          unreadCount={unreadCount}
          onOpenNotifications={() => setNotifOpen(true)}
        />

        <AnnouncementBanner />

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-24 sm:p-6 lg:p-10 lg:pb-10">
          <h2 className="mb-4 inline-block text-2xl font-extrabold text-white sm:mb-6 sm:text-3xl">FileVault</h2>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              Could not load files: {error}
            </div>
          )}

          <FileChipStrip
            title="Recently Viewed"
            icon="history"
            iconColorClass="text-violet-400"
            items={recentlyViewed}
            onOpen={(item) => openByUrl(item.url)}
            onClear={clearRecentlyViewed}
          />

          <FileChipStrip
            title="Suggested for You"
            icon="auto_awesome"
            iconColorClass="text-purple-400"
            items={suggested}
            onOpen={(item) => openByUrl(item.url)}
          />

          <FileChipStrip
            title="Bookmarks"
            icon="bookmark"
            iconColorClass="text-amber-400"
            items={bookmarks}
            onOpen={(item) => openByUrl(item.url)}
          />

          <PinnedFilesSection
            pins={pins}
            totalBytes={totalBytes}
            onOpen={openOffline}
            onUnpin={(url) => togglePin(url, '', null)}
            onClearAll={clearAllPins}
          />

          <section className="glass-card mb-6 rounded-3xl p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">folder</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">Folders</h3>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <FolderGrid folders={folders} activeFolder={activeFolder} onSelect={setActiveFolder} />
            )}
          </section>

          <TypeFilterPills active={typeFilter} onChange={setTypeFilter} />

          <FileControls
            count={visibleFiles.length}
            activeFolder={activeFolder}
            onClearFolder={() => setActiveFolder(null)}
            viewType={viewType}
            onViewChange={setViewType}
            sort={sort}
            onSortChange={setSort}
            onSelectAll={selectAllVisible}
          />

          <BulkBar selected={selectedFiles} onClear={() => setSelected(new Set())} />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="glass-card flex items-center gap-3 rounded-2xl p-4">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <FileGrid
              files={visibleFiles}
              viewType={viewType}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
              onPreview={openPreview}
              searchActive={!!search}
              folderActive={!!activeFolder}
              activeFolderName={activeFolder}
              onClearSearch={() => setSearch('')}
              ratings={ratings}
              onToggleRating={toggleRating}
              viewCounts={viewCounts}
              isPinned={isPinned}
              onTogglePin={(f) => togglePin(f.url, f.name, f.folder)}
            />
          )}
        </main>
      </div>

      <MobileNav
        onSelectAll={() => setActiveFolder(null)}
        onFocusSearch={() => searchInputRef.current?.focus()}
      />

      <NotificationsDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onNotificationNav={handleNotificationNav}
      />

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        isBookmarked={isBookmarked}
        onToggleBookmark={toggleBookmark}
        onViewed={addView}
      />
    </div>
  )
}
