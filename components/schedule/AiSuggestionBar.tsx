'use client'

import { Sparkles, Check, X } from 'lucide-react'

interface Props {
  count: number
  accepting: boolean
  onAcceptAll: () => void
  onDismiss: () => void
}

export function AiSuggestionBar({ count, accepting, onAcceptAll, onDismiss }: Props) {
  if (count === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 bg-[#d4a017]/10 border border-[#d4a017]/40 rounded-xl">
      <div className="flex items-center gap-2 text-sm font-medium text-[#8a6a0a]">
        <Sparkles className="h-4 w-4 text-[#d4a017]" />
        <span><strong>{count}</strong> AI javaslat vár elfogadásra</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onAcceptAll}
          disabled={accepting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4a017] text-white text-sm font-medium rounded-lg hover:bg-[#b8891a] transition-colors disabled:opacity-50"
        >
          {accepting ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Elfogadom az összeset
        </button>
        <button
          onClick={onDismiss}
          disabled={accepting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Elvetem
        </button>
      </div>
    </div>
  )
}
