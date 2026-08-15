import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { logAudit } from '../../utils/audit'

interface UploadTemplate {
  id: string
  name: string
  folder: string
  description: string
}

export default function ManagerUploadPanel() {
  const showToast = useToast()
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Form Fields
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [description, setDescription] = useState('')
  const [expiryDays, setExpiryDays] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  
  // Folders Selection
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState('') // "" represents Root
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Upload templates state
  const [templates, setTemplates] = useState<UploadTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  // Upload Progress
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [uploadPercent, setUploadPercent] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFolders()
    loadTemplates()
  }, [])

  async function loadFolders() {
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('folder_name')
        .not('folder_name', 'is', null)
        .order('folder_name')
        .limit(1000)

      if (!error && data) {
        const seen = new Set<string>()
        data.forEach((row: any) => {
          const name = (row.folder_name || '').trim()
          if (name && name !== 'Root') seen.add(name)
        })
        setFolders(Array.from(seen))
      }
    } catch (e) {
      console.error(e)
    }
  }

  function loadTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem('fv_upload_templates') || '[]')
      setTemplates(Array.isArray(stored) ? stored : [])
    } catch {
      setTemplates([])
    }
  }

  function saveCurrentAsTemplate() {
    const folderToSave = showNewFolderInput ? newFolderName.trim() : selectedFolder
    if (!folderToSave && !description.trim()) {
      showToast('Please enter a folder or description to save as a template.', 'warning')
      return
    }
    const name = prompt('Enter a name for this template:')
    if (!name || !name.trim()) return

    const newTpl: UploadTemplate = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      folder: folderToSave,
      description: description.trim()
    }

    const updated = [newTpl, ...templates]
    setTemplates(updated)
    localStorage.setItem('fv_upload_templates', JSON.stringify(updated))
    showToast(`Template "${name}" saved!`, 'success')
  }

  function applyTemplate(tpl: UploadTemplate) {
    if (tpl.folder) {
      if (folders.includes(tpl.folder) || tpl.folder === '') {
        setSelectedFolder(tpl.folder)
        setShowNewFolderInput(false)
      } else {
        setShowNewFolderInput(true)
        setNewFolderName(tpl.folder)
      }
    } else {
      setSelectedFolder('')
      setShowNewFolderInput(false)
    }
    setDescription(tpl.description || '')
    showToast(`Template "${tpl.name}" applied.`, 'success')
  }

  function deleteTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem('fv_upload_templates', JSON.stringify(updated))
    showToast('Template deleted.', 'info')
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function checkDuplicate(fileName: string, folderName: string, fileSize: number): Promise<'skip' | 'replace' | 'keep' | 'ask'> {
    try {
      const { data, error } = await supabase
        .from('files_list')
        .select('id, file_size')
        .eq('file_name', fileName)
        .eq('folder_name', folderName || 'Root')
        .maybeSingle()

      if (error || !data) return 'keep'

      const choice = window.confirm(`File "${fileName}" already exists in folder "${folderName || 'Root'}".\n\nClick OK to REPLACE the existing file.\nClick CANCEL to create a UNIQUE copy (rename).`)
      return choice ? 'replace' : 'keep'
    } catch {
      return 'keep'
    }
  }

  async function autoSummariseFile(dbId: string, fileName: string, folder: string) {
    try {
      const session = (await supabase.auth.getSession()).data.session
      const apiHost = import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com'
      
      const res = await fetch(`${apiHost}/api/summarise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          fileName,
          folder,
          fileType: fileName.split('.').pop()
        })
      })

      if (!res.ok) return
      const { summary } = await res.json()
      if (!summary) return

      await supabase.from('files_list').update({ description: summary }).eq('id', dbId)
      showToast(`🤖 AI summary generated for "${fileName}"`, 'success')
    } catch (e: any) {
      console.warn('AI summary failed (non-critical):', e.message)
    }
  }

  async function triggerPushNotification(count: number, folder: string) {
    try {
      const session = (await supabase.auth.getSession()).data.session
      const apiHost = import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com'
      
      await fetch(`${apiHost}/api/push/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: '📁 New files in the Vault!',
          body: `${count} new file${count > 1 ? 's' : ''} uploaded${folder ? ` to ${folder}` : ''}. Tap to view.`,
          url: folder ? `/?folder=${encodeURIComponent(folder)}` : '/'
        })
      })
    } catch (e: any) {
      console.warn('Push notification trigger failed:', e.message)
    }
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      showToast('Please select at least one file to upload.', 'warning')
      return
    }

    setLoading(true)
    let successCount = 0
    let errorCount = 0
    const MAX_BYTES = 50 * 1024 * 1024 // 50 MB limit
    const finalFolder = showNewFolderInput ? newFolderName.trim() : selectedFolder
    const resolvedFolder = finalFolder || 'Root'

    // Wake up Render server (fire-and-forget)
    const wakeHost = import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com'
    fetch(`${wakeHost}/health`).catch(() => {})

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      
      if (file.size > MAX_BYTES) {
        showToast(`Skipping ${file.name} (exceeds 50MB limit)`, 'error')
        errorCount++
        continue
      }

      setUploadingFile(file.name)
      setUploadPercent(0)

      let finalName = file.name
      const dupAction = await checkDuplicate(file.name, finalFolder, file.size)

      if (dupAction === 'skip') {
        errorCount++
        continue
      }

      if (dupAction === 'keep') {
        const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
        const base = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name
        finalName = `${base}_${Date.now()}${ext}`
      }

      const path = finalFolder ? `${finalFolder}/${finalName}` : finalName

      try {
        // Step 1: Upload file to storage with progress bar
        const { error: uploadError } = await supabase.storage
          .from('vault-files')
          .upload(path, file, {
            upsert: true,
            cacheControl: '3600',
            contentType: file.type || 'application/octet-stream'
          })

        if (uploadError) throw uploadError

        // Step 2: Get public URL
        const { data: urlData } = supabase.storage.from('vault-files').getPublicUrl(path)

        // Step 3: Delete duplicate entry if choice was replace
        if (dupAction === 'replace') {
          await supabase.from('files_list')
            .delete()
            .eq('file_name', file.name)
            .eq('folder_name', resolvedFolder)
        }

        // Step 4: Insert DB record
        const insertData: any = {
          file_name: finalName,
          download_url: urlData.publicUrl,
          folder_name: resolvedFolder,
          file_size: file.size,
          download_count: 0
        }

        if (description.trim()) insertData.description = description.trim()
        if (expiryDays) {
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays))
          insertData.expires_at = expiresAt.toISOString()
        }
        if (scheduleAt) {
          insertData.scheduled_at = new Date(scheduleAt).toISOString()
        }

        const { data: insertedRows, error: dbError } = await supabase
          .from('files_list')
          .insert(insertData)
          .select('id')

        if (dbError) throw dbError

        successCount++
        showToast(`Uploaded "${finalName}" successfully!`, 'success')

        // Log Audit Action
        logAudit('upload', finalName, finalFolder || null, {
          size: file.size,
          scheduled: !!scheduleAt
        })

        // Silently trigger AI summary if description is empty
        const insertedId = insertedRows?.[0]?.id
        const fileExt = finalName.split('.').pop()?.toLowerCase() || ''
        const textTypes = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'csv']
        if (!description.trim() && textTypes.includes(fileExt) && insertedId) {
          autoSummariseFile(insertedId, finalName, resolvedFolder)
        }

      } catch (err: any) {
        console.error(err)
        showToast(`Failed to upload "${file.name}": ${err.message}`, 'error')
        errorCount++
      }
    }

    // Trigger Web Push Notification if not scheduled
    if (successCount > 0 && !scheduleAt) {
      triggerPushNotification(successCount, finalFolder)
    }

    setUploadingFile(null)
    setLoading(false)
    setSelectedFiles([])
    setDescription('')
    setExpiryDays('')
    setScheduleAt('')
    setNewFolderName('')
    setShowNewFolderInput(false)
    loadFolders()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-2xl bg-white/5">
            <img src="/filevault-logo.png" alt="FileVault" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-white">Publish New Material</h2>
          <p className="mt-1 text-sm text-slate-500">Upload materials automatically to Storage and Database.</p>
        </div>

        <div className="space-y-4">
          
          {/* Templates Panel */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Upload Templates
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTemplates(p => !p)}
                  className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-2.5 py-1 text-xs font-bold text-purple-400 hover:bg-purple-500/10 transition-colors"
                >
                  {showTemplates ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={saveCurrentAsTemplate}
                  className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-2.5 py-1 text-xs font-bold text-purple-400 hover:bg-purple-500/10 transition-colors"
                >
                  Save Current
                </button>
              </div>
            </div>

            {showTemplates && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500">Select a template to pre-fill Folder and Description configs.</p>
                <div className="flex flex-wrap gap-2">
                  {templates.length === 0 ? (
                    <span className="text-[11px] text-slate-600 italic">No templates saved yet.</span>
                  ) : (
                    templates.map(t => (
                      <span
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-all"
                      >
                        {t.name}
                        <span 
                          onClick={(e) => deleteTemplate(t.id, e)}
                          className="material-symbols-outlined text-[13px] hover:text-red-400 transition-colors"
                        >
                          close
                        </span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Folder selection */}
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Course / Folder
            </label>
            <div className="flex gap-2">
              {!showNewFolderInput ? (
                <>
                  <select
                    value={selectedFolder}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewFolderInput(true)
                      } else {
                        setSelectedFolder(e.target.value)
                      }
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                  >
                    <option value="">No folder (Root)</option>
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="__new__" className="text-blue-400 font-bold">+ Create New Folder...</option>
                  </select>
                </>
              ) : (
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    placeholder="New folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setShowNewFolderInput(false)
                      setNewFolderName('')
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Description <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Short note about the materials..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Expiry Days <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="number"
              placeholder="Days until download link expires (e.g., 7)"
              min="1"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          {/* Scheduled Release */}
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Schedule Release <span className="normal-case tracking-normal font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-500/80">
              <span className="material-symbols-outlined text-[12px]">info</span>
              Files will upload immediately but stay invisible to students until this date.
            </p>
          </div>

          {/* Drag and Drop Zone */}
          <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Files to Upload
            </label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
                  : 'border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">upload_file</span>
              <p className="text-sm font-semibold text-slate-300">Drag & Drop files here, or click to browse</p>
              <p className="mt-1 text-xs text-slate-500">Max size 50MB per file</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Selected Files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-white/5 bg-black/10 p-3 max-h-[160px] overflow-y-auto">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                Selected Files ({selectedFiles.length})
              </div>
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                  <span className="truncate max-w-[80%]">📄 {file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {uploadingFile && (
            <div className="space-y-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex justify-between text-xs font-semibold text-blue-300">
                <span className="truncate">Uploading: {uploadingFile}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 animate-pulse" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-blue-500 to-violet-500 p-3.5 text-[15px] font-extrabold text-white transition-all hover:opacity-90 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'refresh' : 'publish'}
            </span>
            {loading ? 'Publishing…' : 'Publish & Broadcast'}
          </button>
        </div>
      </div>
    </div>
  )
}
