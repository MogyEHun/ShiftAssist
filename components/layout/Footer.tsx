import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-6 px-6 text-center text-sm text-gray-400">
      <div className="flex items-center justify-center gap-4 mb-2">
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">
          Adatvédelmi tájékoztató
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-gray-600 transition-colors">
          ÁSZF
        </Link>
        <span>·</span>
        <a href="mailto:support@shiftsync.hu" className="hover:text-gray-600 transition-colors">
          Kapcsolat
        </a>
      </div>
      <p>© {new Date().getFullYear()} ShiftAssist. Minden jog fenntartva.</p>
    </footer>
  )
}
