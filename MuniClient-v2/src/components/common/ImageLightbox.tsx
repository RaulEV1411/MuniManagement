import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LightboxImage {
  imagen_ID: string
  url: string
}

export default function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: LightboxImage[]
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, images.length])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/92 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Contador */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium bg-black/40 px-3 py-1 rounded-full pointer-events-none">
        {idx + 1} / {images.length}
      </div>

      {/* Cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <X size={16} />
      </button>

      {/* Prev */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Imagen */}
      <div className="max-w-5xl max-h-[88vh] px-16 w-full" onClick={e => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          <motion.img
            key={images[idx].imagen_ID}
            src={images[idx].url}
            alt=""
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="max-h-[88vh] w-full object-contain rounded-xl shadow-2xl"
          />
        </AnimatePresence>
      </div>

      {/* Next */}
      {idx < images.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-1"
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.imagen_ID}
              onClick={() => setIdx(i)}
              className={cn(
                'w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all',
                i === idx ? 'border-white scale-105' : 'border-white/20 opacity-50 hover:opacity-80',
              )}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
