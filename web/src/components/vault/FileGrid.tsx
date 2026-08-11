import type { VaultFile, ViewType, RatingState } from '../../types'
import FileCard from './FileCard'

interface FileGridProps {
  files: VaultFile[]
  viewType: ViewType
  selectedIds: Set<string>
  onToggleSelect: (file: VaultFile, checked: boolean) => void
  onPreview: (file: VaultFile) => void
  searchActive: boolean
  folderActive: boolean
  activeFolderName: string | null
  onClearSearch: () => void
  ratings?: Record<string, RatingState>
  onToggleRating?: (fileId: string) => void
  viewCounts?: Record<string, number>
  isPinned?: (url: string) => boolean
  onTogglePin?: (file: VaultFile) => void
}

function fileKey(file: VaultFile): string {
  return file.id ?? file.url
}

export default function FileGrid({
  files,
  viewType,
  selectedIds,
  onToggleSelect,
  onPreview,
  searchActive,
  folderActive,
  activeFolderName,
  onClearSearch,
  ratings,
  onToggleRating,
  viewCounts,
  isPinned,
  onTogglePin,
}: FileGridProps) {
  if (!files.length) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center gap-5 py-16">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-radial from-primary/10 to-transparent">
          <span className="material-symbols-outlined text-5xl text-slate-600">
            {searchActive ? 'search_off' : folderActive ? 'folder_off' : 'inventory_2'}
          </span>
        </div>
        <div className="text-center">
          <p className="mb-1.5 text-[15px] font-bold text-slate-200">
            {searchActive
              ? <>No results for &ldquo;<span className="text-primary">search</span>&rdquo;</>
              : folderActive
                ? <>Nothing in <span className="text-primary">{activeFolderName}</span> yet</>
                : 'The vault is empty'}
          </p>
          <p className="text-[13px] leading-relaxed text-slate-500">
            {searchActive ? (
              <>
                Try a different keyword, or{' '}
                <button onClick={onClearSearch} className="font-bold text-primary">
                  clear search
                </button>
                .
              </>
            ) : folderActive ? (
              'Files uploaded to this folder will appear here.'
            ) : (
              'Files uploaded by the manager will appear here.'
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        viewType === 'list'
          ? 'space-y-3 sm:space-y-4'
          : 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3'
      }
    >
      {files.map((file) => (
        <FileCard
          key={fileKey(file)}
          file={file}
          selected={selectedIds.has(fileKey(file))}
          onToggleSelect={onToggleSelect}
          onPreview={onPreview}
          rating={file.id ? ratings?.[file.id] : undefined}
          onToggleRating={onToggleRating}
          viewCount={file.id ? viewCounts?.[file.id] : undefined}
          pinned={isPinned ? isPinned(file.url) : undefined}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  )
}
