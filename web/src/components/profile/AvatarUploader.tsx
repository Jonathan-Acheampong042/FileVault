import { useRef, useState, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, useEffect } from 'react'

interface Props {
  photoUrl: string | null
  initials: string
  onUpload: (file: Blob) => Promise<void>
}

export default function AvatarUploader({ photoUrl, initials, onUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  
  // Crop state
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string)
      setCropModalOpen(true)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
    e.target.value = '' // Reset
  }

  // --- Drag logic ---
  function onDragStart(clientX: number, clientY: number) {
    setIsDragging(true)
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y })
  }

  function onDragMove(clientX: number, clientY: number) {
    if (!isDragging) return
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y })
    updatePreview()
  }

  function onDragEnd() {
    setIsDragging(false)
  }

  // Mouse
  function handleMouseDown(e: ReactMouseEvent) { onDragStart(e.clientX, e.clientY) }
  function handleMouseMove(e: ReactMouseEvent) { onDragMove(e.clientX, e.clientY) }
  function handleMouseUp() { onDragEnd() }
  function handleMouseLeave() { onDragEnd() }

  // Touch
  function handleTouchStart(e: ReactTouchEvent) { onDragStart(e.touches[0].clientX, e.touches[0].clientY) }
  function handleTouchMove(e: ReactTouchEvent) { onDragMove(e.touches[0].clientX, e.touches[0].clientY) }
  function handleTouchEnd() { onDragEnd() }

  useEffect(() => {
    updatePreview()
  }, [zoom, offset, imageSrc])

  function updatePreview() {
    if (!imgRef.current || !previewCanvasRef.current || !containerRef.current || !imageSrc) return
    const img = imgRef.current
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // We assume a 300x300 container with a 50px inset, meaning the crop circle is 200x200
    const cropSize = 200
    const inset = 50
    
    // Calculate real image scale relative to container
    const scale = zoom
    const w = img.naturalWidth
    const h = img.naturalHeight
    const ratio = Math.max(cropSize / w, cropSize / h)
    const renderW = w * ratio * scale
    const renderH = h * ratio * scale
    
    // Calculate source rect
    const sx = (-offset.x + inset) / (renderW / w)
    const sy = (-offset.y + inset) / (renderH / h)
    const sWidth = cropSize / (renderW / w)
    const sHeight = cropSize / (renderH / h)

    ctx.clearRect(0, 0, 56, 56)
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 56, 56)
  }

  async function applyCrop() {
    if (!imgRef.current || !containerRef.current) return
    
    // Create full resolution canvas
    const cropSize = 400 // Save at 400x400
    const canvas = document.createElement('canvas')
    canvas.width = cropSize
    canvas.height = cropSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = imgRef.current
    const w = img.naturalWidth
    const h = img.naturalHeight
    const ratio = Math.max(200 / w, 200 / h)
    const renderW = w * ratio * zoom
    const renderH = h * ratio * zoom
    
    const sx = (-offset.x + 50) / (renderW / w)
    const sy = (-offset.y + 50) / (renderH / h)
    const sWidth = 200 / (renderW / w)
    const sHeight = 200 / (renderH / h)

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cropSize, cropSize)
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        await onUpload(blob)
        setCropModalOpen(false)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <>
      <div 
        className="group relative mx-auto mb-3.5 h-[84px] w-[84px] cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        title="Change profile photo"
      >
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-white/10 text-[28px] font-extrabold text-white"
          style={
            photoUrl
              ? { background: 'transparent', border: 'none' }
              : { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }
          }
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={initials}
              className="h-[84px] w-[84px] rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="material-symbols-outlined text-[18px] text-white">photo_camera</span>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/98 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
            <div className="w-full">
              <h3 className="text-base font-extrabold text-slate-100">Crop Profile Photo</h3>
              <p className="-mt-1 text-xs text-slate-500">Drag to reposition · use the slider to zoom</p>
            </div>
            
            <div 
              ref={containerRef}
              className="relative h-[300px] w-[300px] cursor-grab overflow-hidden rounded-2xl bg-slate-900 active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt=""
                draggable="false"
                className="absolute origin-top-left pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  minWidth: '200px',
                  minHeight: '200px'
                }}
                onLoad={updatePreview}
              />
              <div 
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55))',
                  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 100px, black 101px)',
                  maskImage: 'radial-gradient(circle at 50% 50%, transparent 100px, black 101px)'
                }}
              />
              <div className="pointer-events-none absolute left-[50px] top-[50px] h-[200px] w-[200px] rounded-full border-2 border-white/70" />
            </div>

            <div className="flex w-full items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-slate-500">zoom_out</span>
              <input
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="material-symbols-outlined text-[18px] text-slate-500">zoom_in</span>
            </div>

            <div className="flex w-full items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/15 bg-black">
                <canvas ref={previewCanvasRef} width={56} height={56} className="h-full w-full" />
              </div>
              <span className="text-xs text-slate-500">Circle preview</span>
            </div>

            <div className="flex w-full gap-2.5 mt-2">
              <button
                onClick={() => setCropModalOpen(false)}
                className="flex-1 rounded-[13px] border border-white/10 bg-white/5 p-3 text-[13px] font-bold text-slate-400 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={applyCrop}
                className="flex-1 rounded-[13px] bg-gradient-to-br from-blue-500 to-violet-500 p-3 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
