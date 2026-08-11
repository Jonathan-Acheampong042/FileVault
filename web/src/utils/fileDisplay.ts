export function getFileIcon(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.endsWith('.pdf')) return 'picture_as_pdf'
  if (n.endsWith('.docx')) return 'description'
  if (n.endsWith('.xlsx')) return 'table_chart'
  if (n.endsWith('.pptx')) return 'slideshow'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png')) return 'image'
  if (n.endsWith('.zip')) return 'folder_zip'
  return 'description'
}

export function getFileColorClasses(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.endsWith('.pdf')) return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (n.endsWith('.docx')) return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  if (n.endsWith('.xlsx')) return 'text-green-400 bg-green-400/10 border-green-400/20'
  if (n.endsWith('.pptx')) return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png'))
    return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
  return 'text-primary bg-primary/10 border-primary/20'
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function isNewFile(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
}
