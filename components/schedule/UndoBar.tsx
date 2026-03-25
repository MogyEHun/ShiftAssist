'use client'

import { useEffect } from 'react'
import { Undo2 } from 'lucide-react'

interface Props {
  canUndo: boolean
  onUndo: () => void
  onDismiss: () => void
}

export function UndoBar({ canUndo, onUndo, onDismiss }: Props) {
  // 8 másodperc után automatikusan eltűnik
  useEffect(() => {
    if (!canUndo) return
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [canUndo, onDismiss])

  if (!canUndo) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl">
        <span className="text-sm">Műszak áthelyezve</span>
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#d4a017] hover:text-[#e8b420] transition-colors"
        >
          <Undo2 className="h-4 w-4" />
          Visszavonás
        </button>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none ml-1"
        >
          ×
        </button>
      </div>
    </div>
  )
}
