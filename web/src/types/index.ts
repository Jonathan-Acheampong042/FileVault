export interface VaultFile {
  id: string | null
  name: string
  folder: string | null
  url: string
  date: string // created_at
  updatedAt: string | null
  expiresAt: string | null
  description: string | null
  fileSize: number | null
  downloadCount: number
}

export type ViewType = 'grid' | 'list'
export type SortType = 'newest' | 'oldest' | 'name'
export type TypeFilter = 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'img' | null

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  emailVerified: boolean
  role?: string
}

export interface ThemeSettings {
  theme: 'dark' | 'light'
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  accent: { color: string; light: string; border: string }
  compactView: boolean
}

// ── Phase 2: engagement features ──────────────────────────────────────────

/** Per-file rating (👍 like) state as seen by the current anonymous/user key. */
export interface RatingState {
  count: number
  mine: boolean
}

/** Per-emoji reaction state for a single file. Keyed by emoji string, e.g. "🔥". */
export type ReactionMap = Record<string, { count: number; mine: boolean }>

export interface FileComment {
  id: string
  fileId: string
  fileName: string | null
  userKey: string
  userId: string | null
  body: string
  createdAt: string
  updatedAt: string | null
}

export const REACTION_EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Popular', emojis: ['👍', '❤️', '🔥', '😮', '🤔', '💡', '📚', '✅'] },
  { label: 'Feelings', emojis: ['😂', '😍', '🥰', '😎', '🤩', '😭', '😤', '🥹'] },
  { label: 'Study', emojis: ['📖', '📝', '🧠', '🔬', '📐', '🏆', '🎯', '📊'] },
]

// ── Phase 3: bookmarks, offline pins, recently viewed, reading progress ───

export interface BookmarkEntry {
  url: string
  name: string
  folder: string | null
  ts: number
}

export interface PinnedFileMeta {
  url: string
  name: string
  folder: string | null
  size: number
  pinnedAt: number
}

export interface RecentlyViewedEntry {
  url: string
  name: string
  folder: string | null
  viewedAt: number
}

// ── Phase 4: notifications, push, realtime toasts ──────────────────────────

export type NotificationType =
  | 'request_approved'
  | 'request_dismissed'
  | 'file_expiring'
  | 'announcement'
  | 'new_file'

export interface AppNotification {
  id: string
  userId: string | null
  type: NotificationType | string
  title: string
  body: string | null
  createdAt: string
  read: boolean
  linkUrl: string | null
}


