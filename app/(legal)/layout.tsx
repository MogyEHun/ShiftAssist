import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="h-8 w-8 rounded-lg bg-[#1a5c3a] flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-[#1a5c3a]">ShiftAssist</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-gray-200 px-6 py-6 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Adatvédelmi tájékoztató</Link>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Általános Szerződési Feltételek</Link>
        </div>
        <p>© {new Date().getFullYear()} ShiftAssist. Minden jog fenntartva.</p>
      </footer>
    </div>
  )
}
