import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex h-20 w-20 rounded-2xl bg-slate-100 items-center justify-center mb-6">
          <FileQuestion className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-6xl font-bold text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-3">Az oldal nem található</h2>
        <p className="text-slate-500 mb-8">
          A keresett oldal nem létezik, vagy áthelyezésre került.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a5c3a] text-white font-semibold rounded-xl hover:bg-[#154d31] transition-colors"
        >
          Vissza a dashboardra
        </Link>
      </div>
    </div>
  )
}
